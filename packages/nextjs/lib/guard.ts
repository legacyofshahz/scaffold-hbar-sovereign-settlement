export type GuardDecision = "ALLOW" | "REVERIFY" | "RECALCULATE" | "BLOCK";

export interface GuardInput {
  opportunityId: string;
  nowMs: number;
  observedAtMs: number;
  observationTtlMs: number;
  qualified: boolean;
  qualificationValidUntilMs: number;
  verified: boolean;
  verificationValidUntilMs: number;
  calculatedStateHash: string;
  currentStateHash: string;
  calculatedEconomicsHash: string;
  currentEconomicsHash: string;
  conservativeNetMinorUnits: bigint;
  policyMinNetMinorUnits: bigint;
  authorized: boolean;
  executionDeadlineMs: number;
  idempotencyKey: string;
}

export interface GuardResult {
  decision: GuardDecision;
  reason: string;
}

export function evaluateTransitionGuard(state: GuardInput): GuardResult {
  if (!state.opportunityId.trim()) return { decision: "BLOCK", reason: "missing opportunityId" };
  if (!state.idempotencyKey.trim()) return { decision: "BLOCK", reason: "missing idempotencyKey" };
  if (state.observationTtlMs <= 0) return { decision: "BLOCK", reason: "invalid observation TTL" };
  if (!state.qualified) return { decision: "BLOCK", reason: "not qualified" };
  if (state.nowMs >= state.qualificationValidUntilMs) return { decision: "BLOCK", reason: "qualification expired" };
  if (!state.authorized) return { decision: "BLOCK", reason: "not authorized" };
  if (state.nowMs >= state.executionDeadlineMs) return { decision: "BLOCK", reason: "execution deadline expired" };
  if (state.conservativeNetMinorUnits <= state.policyMinNetMinorUnits) {
    return { decision: "BLOCK", reason: "conservative net does not clear policy minimum" };
  }

  const age = state.nowMs - state.observedAtMs;
  if (age < 0) return { decision: "BLOCK", reason: "observation timestamp is in the future" };
  if (age >= state.observationTtlMs) return { decision: "REVERIFY", reason: "observation stale" };
  if (!state.verified) return { decision: "REVERIFY", reason: "final verification missing" };
  if (state.nowMs >= state.verificationValidUntilMs) return { decision: "REVERIFY", reason: "verification expired" };

  if (state.currentStateHash !== state.calculatedStateHash) {
    return { decision: "RECALCULATE", reason: "state changed after calculation" };
  }
  if (state.currentEconomicsHash !== state.calculatedEconomicsHash) {
    return { decision: "RECALCULATE", reason: "economics changed after calculation" };
  }

  return { decision: "ALLOW", reason: "qualified, verified, current, positive-net, authorized" };
}
