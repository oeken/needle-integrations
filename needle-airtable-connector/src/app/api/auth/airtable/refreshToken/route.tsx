import { type NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { deleteCookie, getCookie, setCookie, hasCookie, getCookies } from 'cookies-next';
import axios from "axios";
import qs from "qs"
import jwt from "jsonwebtoken"

const {AIRTABLE_URL,AIRTABLE_CLIENT_ID, AIRTABLE_CLIENT_SECRET,AIRTABLE_REDIRECT_URI,   } = process.env;
const clientId = process.env.AIRTABLE_CLIENT_ID;

const clientSecret = process.env.AIRTABLE_CLIENT_SECRET;
const redirectUri = process.env.AIRTABLE_REDIRECT_URI;
const encodedCredentials = Buffer.from(`${AIRTABLE_CLIENT_ID}:${AIRTABLE_CLIENT_SECRET}`).toString('base64');
const authorizationHeader = `Basic ${encodedCredentials}`;

export async function GET(request: NextRequest): Promise<NextResponse> {
    
   

    let refreshToken = await getCookie("token",{cookies});
    refreshToken = JSON.parse(refreshToken)?.refresh_token

    if (!refreshToken) {
        return new NextResponse(JSON.stringify({
            "error": "No refresh token in data"
        }), {
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    if (typeof refreshToken !== 'string') {
        return new NextResponse(JSON.stringify({
            "error": "Refresh token was not a string"
        }), {
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    refreshToken = refreshToken.trim();

    const headers = {
        // Content-Type is always required
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (AIRTABLE_CLIENT_SECRET !== '') {
        // Authorization is required if your integration has a client secret
        // omit it otherwise
        headers.Authorization = authorizationHeader;
    }

    try {
        const responseToken = await axios({
            method: 'POST',
            url: `${AIRTABLE_URL}/oauth2/v1/token`,
            headers,
            // stringify the request body like a URL query string
            data: qs.stringify({
                // client_id is optional if authorization header provided
                // required otherwise.
                client_id: AIRTABLE_CLIENT_ID,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        })
        console.log(responseToken.data);
        setCookie("token",responseToken.data,{cookies});
        const res= NextResponse.json({
            message: "User logged in successfully", success: true,
        })

        

        res.cookies.set("token",  JSON.stringify(responseToken.data));
        
        return res;
    } catch (err) {
        return new NextResponse(JSON.stringify(err), {
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
    
        
}

export async function getNewAccessToken(refreshToken: string) {
    if (!refreshToken) {
        return false;
    }

    if (typeof refreshToken !== 'string') {
        return false;
    }

    // refreshToken = refreshToken.trim();

    const headers = {
        // Content-Type is always required
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (AIRTABLE_CLIENT_SECRET !== '') {
        // Authorization is required if your integration has a client secret
        // omit it otherwise
        headers.Authorization = authorizationHeader;
    }
    try {
        const responseToken = await axios({
            method: 'POST',
            url: `${AIRTABLE_URL}/oauth2/v1/token`,
            headers,
            data: qs.stringify({
                client_id: AIRTABLE_CLIENT_ID,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        })
        
        return responseToken;
    } catch (err) {
        console.log("Inside getNewAccessToken API.....", err);
        return false;
    }
}