# Release Gates — Scaffold-HBAR Sovereign Settlement

This file is an execution checklist. It does not create a new SYSDEX component.

## G0 — Static integrity — PASS in current artifact

- Required bounty files present.
- `template.json` parses and advertises only supported npm + Hardhat + Next.js capability.
- MIT licence present.
- No committed `.env`.
- Static secret scan clean.
- Settlement contract contains replay, expiry, oracle freshness, price-band, authorization, and evidence-commitment guards.

Evidence: `npm run self-check` (dependency-free).

## G1 — Fresh install / code gate — REQUIRED

On a networked machine or CI:

```bash
npm install
npm run lint
npm test
npm run build
```

PASS only if all commands exit 0 from a clean checkout/scaffold. Commit the resulting `package-lock.json` before final submission for reproducible installs.

## G2 — External scaffold gate — REQUIRED

After the repository is public, `.github/workflows/external-scaffold.yml` independently invokes the official Scaffold-HBAR CLI against the public `owner/repo`, generates a fresh project, and reruns self-check/lint/test/build.

The workflow must PASS. This proves the artifact works through the same external-template path the bounty evaluates, rather than only inside the source repository.

## G3 — Hedera testnet evidence gate — REQUIRED

Using testnet-only credentials stored locally:

```bash
npm run deploy:testnet
npm run prove:testnet
```

PASS requires:

- contract deployment on Hedera testnet;
- successful guarded settlement transaction;
- Mirror Node contract-result observation;
- HCS evidence message receipt;
- Mirror Node observation of the HCS transaction;
- `evidence/testnet-proof.json`;
- public HashScan/Mirror references suitable for the bounty form.

## G4 — Bounty eligibility gate — REQUIRED

- public repository;
- clean Scaffold-HBAR generation;
- `template.json`, `README.md`, `AGENTS.md`;
- install/lint/test/build green;
- application boots;
- Hedera testnet proof links;
- no secrets or `.env`;
- MIT original work;
- Harness artifacts only if Harness was actually run.

## G5 — Submission — REQUIRED

Submit the public repository, testnet evidence links, developer-experience survey, and any actually used Harness material before the official deadline.

No gate may be marked PASS from architectural intent alone.
