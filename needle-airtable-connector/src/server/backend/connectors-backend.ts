import type {
  ConnectorRequest,
  CreateConnectorRequest,
} from "~/models/connectors-models";
import {
  createConnector,
  getConnector,
  listConnectors,
  deleteConnector,
  publishConnectorRun,
  createNeedleFileId,
  type Session,
  type ConnectorRunDescriptor,
} from "@needle-ai/needle-sdk";
import { listTables } from "~/app/api/airtable/tables/[baseID]/[token]/route";

import { db } from "../db";
import { filesTable } from "../db/schema";
import { SQL, inArray, sql, eq } from 'drizzle-orm';
const tableURL = process.env.AIRTABLE_API_URL+`/`;

export async function createWebConnector(
  { connectorName, hours, minutes, timezone, collectionId, baseId, tables, refreshToken }: CreateConnectorRequest,
  session: Session,
) {

  
  const connector = await createConnector(
    {
      name: connectorName,
      cronJob: `${hours} ${minutes} * * *`,
      cronJobTimezone: timezone,
      collectionIds: collectionId,
      credentials: refreshToken,
    },
    session.id,
  );

  const filesToInsert = tables.map((table) => ({
    ndlConnectorId: connector.id,
    tableURL : tableURL + `${baseId}/${table.id}`,
    tableName: table.name,
    baseId,
    tableId : table.id,
  }));
  await db.insert(filesTable).values(filesToInsert);
  
  await runWebConnector({ connectorId: connector.id });

  return connector;
}

export async function listWebConnectors(session: Session) {
  return await listConnectors(session.id);
}

export async function getWebConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await getConnector(connectorId, session.id);

  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));

  return { ...connector, files };
}

export async function deleteWebConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await deleteConnector(connectorId, session.id);
  await db.delete(filesTable).where(eq(filesTable.ndlConnectorId, connectorId));
  return connector;
}

export async function runWebConnector(
  { connectorId }: ConnectorRequest,
  session?: Session,
) {
  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };
  let connector ={};
  // acts as access validation
  if (session) {
     connector =  await getConnector(connectorId, session.id); // this suppose to run without session id
     console.log("Connector: ", connector);
     
  }

  

  try {

    const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));

    if(!files[0]?.baseId) {
      console.log("No files found in DB...");
      return false;
    }

    const baseID = files[0]?.baseId; 

    let liveTables = await listTables(baseID, connector?.credentials);

    if(liveTables.data == undefined) {
      console.log("Session expired! Login again to Airtable.");
      return false;
    }
    
    liveTables = liveTables?.data?.tables || []
    
   
    
    const { createTables, updateTables, deleteTables} = diffTables(baseID, files, liveTables) //liveTables

        

    let isWithoutNdlFileId = false;

    let filesToInsert: {}[] = [];
    isWithoutNdlFileId = createTables.some((table) => table.id && table.ndlFileId == null);

    
    createTables?.map((table) => {
      if(!table.id) {
        filesToInsert.push({
          ndlConnectorId: connectorId,
          ndlFileId: createNeedleFileId(),
          tableURL : tableURL + `${baseID}/${table?.tableId}`,
          tableName: table.tableName,
          baseId: baseID,
          tableId : table.tableId,
        })
      }
    });

    if(filesToInsert.length) {
      await db.insert(filesTable).values(filesToInsert);
      filesToInsert.map((file) => {
        descriptor.create.push({
          id: file.ndlFileId,
          url: file.tableURL,
          type: "text/plain",
        })
      });
    }
    

    if(isWithoutNdlFileId) {
      const sqlChunks: SQL[] = [];
      const ids: number[] = [];
      sqlChunks.push(sql`(case`);
  
      createTables.forEach((table) => {
        
        if(table.id && table.ndlFileId == null) {

          const ndlFileId = createNeedleFileId();
          let existingSavedTable = {
            id: ndlFileId,
            url: table?.tableURL,
            type: "text/plain"
          }
          descriptor.create.push(existingSavedTable);
          sqlChunks.push(sql`when ${filesTable.id} = ${table.id} then ${ndlFileId}`);
          ids.push(table.id);
        }
      })
      sqlChunks.push(sql`end)`);
      
      const finalSql: SQL = sql.join(sqlChunks, sql.raw(' '));
  
      await db.update(filesTable).set({ ndlFileId: finalSql }).where(inArray(filesTable.id, ids));
    }


    updateTables.map((table) => {
      if(table.id) {
        descriptor.update.push({ id: table.ndlFileId })
      }
    });

    deleteTables.map(async (table) => {
      if(table.id) {
        descriptor.delete.push({ id: table.ndlFileId });
        await db.delete(filesTable).where(eq(filesTable.id, table.id));
      }
    });
  
    
    
    await publishConnectorRun(connectorId, descriptor);
    
  } catch (error) {
    console.log(error);
    
  }
  

  
}


function diffTables(baseID, curTables, liveTables) {
  const createTables = [];
  const updateTables = [];
  const deleteTables = [];

  if(!curTables.length && !liveTables.length) {
    return { createTables, updateTables, deleteTables };
  }

  const curTablesMap = new Map(curTables.map(item => [item.tableId, item]));
  const liveTablesMap = new Map(liveTables.map(item => [item.id, item]));

  if(!liveTables.length && curTables.length) {
    // if live tables are empty and current files are present then -> DELETE
    curTables.map((file) => {
      // if(file.ndlFileId !== null) {
      //   deleteTables.push(file)
      // }
      deleteTables.push(file);
    });
  }

  // for already added tables during createConnector phase their ndlFileId is null -> CREATE
  // if(curTables.length && liveTables.length) {
  //   curTables.map((file) => {
  //     if(file.ndlFileId == null) {
  //       createTables.push(file)
  //     }
  //   });
  // }
  for (const liveItem of liveTables) {
      const curItem = curTablesMap.get(liveItem?.id);
      if (!curItem) {
          console.log("Not Found",liveItem );
          
          createTables.push({
            tableId: liveItem.id,
            tableName: liveItem.name
          });
      } else {
          if (curItem.ndlFileId !== null) {
            updateTables.push(curItem);
          } else {
            createTables.push(curItem);
          }
       
      }
  }

  for (const curItem of curTables) {
      if (!liveTablesMap.has(curItem.tableId)) {
          deleteTables.push(curItem);
      }
  }

  return { createTables, updateTables, deleteTables };
}
