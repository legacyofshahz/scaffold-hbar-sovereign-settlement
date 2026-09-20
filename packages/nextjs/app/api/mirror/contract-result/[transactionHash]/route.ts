import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ transactionHash: string }> },
) {
  const { transactionHash } = await context.params;
  if (!/^(0x)?[a-fA-F0-9]{64}$/.test(transactionHash)) {
    return NextResponse.json({ error: "expected a 32-byte EVM transaction hash" }, { status: 400 });
  }

  const base = (process.env.HEDERA_MIRROR_URL || "https://testnet.mirrornode.hedera.com").replace(/\/$/, "");
  const url = `${base}/api/v1/contracts/results/${encodeURIComponent(transactionHash)}`;
  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  const text = await response.text();

  if (!response.ok) {
    return NextResponse.json({ error: `mirror node returned ${response.status}`, detail: text }, { status: response.status });
  }
  const data = JSON.parse(text);
  return NextResponse.json({
    ok: !data.error_message,
    hash: data.hash ?? transactionHash,
    consensusTimestamp: data.timestamp ?? null,
    gasUsed: data.gas_used ?? null,
    result: data.error_message ? "FAILED" : "SUCCESS",
    source: url,
  });
}
