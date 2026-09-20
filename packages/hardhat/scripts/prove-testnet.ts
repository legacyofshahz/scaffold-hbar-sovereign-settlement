import "dotenv/config";
import { ethers, network } from "hardhat";
import {
  AccountId,
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicId,
  TopicMessageSubmitTransaction,
} from "@hiero-ledger/sdk";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const TYPES = {
  SettlementIntent: [
    { name: "intentId", type: "bytes32" },
    { name: "recipient", type: "address" },
    { name: "amountWei", type: "uint256" },
    { name: "pairId", type: "uint256" },
    { name: "minPrice", type: "uint256" },
    { name: "maxPrice", type: "uint256" },
    { name: "maxOracleAge", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "evidenceCommitment", type: "bytes32" },
  ],
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Hex(value: unknown): string {
  return `0x${crypto.createHash("sha256").update(canonical(value)).digest("hex")}`;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`${name} is required in local packages/hardhat/.env`);
  return value;
}

async function pollJson(
  url: string,
  attempts = 20,
  delayMs = 2500,
): Promise<any> {
  let last = "";
  for (let i = 0; i < attempts; i += 1) {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });
    last = await response.text();
    if (response.ok) return JSON.parse(last);
    if (response.status !== 404)
      throw new Error(`Mirror request ${response.status}: ${last}`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(
    `Mirror evidence not found after polling: ${url}; last=${last}`,
  );
}

async function main() {
  if (network.name !== "hederaTestnet") {
    throw new Error(
      `Refusing proof on ${network.name}; use --network hederaTestnet`,
    );
  }

  const deploymentPath = path.join(
    __dirname,
    "..",
    "deployments",
    "hederaTestnet.json",
  );
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Missing deployment. Run npm run deploy:testnet first.");
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contractAddress = String(deployment.contractAddress);

  const [relayer] = await ethers.getSigners();
  if (!relayer) throw new Error("No relayer. Set DEPLOYER_PRIVATE_KEY.");

  const authorizerKey =
    process.env.AUTHORIZER_PRIVATE_KEY?.trim() ||
    required("DEPLOYER_PRIVATE_KEY");
  const authorizerWallet = new ethers.Wallet(authorizerKey);
  if (
    authorizerWallet.address.toLowerCase() !==
    String(deployment.authorizer).toLowerCase()
  ) {
    throw new Error(
      "AUTHORIZER_PRIVATE_KEY does not match the deployed authorizer address.",
    );
  }

  const settlement = await ethers.getContractAt(
    "OracleGuardedSettlement",
    contractAddress,
    relayer,
  );
  const pairId = BigInt(process.env.SUPRA_PAIR_ID || "75");
  const priceBandBps = BigInt(process.env.PRICE_BAND_BPS || "1000");
  if (priceBandBps <= 0n || priceBandBps >= 10_000n)
    throw new Error("PRICE_BAND_BPS must be in (0,10000)");
  const maxOracleAge = BigInt(process.env.MAX_ORACLE_AGE_SECONDS || "7200");
  const amountHbar = process.env.TEST_AMOUNT_HBAR || "0.001";
  const transactionValueWei = ethers.parseEther(amountHbar);
  const amountWei = ethers.parseUnits(amountHbar, 8);
  const recipient =
    process.env.RECIPIENT_ADDRESS?.trim() || (await relayer.getAddress());

  const observed: any = await settlement.currentOraclePrice(pairId);
  const oraclePrice = BigInt(observed.price);
  const oracleTimestampRaw = BigInt(observed.time);
  const oracleTimestamp =
    oracleTimestampRaw > 10_000_000_000n
      ? oracleTimestampRaw / 1000n
      : oracleTimestampRaw;
  if (oraclePrice <= 0n)
    throw new Error(`Supra returned non-positive price for pair ${pairId}`);

  const latest = await ethers.provider.getBlock("latest");
  if (!latest) throw new Error("Latest block unavailable");
  const now = BigInt(latest.timestamp);
  if (oracleTimestamp > now)
    throw new Error(
      "Supra timestamp is in the future relative to Hedera block time",
    );
  if (now - oracleTimestamp > maxOracleAge) {
    throw new Error(
      `Supra feed is stale: age=${now - oracleTimestamp}s max=${maxOracleAge}s`,
    );
  }

  const minPrice = (oraclePrice * (10_000n - priceBandBps)) / 10_000n;
  const maxPrice = (oraclePrice * (10_000n + priceBandBps)) / 10_000n;
  const preEvidence = {
    version: 1,
    network: "hedera-testnet",
    contractAddress,
    relayer: await relayer.getAddress(),
    recipient,
    pairId: pairId.toString(),
    oraclePrice: oraclePrice.toString(),
    oracleTimestamp: oracleTimestamp.toString(),
    observedAtBlock: latest.number,
    amountWei: amountWei.toString(),
  };
  const evidenceCommitment = sha256Hex(preEvidence);
  const intentId = ethers.keccak256(
    ethers.toUtf8Bytes(
      `sovereign-settlement:${Date.now()}:${recipient}:${amountWei.toString()}`,
    ),
  );

  const intent = {
    intentId,
    recipient,
    amountWei,
    pairId,
    minPrice,
    maxPrice,
    maxOracleAge,
    deadline: now + 600n,
    evidenceCommitment,
  };

  const domain = {
    name: "OracleGuardedSettlement",
    version: "1",
    chainId: 296,
    verifyingContract: contractAddress,
  };
  const signature = await authorizerWallet.signTypedData(domain, TYPES, intent);

  const tx = await settlement.execute(intent, signature, {
    value: transactionValueWei,
  });
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1)
    throw new Error("Settlement transaction failed");

  const mirrorBase = (
    process.env.HEDERA_MIRROR_URL || "https://testnet.mirrornode.hedera.com"
  ).replace(/\/$/, "");
  const contractResultUrl = `${mirrorBase}/api/v1/contracts/results/${tx.hash}`;
  const mirrorContractResult = await pollJson(contractResultUrl);
  if (mirrorContractResult.error_message) {
    throw new Error(
      `Mirror Node reports contract error: ${mirrorContractResult.error_message}`,
    );
  }

  const postEvidence = {
    ...preEvidence,
    intentId,
    evidenceCommitment,
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    mirrorContractResultUrl: contractResultUrl,
    mirrorConsensusTimestamp: mirrorContractResult.timestamp ?? null,
    status: "SETTLED_MIRROR_VERIFIED",
  };
  const settlementEvidenceHash = sha256Hex(postEvidence);

  const operatorId = AccountId.fromString(required("HEDERA_OPERATOR_ID"));
  const operatorKey = PrivateKey.fromString(
    required("HEDERA_OPERATOR_PRIVATE_KEY"),
  );
  const client = Client.forTestnet().setOperator(operatorId, operatorKey);

  try {
    let topicId: TopicId;
    const configuredTopic = process.env.HEDERA_EVIDENCE_TOPIC_ID?.trim();
    if (configuredTopic) {
      topicId = TopicId.fromString(configuredTopic);
    } else {
      const create = await new TopicCreateTransaction()
        .setTopicMemo("Scaffold-HBAR Sovereign Settlement evidence")
        .execute(client);
      const createReceipt = await create.getReceipt(client);
      if (!createReceipt.topicId)
        throw new Error("HCS topic creation did not return topicId");
      topicId = createReceipt.topicId;
    }

    const hcsPayload = {
      v: 1,
      kind: "settlement-evidence",
      intentId,
      contract: contractAddress,
      txHash: tx.hash,
      evidenceHash: settlementEvidenceHash,
    };
    const message = JSON.stringify(hcsPayload);
    if (Buffer.byteLength(message, "utf8") > 900)
      throw new Error("HCS payload unexpectedly large");

    const submit = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message)
      .execute(client);
    const submitReceipt = await submit.getReceipt(client);
    const hcsTransactionId = submit.transactionId.toString();
    const sequenceNumber = submitReceipt.topicSequenceNumber?.toString();
    if (!sequenceNumber)
      throw new Error("HCS receipt did not return a topic sequence number");

    // Verify the exact consensus message rather than relying on transaction-submission state.
    const mirrorHcsUrl = `${mirrorBase}/api/v1/topics/${topicId.toString()}/messages/${sequenceNumber}`;
    const mirrorHcsResult = await pollJson(mirrorHcsUrl);
    if (String(mirrorHcsResult.sequence_number) !== sequenceNumber) {
      throw new Error(
        `Mirror Node returned unexpected HCS sequence: ${mirrorHcsResult.sequence_number}`,
      );
    }

    const finalEvidence = {
      ...postEvidence,
      settlementEvidenceHash,
      hcs: {
        topicId: topicId.toString(),
        sequenceNumber,
        transactionId: hcsTransactionId,
        receiptStatus: submitReceipt.status.toString(),
        payload: hcsPayload,
        mirrorUrl: mirrorHcsUrl,
        mirrorVerified: true,
      },
      hashscan: {
        contract: `https://hashscan.io/testnet/contract/${contractAddress}`,
        transactionHash: `https://hashscan.io/testnet/transaction/${tx.hash}`,
        topic: `https://hashscan.io/testnet/topic/${topicId.toString()}`,
      },
      completedAt: new Date().toISOString(),
    };

    const evidenceDir = path.resolve(__dirname, "..", "..", "..", "evidence");
    fs.mkdirSync(evidenceDir, { recursive: true });
    const out = path.join(evidenceDir, "testnet-proof.json");
    fs.writeFileSync(out, JSON.stringify(finalEvidence, null, 2));
    console.log(JSON.stringify(finalEvidence, null, 2));
    console.log(`\nEVIDENCE=${out}`);
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
