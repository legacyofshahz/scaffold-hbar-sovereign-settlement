import assert from "node:assert/strict";
import test from "node:test";
import { evaluateTransitionGuard, type GuardInput } from "./guard";

const base: GuardInput = {
  opportunityId: "candidate-001",
  nowMs: 1_000,
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
  idempotencyKey: "candidate-001:1",
};

const cases: Array<[string, GuardInput, string]> = [
  ["allows only intact state", base, "ALLOW"],
  ["reverifies stale observation", { ...base, observedAtMs: 400 }, "REVERIFY"],
  ["reverifies missing final verification", { ...base, verified: false }, "REVERIFY"],
  ["reverifies expired final verification", { ...base, verificationValidUntilMs: 1_000 }, "REVERIFY"],
  ["recalculates changed state", { ...base, currentStateHash: "state-b" }, "RECALCULATE"],
  ["recalculates changed economics", { ...base, currentEconomicsHash: "econ-b" }, "RECALCULATE"],
  ["blocks non-positive conservative net", { ...base, conservativeNetMinorUnits: 0n }, "BLOCK"],
  ["blocks missing authority", { ...base, authorized: false }, "BLOCK"],
  ["blocks expired qualification", { ...base, qualificationValidUntilMs: 1_000 }, "BLOCK"],
  ["blocks expired execution deadline", { ...base, executionDeadlineMs: 1_000 }, "BLOCK"],
  ["blocks future observations", { ...base, observedAtMs: 1_001 }, "BLOCK"],
  ["blocks missing idempotency key", { ...base, idempotencyKey: "" }, "BLOCK"],
];

for (const [name, input, expected] of cases) {
  test(name, () => {
    assert.equal(evaluateTransitionGuard(input).decision, expected);
  });
}
