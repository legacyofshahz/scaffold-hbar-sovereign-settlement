# Validation Boundary

## Qualification state â€” 2026-09-21

### Local implementation qualification

Observed successful qualification evidence includes:

- dependency-free self-check: **37/37 PASS**
- Hardhat contract tests: **9/9 PASS**
- Next guard tests: **12/12 PASS**
- Solidity compilation: **PASS**
- Next.js production build: **PASS**

### External Scaffold-HBAR qualification

Official external Scaffold-HBAR generation completed successfully in GitHub Actions.

- official create-scaffold-hbar generation: **PASS**
- generated structure qualification: **PASS**
- G2 external scaffold gate: **PASS**
- GitHub Actions run: 35540285622

### Live Hedera testnet qualification

A bounded live testnet settlement completed successfully.

- Contract: 0x2B45E553ad7e6e727aDb6D8918AF7b4b142e1bd2
- Settlement transaction: https://hashscan.io/testnet/transaction/0x900e24a5817b928a9f2f92aceab6ae0c4f0cbe59fb1927ba4ce7c5fee92877c9
- Mirror contract-result verification: **PASS**
- HCS submission: **PASS**
- HCS Mirror verification: **PASS**
- HCS topic: 0.0.10639224
- HCS sequence: 1
- Settlement evidence hash: 0x4a6b77fba2515bb66144e03414ae8dace75589b7168d07bf4e481f6fa3de4184
- Mirror contract result: https://testnet.mirrornode.hedera.com/api/v1/contracts/results/0x900e24a5817b928a9f2f92aceab6ae0c4f0cbe59fb1927ba4ce7c5fee92877c9
- Mirror HCS evidence: https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10639224/messages/1

Proof path:

EIP-712 authorization -> Supra oracle guard -> Hedera EVM settlement -> Mirror verification -> HCS evidence anchor -> Mirror HCS verification

## Evidence handling

evidence/testnet-proof.json is generated locally and deliberately excluded from Git.

The public repository publishes only public-chain identifiers, Mirror/HashScan references, and cryptographic evidence hashes.

## Remaining boundary

This establishes reusable template behavior and real Hedera testnet execution evidence.

It does not establish:

- mainnet qualification
- production qualification
- guaranteed profitability
- zero economic risk
- oracle suitability for every application