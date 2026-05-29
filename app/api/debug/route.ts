import { NextResponse, connection } from "next/server";
export async function GET() {
  await connection();
  const key = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    hasKey: !!key,
    keyPrefix: key ? key.slice(0, 20) : null,
    nodeEnv: process.env.NODE_ENV,
  });
}
