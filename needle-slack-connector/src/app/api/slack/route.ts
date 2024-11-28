import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    console.log("[Slack API Route] Received request");
    const { endpoint, params, accessToken } = await request.json();
    console.log("[Slack API Route] Request params:", { endpoint, params });

    const cleanEndpoint = endpoint.replace(/^\/+/, "");
    const url = new URL(`https://slack.com/api/${cleanEndpoint}`);

    // Add query parameters
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, String(value));
      }
    });

    // Modified request configuration
    const response = await fetch(url.toString(), {
      method: "POST", // Changed from GET to POST as Slack API prefers POST
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded", // Changed content type
      },
      // Convert params to form data if needed
      body: params ? new URLSearchParams(params).toString() : undefined,
    });

    // Enhanced error logging
    if (!response.ok) {
      const text = await response.text();
      console.error("[Slack API Route] Error response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: text.substring(0, 1000), // Log first 1000 chars of response
      });
      return NextResponse.json(
        {
          ok: false,
          error: `Slack API error: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Slack API Route] Proxy error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { ok: false, error: "Failed to fetch from Slack API" },
      { status: 500 },
    );
  }
}
