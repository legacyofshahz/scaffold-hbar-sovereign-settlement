# Oracle-Guarded Sovereign Settlement — Scaffold-HBAR Template

A production-oriented Scaffold-HBAR template for **policy-constrained HBAR settlements** on Hedera. A settlement is authorized off-chain with EIP-712, checked on-chain against a live **Supra** price feed and freshness bound, executed on Hedera, independently verified through a **Hedera Mirror Node**, and anchored as a compact integrity record in **Hedera Consensus Service (HCS)**.

This is a reusable pattern for treasury payouts, agent spending controls, escrow release, commerce settlement, and other systems where **"submitted" must not be confused with "verified and evidenced."**

## Why this integration is load-bearing

Removing Supra removes the market-state guard. Removing the Hedera contract removes enforceable settlement. Removing Mirror Node verification removes independent post-execution observation. Removing HCS removes the ordered integrity anchor. Each part contributes to the core use case.

### Hedera services used

- **Hedera Smart Contract Service / EVM** — executes the guarded settlement contract.
- **Hedera Consensus Service (HCS)** — anchors a compact post-settlement evidence digest.
- **Hedera Mirror Node REST API** — independently verifies EVM contract results and HCS transactions.

### Ecosystem integration

- **Supra Push Oracle** — load-bearing price and timestamp input. The template defaults to Hedera testnet's documented Supra Push Oracle address and HBAR/USDT pair ID `75`, but both are configurable.

## Architecture

```text
User / agent proposal
        |
        v
Deterministic preflight (ALLOW / REVERIFY / RECALCULATE / BLOCK)
        |
        v
EIP-712 SettlementIntent signed by configured authorizer
        |
        v
OracleGuardedSettlement.sol
  |-- replay guard (intentId)
  |-- deadline guard
  |-- exact amount guard
  |-- Supra timestamp freshness guard
  |-- Supra signed price-range guard
        |
        v
Hedera consensus execution
        |
        +------> Mirror Node contract-result verification
        |
        +------> HCS evidence digest
                         |
                         v
                  Mirror Node evidence lookup
```

## Prerequisites

- Node.js `>=20.18.3`
- npm 10+ (this template deliberately advertises npm only so its root orchestration remains deterministic)
- A Hedera **testnet** account funded from the Hedera Portal faucet for live proof

No mainnet key is required or recommended for this template.

## Scaffold

After the repository is public:

```bash
npm create scaffold-hbar@latest -- --template legacyofshahz/scaffold-hbar-sovereign-settlement
```

Until publication, clone the repository and run the same validation commands below.

On Windows, `scripts/qualify-and-publish.ps1` performs the local install/check gate and, when GitHub CLI is installed and authenticated, creates or updates the target public repository. It does not accept or print blockchain private keys. After publication, GitHub Actions independently performs the external Scaffold-HBAR generation gate.

## Install and validate

```bash
npm install
npm run self-check
npm run lint
npm test
npm run build
```

The local Solidity tests use `MockSupraSValueFeed`; they do not spend HBAR.

## Local UI

```bash
npm run dev
```

Open `http://localhost:3000`. The UI demonstrates the deterministic transition guard and documents the evidence pipeline. Server-only HCS and Mirror routes are included for integration testing.

## Live Hedera testnet proof

### 1. Configure testnet-only credentials locally

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
```

Edit that local file. **Never commit it. Never paste a private key into a GitHub issue, form, README, or chat.**

Minimum:

```dotenv
DEPLOYER_PRIVATE_KEY=0x...
```

For HCS evidence anchoring also provide:

```dotenv
HEDERA_OPERATOR_ID=0.0.x
HEDERA_OPERATOR_PRIVATE_KEY=...
```

Optional values have safe testnet defaults documented in the example file.

### 2. Deploy

```bash
npm run deploy:testnet
```

The deployment script writes `packages/hardhat/deployments/hederaTestnet.json` locally and prints the contract address.

### 3. Execute + independently verify + anchor evidence

```bash
npm run prove:testnet
```

The proof script performs one bounded testnet settlement and:

1. reads the live Supra pair;
2. derives a signed price range from that observed value;
3. commits a pre-execution evidence hash into the signed EIP-712 intent;
4. executes the settlement;
5. polls the Hedera Mirror Node using the EVM transaction hash;
6. creates an HCS topic if one is not supplied, then anchors the compact settlement digest;
7. verifies the HCS transaction through Mirror Node;
8. writes `evidence/testnet-proof.json` locally.

The bounty submission should publish the resulting **HashScan/Mirror references**, not credentials.

## Safety / authority model

The contract separates three roles:

- **Owner** — may rotate the authorizer or Supra feed address.
- **Authorizer** — signs bounded settlement intents.
- **Relayer** — submits an already-authorized intent and supplies the exact signed amount.

A valid signature alone is insufficient. Execution also requires:

- unconsumed `intentId`;
- unexpired deadline;
- exact `msg.value`;
- live Supra timestamp inside `maxOracleAge`;
- Supra price inside `[minPrice, maxPrice]`;
- non-zero evidence commitment.

## Evidence model

The signed intent contains `evidenceCommitment`, a hash of the pre-execution context. The contract emits it with the execution event. Post-execution, the proof script computes a settlement evidence hash and submits a compact HCS message containing only identifiers and hashes.

This follows a hash-first rule: **HCS is used as an ordered integrity anchor, not as a database or a place to publish private operational data.**

## Environment reference

`packages/hardhat/.env.example` documents all values. The important defaults are:

- Hedera testnet chain ID: `296`
- Hashio testnet JSON-RPC: `https://testnet.hashio.io/api`
- Hedera testnet Mirror Node REST: `https://testnet.mirrornode.hedera.com`
- Supra Hedera testnet Push Oracle: `0x6Cd59830AAD978446e6cc7f6cc173aF7656Fb917`
- Default pair: `75` (`HBAR_USDT`)

Supra's testnet feed update cadence can be materially slower than a trading oracle. `MAX_ORACLE_AGE_SECONDS` is therefore explicit and must be chosen for the application rather than hidden.

## Repository structure

```text
.
├── AGENTS.md
├── LICENSE
├── README.md
├── template.json
├── scripts/self-check.mjs
├── packages
│   ├── hardhat
│   │   ├── contracts
│   │   ├── scripts
│   │   └── test
│   └── nextjs
│       ├── app
│       └── lib
└── evidence
```

## Bounty eligibility mapping

| Gate | Implementation |
|---|---|
| Public external template | Repository is structured for `owner/repo` scaffolding |
| `template.json` | Present at repository root |
| `README.md`, `AGENTS.md` | Present |
| Install/lint/build | CI workflow + root scripts |
| Core route OK | `/` and `/api/health` |
| Hedera service | EVM settlement + HCS evidence |
| Testnet proof | `prove:testnet` generates live transaction evidence |
| No secrets | `.gitignore`, examples only, static self-check |
| MIT | `LICENSE` |
| Meaningful tests | signature, replay, staleness, price range, expiry, exact-value tests |

## Scope

This template is intentionally testnet-first. It does not claim production qualification, guaranteed profitability, oracle suitability for every economic use case, or zero financial risk.

## License

MIT.
