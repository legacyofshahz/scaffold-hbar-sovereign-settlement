# Submission Packet

## Entry

**Title:** Oracle-Guarded Sovereign Settlement

**One-line description:** A Scaffold-HBAR template for EIP-712-authorized HBAR settlement that uses a live Supra oracle as a load-bearing execution guard, verifies the Hedera result through Mirror Node, and anchors a compact evidence digest in HCS.

## Repository

Target public repository: `legacyofshahz/scaffold-hbar-sovereign-settlement`

Scaffold command after publication:

```bash
npm create scaffold-hbar@latest -- --template legacyofshahz/scaffold-hbar-sovereign-settlement
```

## Integration value

- **Supra:** live price + timestamp are required for the settlement to execute; removing Supra breaks the central safety property.
- **Hedera EVM:** enforces signature, replay, expiry, value, oracle-age, and oracle-range constraints atomically.
- **Mirror Node:** independently observes the contract result rather than trusting submission success.
- **HCS:** anchors the post-settlement evidence hash as an ordered integrity record.

## Submission evidence — populate only after G3 PASS

The final form must contain the actual public values from `evidence/testnet-proof.json`:

- public repository URL
- deployed testnet contract address
- settlement transaction HashScan/Mirror reference
- HCS topic ID
- HCS message transaction reference
- evidence hash
- developer-experience survey response

Do not enter fabricated transaction IDs, addresses, or proof links.

## Rubric strategy

1. Mechanical eligibility first.
2. Ecosystem integration: Supra is load-bearing, not decorative.
3. Documentation: README + AGENTS + explicit evidence/safety model.
4. Code quality: deterministic CCG, EIP-712, replay protection, meaningful negative tests, CI.
5. Hedera depth: EVM execution + HCS evidence + Mirror verification.

## Prize strategy

Primary objective: maximize this entry's score and clear every gate. Additional templates are attempted only after the primary is green and must be genuinely differentiated. The total pool is a campaign ceiling, not guaranteed proceeds.
