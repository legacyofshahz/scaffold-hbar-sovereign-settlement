# Build specification — Oracle-Guarded Sovereign Settlement

Build and preserve a Scaffold-HBAR external template where a relayer can execute HBAR settlement only from a single-use EIP-712 intent signed by a configured authorizer, and only while a Supra Hedera price feed remains fresh and inside the signed bounds.

The completed testnet flow must independently observe the EVM transaction through Hedera Mirror Node and anchor a compact SHA-256 settlement evidence digest to HCS. HCS is not used as a database.

## Acceptance criteria

- `template.json`, README, AGENTS and MIT license are present.
- Fresh install, lint, test and build pass.
- Solidity tests cover valid execution, replay, invalid signature, stale oracle, out-of-range price, expiry, and incorrect value.
- No committed secrets or `.env`.
- Live testnet proof script fails closed when credentials, deployment, oracle freshness, Mirror verification or HCS evidence fail.
- Live proof persists public evidence references without persisting credentials.
- Mainnet is not part of the default flow.
