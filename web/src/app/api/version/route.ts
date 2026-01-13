import { NextResponse } from "next/server";

// Simple version endpoint to verify deployment
export async function GET() {
  return NextResponse.json({
    version: "1.5.7",
    build: "import-run-upsert",
    deployedAt: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
}
