import { type NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { deleteCookie, getCookie, setCookie, hasCookie, getCookies } from 'cookies-next';
import axios from "axios";
import qs from "qs";


const { AIRTABLE_URL, NEEDLE_REDIRECT_URL, AIRTABLE_CLIENT_ID, AIRTABLE_CLIENT_SECRET, AIRTABLE_REDIRECT_URI } = process.env;

const encodedCredentials = Buffer.from(`${AIRTABLE_CLIENT_ID}:${AIRTABLE_CLIENT_SECRET}`).toString('base64');
const authorizationHeader = `Basic ${encodedCredentials}`;


export async function GET(request: NextRequest): Promise<NextResponse> {
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state');

    let cached = await getCookie(state,{cookies});
   
    let token={}
    await deleteCookie(state, {cookies});

    if (!cached || cached == undefined) {
        
        return NextResponse.redirect(`${NEEDLE_REDIRECT_URL}/connectors`);
    }

    cached = JSON.parse(cached);

    if (searchParams.get('error')) {
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        console.log("Error: ", error);
        return NextResponse.redirect(`${NEEDLE_REDIRECT_URL}/connectors`);
    }

    const code = searchParams.get('code');
    const codeVerifier = cached?.codeVerifier;
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (AIRTABLE_CLIENT_SECRET !== '') {
        headers.Authorization = authorizationHeader;
    }

    try {
        const response = await axios.post(`${AIRTABLE_URL}/oauth2/v1/token`, qs.stringify({
            client_id: AIRTABLE_CLIENT_ID,
            code_verifier: codeVerifier,
            redirect_uri: AIRTABLE_REDIRECT_URI,
            code,
            grant_type: 'authorization_code'
        }), { headers });
       
        token = JSON.stringify(response.data);
        const res= NextResponse.redirect(`${NEEDLE_REDIRECT_URL}/connectors/create/?token=${response.data.access_token}&refreshToken=${response.data.refresh_token}`)
    
        return res;

    } catch(e) {
       console.log("Error: ", e);
        return NextResponse.redirect(`${NEEDLE_REDIRECT_URL}/connectors`);
    }
}
