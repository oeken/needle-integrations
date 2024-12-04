import { NextRequest , NextResponse} from "next/server"
import axios from "axios";

import { cookies } from 'next/headers';
import { deleteCookie, getCookie, setCookie, hasCookie, getCookies } from 'cookies-next';

export async function GET(request: NextRequest, context: { params: any }): Promise<NextResponse>{
   try {
        // const searchParams = request.nextUrl.searchParams
        const accessToken = context.params.token;
        // const accessToken = searchParams.get('token');
       
        // let token = await getCookie("token",{cookies});
        // let accessToken = JSON.parse(token)?.access_token
       
        const response = await axios.get(`${process.env.AIRTABLE_API_URL}/meta/bases`,{
            headers: {
                "Authorization": "Bearer " + accessToken,
            }
        });
        console.log(response);
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