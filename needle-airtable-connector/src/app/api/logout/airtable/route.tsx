import { NextRequest , NextResponse} from "next/server"


export async function GET () {
    
        const response = NextResponse.redirect("https://dev-hvo5i9jdpur2.needle-ai.com/connectors")
        response.cookies.set("token", "", {httpOnly: true, expires: new Date(0)})
        return response;
   
}