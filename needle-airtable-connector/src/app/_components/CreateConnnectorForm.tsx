"use client";

import Cookies from 'js-cookie';
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { type Collection } from "@needle-ai/needle-sdk";
import { useSearchParams, useRouter, redirect } from "next/navigation";
import axios from "axios";
import { getCookie } from 'cookies-next';
import { equals} from '~/needle-ui/utils/array-utils';

import { MultiSelect, MultiSelectItem } from '~/needle-ui/components/atoms/MultiSelect';
import { Input } from '~/needle-ui/components/atoms/Input';
import { hoursArr, minutesArr, timezoneArr } from '~/utils/form-utils';
import { Select } from '~/needle-ui/components/atoms/Select';
import { useEffectSkipFirst } from '~/needle-ui/hooks';

export function CreateConnectorForm({
  collections,
}: {
  collections: Collection[];
}) {

  const searchParams = useSearchParams();
  const token: string = searchParams.get('token');
  const refreshToken:string = searchParams.get('refreshToken')

  const [connectorName, setConnectorName] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [collectionId, setCollectionId] = useState();
  // const [collectionId, setCollectionId] = useState(collections[0]!.id);
  const router = useRouter();
  const [url, setUrl] = useState("");

  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [timezone, setTimezone] = useState("");

  // const [refreshToken, setRefreshToken] = useState("");
  const [bases, setBases] = useState([]);
  const [baseId, setBaseId] = useState("")
  const [tableId, setTableId] = useState("")
  const [tables, setTables] = useState([])
  const [isLoading, setIsLoading] = useState(true);

  let items: MultiSelectItem<string>[] = [];
 
  collections.map((collection) => items.push({value: collection.id, key: collection.id, label: collection.name }))
  

  
  const handleChange = (selected: string[]) => {
    if(equals(selected, selectedValues)) {
     return false;
    }
    setSelectedValues(selected);
  };
  
  // setRefreshToken(token.refresh_token)

 

  const { mutate: createWebConnector } = api.connectors.create.useMutation({
    onSuccess: () => {
      router.push("/connectors");
      router.refresh();
    },
  });

  

  const getBases = async () => {
    try {
      const response = await axios.get(`/api/airtable/bases/${token}`);
      console.log("Bases fetch success", response);
      if(response.status == 200) {
        if(response.data.status == 401 ) {
          alert("Login to Airtable again...");
          router.push("/connectors");
          router.refresh();
          return false;
        }
        setBases(response?.data?.bases);
        setBaseId(response?.data?.bases?.[0]?.id);
        await getTables(response?.data?.bases?.[0]?.id);
      } else{
        alert("Unable to fetch bases from Airtable...");
      }
     
    } catch (error: any) {
        console.log("Bases not found", error.message); 
        alert(error.message);
    } 
  }

  const getTables = async (baseID) => {
    try {
      const response = await axios.get(`/api/airtable/tables/${baseID}/${token}`);
      console.log("Table fetch success", response.data);
      setTables(response?.data?.tables);
      setIsLoading(false);
      // setTableId(response?.data?.tables?.[0]?.id)

    } catch (error: any) {
        console.log("Bases not found", error.message); 
        alert(error.message);
    } 
  }

  const handleSubmit = () => {
    setIsLoading(true);
    createWebConnector({ connectorName, hours, minutes, timezone, refreshToken, collectionId, baseId, tables: tables });
  }

  const handleCollectionChange = (data) => {
    setCollectionId(data);
  }

  
  useEffectSkipFirst(()=> {
    getBases();
  },[])

  const handleBaseChange = (baseId) => {
    getTables(baseId);
  }
  
  return (
    <form className="flex flex-col gap-2">
      
      <div className="mt-2 flex flex-col">
        <label>Name</label>
        <span className="mb-1 text-zinc-500">Enter a display name for this connector.</span>
        <Input value={connectorName} onChange={(e) => setConnectorName(e.target.value)} className="rounded-md border border-gray-700 bg-transparent p-2 outline-offset-1 focus:outline-double" />
      </div>
      {/* <div className="mt-2 flex flex-col">
        <label>Collection</label>
        <select
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
          className="rounded-md border border-gray-700 bg-transparent p-2 outline-offset-1 outline-orange-500 focus:outline-double"
        >
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
      </div> */}
      <div className="mt-2 flex flex-col">
        <label>Collection</label>
        <MultiSelect placeholder="Select collections"
        defaultSelectedItems={items}
        items={items} onChange={handleCollectionChange} className="rounded-md border border-gray-700 bg-transparent p-2 outline-offset-1 outline-orange-500 focus:outline-double" ></MultiSelect>
      </div>

      <div className="mt-2 flex flex-col">
        <label>Base</label>
        <select
          value={baseId}
          onChange={(e) => handleBaseChange(e.target.value)}
          className="rounded-md border border-gray-700 bg-transparent p-2 outline-offset-1 outline-orange-500 focus:outline-double"
        >
          {bases?.map((base) => (
            <option key={base.id} value={base.id}>
              {base.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex flex-col">
        <label>Schedule</label>
        <span className="mb-1 text-zinc-500">We will run your connector every day, please pick a time and time zone.</span>
        <div className='flex flex-row gap-2'>
          <div>
            <Select placeholder='Hour' items={hoursArr} onChange={(e)=> setHours(e)} className="rounded-md border border-gray-700 bg-transparent outline-none focus:outline-double" />
          </div>
          <span className='mt-2'>:</span>
          <div>
            <Select placeholder='Minute' items={minutesArr} onChange={(e)=> setMinutes(e)} className="rounded-md border border-gray-700 bg-transparent  outline-none focus:outline-double" />
          </div>
          <span className='mt-2'>in</span>
          <div>
            <Select placeholder='Timezone' items={timezoneArr} onChange={(e)=> setTimezone(e)} className="rounded-md border border-gray-700 bg-transparent outline-none focus:outline-double" />
          </div>
        </div>
        
      </div>
      <button
        type="button"
        disabled= {isLoading}
        onClick={() => handleSubmit()}
        className="ml-auto mt-2 rounded bg-orange-600 px-3 py-1 text-sm font-semibold hover:bg-orange-500"
      >
        Create Connector
      </button>
    </form>
  );
}
