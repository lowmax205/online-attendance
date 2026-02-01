import { NextRequest, NextResponse } from "next/server";
import { getCORSHeaders } from "./headers";

/**
 * CORS Middleware Utility
 * Use this in API routes that need CORS support
 */

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCORSPreflight(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin") || "";
  const corsHeaders = getCORSHeaders(origin);

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Add CORS headers to a response
 */
export function withCORS(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  const origin = request.headers.get("origin") || "";
  const corsHeaders = getCORSHeaders(origin);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * CORS wrapper for API route handlers
 *
 * @example
 * ```ts
 * export const GET = withCORSHandler(async (request) => {
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function withCORSHandler(
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle OPTIONS request (preflight)
    if (request.method === "OPTIONS") {
      return handleCORSPreflight(request);
    }

    // Execute the actual handler
    const response = await handler(request);

    // Add CORS headers to the response
    return withCORS(response, request);
  };
}
