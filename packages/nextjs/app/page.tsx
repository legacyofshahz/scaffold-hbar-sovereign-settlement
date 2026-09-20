"use client";

import { useMemo, useState } from "react";
import { evaluateTransitionGuard, type GuardInput } from "@/lib/guard";

export default function Home() {
  const now = 1_000;
  const [mode, setMode] = useState<"healthy" | "stale" | "drift" | "loss">("healthy");

  const state = useMemo<GuardInput>(() => {
    const base: GuardInput = {
      opportunityId: "FVWR-CANDIDATE-001",
      nowMs: now,
      observedAtMs: 900,
      observationTtlMs: 500,
      qualified: true,
      qualificationValidUntilMs: 2_000,
      verified: true,
      verificationValidUntilMs: 1_500,
      calculatedStateHash: "state-a",
      currentStateHash: "state-a",
      calculatedEconomicsHash: "econ-a",
      currentEconomicsHash: "econ-a",
      conservativeNetMinorUnits: 1n,
      policyMinNetMinorUnits: 0n,
      authorized: true,
      executionDeadlineMs: 1_800,
      idempotencyKey: "FVWR-CANDIDATE-001:1",
    };
    if (mode === "stale") base.observedAtMs = 400;
    if (mode === "drift") base.currentStateHash = "state-b";
    if (mode === "loss") base.conservativeNetMinorUnits = 0n;
    return base;
  }, [mode]);

  const result = evaluateTransitionGuard(state);

  return (
    <main>
      <div className="status">HEDERA TESTNET-FIRST / EVIDENCE-FIRST</div>
      <h1>Oracle-Guarded Sovereign Settlement</h1>
      <p className="lead">
        A Scaffold-HBAR template that makes value movement conditional on deterministic preflight,
        signed authority, live Supra market state, Hedera execution, independent Mirror Node
        observation, and HCS evidence anchoring.
      </p>

      <div className="flow">
        PROPOSE → CALCULATE → QUALIFY → VERIFY → SIGN → EXECUTE → MIRROR VERIFY → HCS EVIDENCE
      </div>

      <h2>Deterministic transition guard</h2>
      <div className="grid">
        <div className="card">
          <strong>Scenario</strong>
          <p><button onClick={() => setMode("healthy")}>Healthy</button></p>
          <p><button onClick={() => setMode("stale")}>Stale observation</button></p>
          <p><button onClick={() => setMode("drift")}>State drift</button></p>
          <p><button onClick={() => setMode("loss")}>Non-positive net</button></p>
        </div>
        <div className="card">
          <strong>Guard result</strong>
          <div className="result">
            <div className="status">{result.decision}</div>
            <small>{result.reason}</small>
          </div>
        </div>
        <div className="card">
          <strong>On-chain enforcement</strong>
          <div className="code">
            EIP-712 authority{"\n"}
            single-use intentId{"\n"}
            deadline{"\n"}
            exact HBAR amount{"\n"}
            Supra price band{"\n"}
            Supra freshness bound{"\n"}
            evidence commitment
          </div>
        </div>
      </div>

      <h2>Evidence closure</h2>
      <div className="grid">
        <div className="card"><strong>Hedera EVM</strong><span>Executes the authorized settlement.</span></div>
        <div className="card"><strong>Mirror Node</strong><span>Confirms the contract result independently.</span></div>
        <div className="card"><strong>HCS</strong><span>Anchors the post-settlement evidence digest.</span></div>
        <div className="card"><strong>Supra</strong><span>Supplies the load-bearing market-state guard.</span></div>
      </div>
    </main>
  );
}
