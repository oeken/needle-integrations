import { type NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { deleteCookie, getCookie, setCookie, hasCookie, getCookies } from 'cookies-next';

import crypto from 'crypto';
import { URL } from 'url';

const { AIRTABLE_URL, AIRTABLE_CLIENT_ID,  AIRTABLE_REDIRECT_URI } = process.env;

export async function GET(request: NextRequest): Promise<NextResponse> {
    const state = crypto.randomBytes(100).toString('base64url');
    const codeVerifier = crypto.randomBytes(96).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    
    const isSet = await setCookie(state, { codeVerifier },{cookies});
    const cookie = await getCookie(state,{cookies});
    
    // console.log("isSet",isSet, cookie);
    
    const authorizationUrl = new URL(`${AIRTABLE_URL}/oauth2/v1/authorize`);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('client_id', AIRTABLE_CLIENT_ID);
    authorizationUrl.searchParams.set('redirect_uri', AIRTABLE_REDIRECT_URI);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', "user.email:read data.recordComments:read schema.bases:read data.records:read");

    return NextResponse.redirect(authorizationUrl.toString());
}
