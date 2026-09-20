# Evidence

`npm run prove:testnet` writes `testnet-proof.json` here. The file is ignored by Git because it is runtime evidence, not source code.

Before bounty submission, extract only non-secret public references needed by the submission form:

- EVM transaction hash / HashScan link
- Mirror Node contract-result link
- HCS topic ID / public topic link
- HCS transaction ID / Mirror Node link

Do not publish local private keys, environment files, account recovery material, or unrelated operational data.
