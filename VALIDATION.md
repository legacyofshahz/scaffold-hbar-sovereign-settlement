# Validation Boundary

## Executed in the ChatGPT build environment

The repository's dependency-free `scripts/self-check.mjs` can be executed here. The environment does not have package-registry network access, so dependency installation, Hardhat compilation, Next.js build, and live Hedera testnet transactions cannot be truthfully claimed from this environment.

## Required external qualification before submission

On a networked development machine or CI runner:

```bash
npm install
npm run self-check
npm run lint
npm test
npm run build
```

Then, with a funded Hedera **testnet-only** account:

```bash
npm run deploy:testnet
npm run prove:testnet
```

Submission readiness requires all commands to pass and a real `evidence/testnet-proof.json` to contain Mirror-verified EVM and HCS transactions.

## Hedera Harness status

Hedera Harness has **not** been executed against this artifact in the current environment. `docs/BUILD_SPEC.md` can be adapted into a Harness PRD later, but no Harness validators or PASS claim may be submitted unless the Harness is actually run.

## Current environment dependency-install attempt

On 2026-09-20, `npm install --no-audit --no-fund` was attempted from the artifact root. The environment could resolve local workspaces but npm registry access failed with `EAI_AGAIN` while fetching `@hiero-ledger/sdk`; the command was terminated after the bounded execution timeout. No `node_modules` or `package-lock.json` was produced.

Classification: **environment/network blocker, not a code PASS or FAIL**. G1 remains unresolved until a networked runner executes install/lint/test/build.
