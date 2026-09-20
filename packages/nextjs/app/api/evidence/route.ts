import {
  AccountId,
  Client,
  PrivateKey,
  TopicId,
  TopicMessageSubmitTransaction,
} from "@hiero-ledger/sdk";
import { NextResponse } from "next/server";
import { sha256 } from "@/lib/evidence";

interface EvidenceRequest {
  intentId: string;
  contractAddress: string;
  transactionHash: string;
  mirrorConsensusTimestamp?: string | null;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured on the server`);
  return value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EvidenceRequest;
    if (!body.intentId || !body.contractAddress || !body.transactionHash) {
      return NextResponse.json({ error: "intentId, contractAddress and transactionHash are required" }, { status: 400 });
    }

    const topicId = TopicId.fromString(required("HEDERA_EVIDENCE_TOPIC_ID"));
    const operatorId = AccountId.fromString(required("HEDERA_OPERATOR_ID"));
    const operatorKey = PrivateKey.fromString(required("HEDERA_OPERATOR_PRIVATE_KEY"));
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    try {
      const evidenceHash = sha256(body);
      const payload = {
        v: 1,
        kind: "settlement-evidence",
        intentId: body.intentId,
        contract: body.contractAddress,
        txHash: body.transactionHash,
        evidenceHash,
      };
      const message = JSON.stringify(payload);
      if (Buffer.byteLength(message, "utf8") > 900) {
        return NextResponse.json({ error: "evidence anchor exceeds safe message budget" }, { status: 400 });
      }

      const tx = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message)
        .execute(client);
      const receipt = await tx.getReceipt(client);
      const transactionId = tx.transactionId.toString();
      const mirrorBase = (process.env.HEDERA_MIRROR_URL || "https://testnet.mirrornode.hedera.com").replace(/\/$/, "");

      return NextResponse.json({
        ok: true,
        evidenceHash,
        topicId: topicId.toString(),
        transactionId,
        status: receipt.status.toString(),
        mirrorUrl: `${mirrorBase}/api/v1/transactions/${encodeURIComponent(transactionId)}`,
      });
    } finally {
      client.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
