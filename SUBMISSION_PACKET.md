# Submission Packet

## Entry

**Title:** Oracle-Guarded Sovereign Settlement

**One-line description:** A Scaffold-HBAR template for EIP-712-authorized HBAR settlement that uses a live Supra oracle as a load-bearing execution guard, verifies the Hedera result through Mirror Node, and anchors a compact evidence digest in HCS.

## Repository

https://github.com/legacyofshahz/scaffold-hbar-sovereign-settlement

Scaffold command:


pm create scaffold-hbar@latest -- --template legacyofshahz/scaffold-hbar-sovereign-settlement

## Verified testnet evidence

- Deployed contract: 0x2B45E553ad7e6e727aDb6D8918AF7b4b142e1bd2
- Contract HashScan: https://hashscan.io/testnet/contract/0x2B45E553ad7e6e727aDb6D8918AF7b4b142e1bd2
- Settlement transaction: https://hashscan.io/testnet/transaction/0x900e24a5817b928a9f2f92aceab6ae0c4f0cbe59fb1927ba4ce7c5fee92877c9
- Mirror contract result: https://testnet.mirrornode.hedera.com/api/v1/contracts/results/0x900e24a5817b928a9f2f92aceab6ae0c4f0cbe59fb1927ba4ce7c5fee92877c9
- HCS topic: 0.0.10639224
- HCS sequence: 1
- HCS transaction ID: 0.0.8428297@1789945230.356455615
- HCS HashScan: https://hashscan.io/testnet/topic/0.0.10639224
- HCS Mirror evidence: https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10639224/messages/1
- Settlement evidence hash: 0x4a6b77fba2515bb66144e03414ae8dace75589b7168d07bf4e481f6fa3de4184

Verification state:

- settlement execution: **PASS**
- Mirror contract verification: **PASS**
- HCS submission: **PASS**
- Mirror HCS verification: **PASS**

## Evidence boundary

The raw local evidence/testnet-proof.json remains excluded from Git.

Only public blockchain identifiers and integrity hashes are published.

## Qualification boundary

This demonstrates real Hedera testnet execution and verification. It does not claim mainnet or production qualification.