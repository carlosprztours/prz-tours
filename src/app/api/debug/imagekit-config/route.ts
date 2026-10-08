import { NextResponse } from "next/server";

import { getEnvVar } from "@/lib/db/client";

/**
 * DEBUG: Returns the ImageKit endpoint for debugging.
 * REMOVE AFTER USE.
 */
export async function GET() {
  const endpoint = await getEnvVar("IMAGEKIT_URL_ENDPOINT");
  const privateKeyPrefix = (await getEnvVar("IMAGEKIT_PRIVATE_KEY"))?.slice(0, 10) ?? "not-set";
  
  return NextResponse.json({
    endpoint,
    privateKeyPrefix,
    timestamp: new Date().toISOString(),
  });
}