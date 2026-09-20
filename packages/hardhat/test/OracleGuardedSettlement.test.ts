import { expect } from "chai";
import { ethers } from "hardhat";
import type { Signer } from "ethers";

const PAIR_ID = 75n;
const PRICE = 25_000_000n;
const DECIMALS = 8n;

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

describe("OracleGuardedSettlement", function () {
  let intentSequence = 0n;
  async function fixture() {
    const [owner, authorizer, relayer, recipient, attacker] =
      await ethers.getSigners();
    const block = await ethers.provider.getBlock("latest");
    if (!block) throw new Error("latest block unavailable");

    const Mock = await ethers.getContractFactory("MockSupraSValueFeed");
    const mock = await Mock.deploy();
    await mock.waitForDeployment();
    await mock.setPrice(PAIR_ID, 1n, DECIMALS, BigInt(block.timestamp), PRICE);

    const Settlement = await ethers.getContractFactory(
      "OracleGuardedSettlement",
    );
    const settlement = await Settlement.deploy(
      await mock.getAddress(),
      await owner.getAddress(),
      await authorizer.getAddress(),
    );
    await settlement.waitForDeployment();

    return {
      owner,
      authorizer,
      relayer,
      recipient,
      attacker,
      mock,
      settlement,
    };
  }

  async function makeIntent(
    settlement: any,
    authorizer: Signer,
    recipient: string,
    overrides: Record<string, bigint | string> = {},
  ) {
    const network = await ethers.provider.getNetwork();
    const block = await ethers.provider.getBlock("latest");
    if (!block) throw new Error("latest block unavailable");

    const intent = {
      intentId: ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "uint256"],
          [BigInt(block.number), ++intentSequence],
        ),
      ),
      recipient,
      amountWei: ethers.parseEther("0.001"),
      pairId: PAIR_ID,
      minPrice: (PRICE * 90n) / 100n,
      maxPrice: (PRICE * 110n) / 100n,
      maxOracleAge: 3600n,
      deadline: BigInt(block.timestamp + 900),
      evidenceCommitment: ethers.keccak256(
        ethers.toUtf8Bytes("pre-execution-evidence"),
      ),
      ...overrides,
    };

    const domain = {
      name: "OracleGuardedSettlement",
      version: "1",
      chainId: network.chainId,
      verifyingContract: await settlement.getAddress(),
    };
    const signature = await authorizer.signTypedData(domain, TYPES, intent);
    return { intent, signature };
  }

  it("executes a current, authorized, price-bounded intent exactly once", async function () {
    const { authorizer, relayer, recipient, settlement } = await fixture();
    const { intent, signature } = await makeIntent(
      settlement,
      authorizer,
      await recipient.getAddress(),
    );

    const before = await ethers.provider.getBalance(
      await recipient.getAddress(),
    );
    const observed = await settlement.currentOraclePrice(PAIR_ID);
    const digest = await settlement.authorizationDigest(intent);
    await expect(
      settlement
        .connect(relayer)
        .execute(intent, signature, { value: intent.amountWei }),
    )
      .to.emit(settlement, "SettlementExecuted")
      .withArgs(
        intent.intentId,
        await recipient.getAddress(),
        await relayer.getAddress(),
        intent.amountWei,
        intent.pairId,
        PRICE,
        observed.time,
        intent.evidenceCommitment,
        digest,
      );
    const after = await ethers.provider.getBalance(
      await recipient.getAddress(),
    );
    expect(after - before).to.equal(intent.amountWei);
    expect(await settlement.consumedIntents(intent.intentId)).to.equal(true);

    await expect(
      settlement
        .connect(relayer)
        .execute(intent, signature, { value: intent.amountWei }),
    ).to.be.revertedWithCustomError(settlement, "IntentAlreadyConsumed");
  });

  it("blocks an invalid authorizer", async function () {
    const { attacker, relayer, recipient, settlement } = await fixture();
    const { intent, signature } = await makeIntent(
      settlement,
      attacker,
      await recipient.getAddress(),
    );
    await expect(
      settlement
        .connect(relayer)
        .execute(intent, signature, { value: intent.amountWei }),
    ).to.be.revertedWithCustomError(settlement, "InvalidAuthorizer");
  });

  it("blocks stale oracle state", async function () {
    const { authorizer, relayer, recipient, mock, settlement } =
      await fixture();
    const block = await ethers.provider.getBlock("latest");
    if (!block) throw new Error("latest block unavailable");
    await mock.setPrice(
      PAIR_ID,
      2n,
      DECIMALS,
      BigInt(block.timestamp - 7201),
      PRICE,
    );
    const { intent, signature } = await makeIntent(
      settlement,
      authorizer,
      await recipient.getAddress(),
      { maxOracleAge: 7200n },
    );
    await expect(
      settlement
        .connect(relayer)
        .execute(intent, signature, { value: intent.amountWei }),
    ).to.be.revertedWithCustomError(settlement, "OracleStale");
  });

  it("blocks a price that moved outside the signed band", async function () {
    const { authorizer, relayer, recipient, mock, settlement } =
      await fixture();
    const block = await ethers.provider.getBlock("latest");
    if (!block) throw new Error("latest block unavailable");
    await mock.setPrice(
      PAIR_ID,
      2n,
      DECIMALS,
      BigInt(block.timestamp),
      PRICE * 2n,
    );
    const { intent, signature } = await makeIntent(
      settlement,
      authorizer,
      await recipient.getAddress(),
    );
    await expect(
      settlement
        .connect(relayer)
        .execute(intent, signature, { value: intent.amountWei }),
    ).to.be.revertedWithCustomError(settlement, "PriceOutsideRange");
  });

  it("blocks an expired intent", async function () {
    const { authorizer, relayer, recipient, settlement } = await fixture();
    const block = await ethers.provider.getBlock("latest");
    if (!block) throw new Error("latest block unavailable");
    const { intent, signature } = await makeIntent(
      settlement,
      authorizer,
      await recipient.getAddress(),
      { deadline: BigInt(block.timestamp - 1) },
    );
    await expect(
      settlement
        .connect(relayer)
        .execute(intent, signature, { value: intent.amountWei }),
    ).to.be.revertedWithCustomError(settlement, "IntentExpired");
  });

  it("blocks oracle timestamps from the future", async function () {
    const { authorizer, relayer, recipient, mock, settlement } =
      await fixture();
    const block = await ethers.provider.getBlock("latest");
    if (!block) throw new Error("latest block unavailable");
    await mock.setPrice(
      PAIR_ID,
      2n,
      DECIMALS,
      BigInt(block.timestamp + 3600),
      PRICE,
    );
    const { intent, signature } = await makeIntent(
      settlement,
      authorizer,
      await recipient.getAddress(),
    );
    await expect(
      settlement
        .connect(relayer)
        .execute(intent, signature, { value: intent.amountWei }),
    ).to.be.revertedWithCustomError(settlement, "OracleTimestampInFuture");
  });

  it("blocks a zero evidence commitment", async function () {
    const { authorizer, relayer, recipient, settlement } = await fixture();
    const { intent, signature } = await makeIntent(
      settlement,
      authorizer,
      await recipient.getAddress(),
      { evidenceCommitment: ethers.ZeroHash },
    );
    await expect(
      settlement
        .connect(relayer)
        .execute(intent, signature, { value: intent.amountWei }),
    ).to.be.revertedWithCustomError(settlement, "ZeroEvidenceCommitment");
  });

  it("restricts authorizer rotation to the owner", async function () {
    const { attacker, settlement } = await fixture();
    await expect(
      settlement
        .connect(attacker)
        .updateAuthorizer(await attacker.getAddress()),
    ).to.be.revertedWithCustomError(settlement, "OwnableUnauthorizedAccount");
  });

  it("requires the exact signed value", async function () {
    const { authorizer, relayer, recipient, settlement } = await fixture();
    const { intent, signature } = await makeIntent(
      settlement,
      authorizer,
      await recipient.getAddress(),
    );
    await expect(
      settlement
        .connect(relayer)
        .execute(intent, signature, { value: intent.amountWei + 1n }),
    ).to.be.revertedWithCustomError(settlement, "IncorrectValue");
  });
});
