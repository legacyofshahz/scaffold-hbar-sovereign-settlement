# AGENTS.md — Oracle-Guarded Sovereign Settlement

## Mission

Maintain a Scaffold-HBAR template that demonstrates a bounded Hedera settlement pipeline:

`preflight -> EIP-712 authorization -> Supra price/freshness verification -> Hedera contract execution -> Mirror Node verification -> HCS evidence anchor`

The template is deliberately small. Do not add frameworks, agents, databases, or protocol integrations unless they are necessary to preserve this flow.

## Hard invariants

1. Never commit private keys, seed phrases, API keys, `.env`, wallet exports, or recovery material.
2. Mainnet is disabled by default. All proof scripts target Hedera testnet unless a maintainer explicitly changes the code and documents the review.
3. A signed intent is single-use. `intentId` replay must revert.
4. A settlement must fail if the intent expired, the oracle is stale, or the oracle price leaves the signed range.
5. The authorizer is distinct from the relayer. Any relayer may submit a valid signed intent, but only the configured authorizer can authorize one.
6. Evidence is hash-first. HCS receives a compact integrity anchor, not private business data.
7. HCS is an ordered proof log, not the application's query database. Mirror Node is used for independent reads.
8. Do not weaken tests to make CI pass. Repair the implementation.
9. Do not fabricate a HashScan, Mirror Node, transaction, topic, or payout link. Live evidence must come from Hedera testnet.
10. Keep the template scaffoldable from a clean checkout.

## Repository map

- `packages/hardhat/contracts/OracleGuardedSettlement.sol` — EIP-712 + Supra guarded HBAR settlement.
- `packages/hardhat/contracts/interfaces/ISupraSValueFeed.sol` — minimal Supra push-oracle interface.
- `packages/hardhat/contracts/mocks/MockSupraSValueFeed.sol` — deterministic local oracle for tests.
- `packages/hardhat/test/OracleGuardedSettlement.test.ts` — policy, replay, freshness, range and signature tests.
- `packages/hardhat/scripts/prove-testnet.ts` — atomic live proof: execute, Mirror-verify, HCS-anchor, persist evidence.
- `packages/nextjs/lib/guard.ts` — deterministic CCG reference implementation.
- `packages/nextjs/app/api/evidence/route.ts` — server-only HCS evidence anchoring route.
- `packages/nextjs/app/api/mirror/contract-result/[transactionHash]/route.ts` — independent Mirror Node verification.
- `scripts/self-check.mjs` — mechanical bounty gate checks that require no network.

## Required validation before submission

Run from a fresh checkout:

```bash
npm install
npm run self-check
npm run lint
npm test
npm run build
```

Then create real testnet evidence:

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
# edit the local .env; never paste secrets into issues/chat
npm run deploy:testnet
npm run prove:testnet
```

The resulting `evidence/testnet-proof.json` is local evidence. Publish only the non-secret transaction/HashScan/Mirror references required by the bounty.

## Change discipline

Prefer the smallest sufficient patch. New dependencies require a direct functional justification. Preserve deterministic guards before introducing probabilistic reasoning. Any change to signing, value transfer, oracle freshness, replay prevention, or evidence integrity requires a corresponding test.
