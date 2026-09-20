import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "oracle-guarded-sovereign-settlement",
    network: "hedera-testnet",
  });
}
