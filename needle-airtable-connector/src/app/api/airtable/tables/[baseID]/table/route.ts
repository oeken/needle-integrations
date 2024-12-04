import { NextRequest , NextResponse} from "next/server"
import axios from "axios";


import { cookies } from 'next/headers';
import { deleteCookie, getCookie, setCookie, hasCookie, getCookies } from 'cookies-next';


export async function GET(request: NextRequest, context: { params: any }) {
    console.log("Inside main baseID tableid")
   try {
        let token = await getCookie("token",{cookies});
        let accessToken = JSON.parse(token)?.access_token
        const baseID = context.params.baseID
        const tableID = context.params.tableID
        // const accessToken = "oaaCkRLgfxAc1uG37.v1.eyJ1c2VySWQiOiJ1c3J5cVVTSm02Tm53OTNrRCIsImV4cGlyZXNBdCI6IjIwMjQtMTEtMTRUMTc6MDU6MDIuMDAwWiIsIm9hdXRoQXBwbGljYXRpb25JZCI6Im9hcGFZVlp1b3cyanFXSE1pIiwic2VjcmV0IjoiYjNmYTFlNDFmYjYzYWQyYjIxM2YyMTVlZGNmNjY4YWRkNThmODg4M2U5ZGYzYmEyNDQ4MzQzNmQwYzllMzhlNiJ9.f3b1a71ebf1446e2f3fa88269255563e7b8183555ccba94422a62aea1dd34163";
        const response = await axios.get(`${process.env.AIRTABLE_API_URL}/${baseID}/${tableID}`,{
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