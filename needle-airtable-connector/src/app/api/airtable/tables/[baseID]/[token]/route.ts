import { NextRequest , NextResponse} from "next/server"
import axios from "axios";


import { cookies } from 'next/headers';
import { deleteCookie, getCookie, setCookie, hasCookie, getCookies } from 'cookies-next';
import { getNewAccessToken } from "~/app/api/auth/airtable/refreshToken/route";
export async function GET(request: NextRequest, context: { params: any }) { 
    console.log("Inside main baseID")
   try {
        const searchParams = request.nextUrl.searchParams

        // let token = await getCookie("token",{cookies});
        // let accessToken = JSON.parse(token)?.access_token

        const baseID = context.params.baseID
        const accessToken = searchParams.get('token') ?? context.params.token;
        const response = await axios.get(`${process.env.AIRTABLE_API_URL}/meta/bases/${baseID}/tables`,{
            headers: {
                "Authorization": "Bearer " + accessToken,
            }
        });
        console.log(response.data);
        return new NextResponse(JSON.stringify(response.data), {
            headers: {
                "Content-Type": "application/json",
            },
        });
   } catch (error) {
        return new NextResponse(JSON.stringify(error), {
            headers: {
                "Content-Type": "application/json",
            },
        });
   }
}


export async function listTables(baseID: string, refreshToken: string) {
    
   try {
        let newData = await getNewAccessToken(refreshToken);
        console.log("Possibly a bug...", newData);
        
        const response = await axios.get(`${process.env.AIRTABLE_API_URL}/meta/bases/${baseID}/tables`,{
            headers: {
                "Authorization": "Bearer " + newData.data.access_token,
            }
        });
        return response;
   } catch (error) {
        console.log("Inside ListTables API.....", error);
        
        return error;
   }
}