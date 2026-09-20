import "dotenv/config";
import { ethers, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

const TESTNET_SUPRA_PUSH = "0x6Cd59830AAD978446e6cc7f6cc173aF7656Fb917";

async function main() {
  if (network.name !== "hederaTestnet") {
    throw new Error(
      `Refusing deployment on ${network.name}; use --network hederaTestnet`,
    );
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer)
    throw new Error("No deployer. Set DEPLOYER_PRIVATE_KEY in local .env.");

  const authorizerPrivateKey = process.env.AUTHORIZER_PRIVATE_KEY?.trim();
  const authorizer = authorizerPrivateKey
    ? new ethers.Wallet(authorizerPrivateKey).address
    : await deployer.getAddress();
  const supraFeed =
    process.env.SUPRA_FEED_ADDRESS?.trim() || TESTNET_SUPRA_PUSH;

  const Factory = await ethers.getContractFactory("OracleGuardedSettlement");
  const contract = await Factory.deploy(
    supraFeed,
    await deployer.getAddress(),
    authorizer,
  );
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const deploymentTx = contract.deploymentTransaction();
  if (!deploymentTx) throw new Error("Deployment transaction unavailable");
  const receipt = await deploymentTx.wait();
  if (!receipt) throw new Error("Deployment receipt unavailable");

  const deployment = {
    network: "hederaTestnet",
    chainId: 296,
    contractAddress: address,
    deployer: await deployer.getAddress(),
    authorizer,
    supraFeed,
    transactionHash: deploymentTx.hash,
    mirrorResultUrl: `https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${deploymentTx.hash}`,
    hashscanContractUrl: `https://hashscan.io/testnet/contract/${address}`,
    createdAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "hederaTestnet.json"),
    JSON.stringify(deployment, null, 2),
  );

  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
