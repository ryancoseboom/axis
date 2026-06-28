import assert from "node:assert/strict";
import test from "node:test";
import { buildConfidence, calculateConfidence } from "./confidence";
import { generateToday } from "./engine";
import { explainConfidence } from "./explainability";
import { sampleRyanContext } from "./sampleRyanContext";
import type { CandidateDecision, ConfidenceFactor } from "./types";

const baseDecision: Omit<CandidateDecision, "confidence"> = {
  id: "decision-test",
  kind: "protect_session",
  title: "Protect test session",
  explanation: "A test decision.",
  window: { start: "09:00", end: "10:00" },
  durationMinutes: 60,
  protects: "Creative Identity",
  opportunityId: "opportunity-test",
  pursuitId: "pursuit-axis",
  missionId: "mission-version-zero",
  milestoneId: "milestone-engine-slice",
  supportingNodeIds: [],
  competingDecisionIds: [],
  score: {
    identityAlignment: 8,
    principleAlignment: 8,
    constraintSatisfaction: 8,
    opportunityLeverage: 8,
    driftRiskReduction: 8,
    recoveryImpact: 8,
    confidence: 8
  }
};

function factor(id: ConfidenceFactor["id"], score: number, direction: ConfidenceFactor["direction"] = "positive"): ConfidenceFactor {
  return {
    id,
    label: id,
    score,
    weight: 1,
    direction,
    explanation: `${id} explanation`
  };
}

test("confidence is calculated from named factors", () => {
  const confidence = buildConfidence(baseDecision);

  assert.ok(confidence.factors.length >= 7);
  assert.ok(confidence.factors.every((item) => item.id && item.label && item.explanation));
  assert.equal(confidence.score, calculateConfidence(confidence.factors).score);
});

test("positive factors raise confidence", () => {
  const low = calculateConfidence([factor("identityAlignment", 20), factor("focusWindowFit", 20)]);
  const high = calculateConfidence([factor("identityAlignment", 90), factor("focusWindowFit", 90)]);

  assert.ok(high.score > low.score);
});

test("negative factors lower confidence", () => {
  const lowConflict = calculateConfidence([factor("conflictLevel", 10, "negative")]);
  const highConflict = calculateConfidence([factor("conflictLevel", 90, "negative")]);

  assert.ok(highConflict.score < lowConflict.score);
});

test("confidence remains bounded between 0 and 100", () => {
  const tooLow = calculateConfidence([factor("identityAlignment", -100), factor("conflictLevel", 200, "negative")]);
  const tooHigh = calculateConfidence([factor("identityAlignment", 200), factor("focusWindowFit", 200)]);

  assert.equal(tooLow.score, 0);
  assert.equal(tooHigh.score, 100);
});

test("Today confidence is computed from output confidence factors", () => {
  const today = generateToday(sampleRyanContext);

  assert.equal(today.confidence, today.confidenceByOutput.today.score);
  assert.equal(today.confidenceByOutput.now.score, today.selectedDecisions.now.confidence.score);
  assert.equal(today.confidenceByOutput.next.score, today.selectedDecisions.next.confidence.score);
  assert.equal(today.confidenceByOutput.protectedSession.score, today.selectedDecisions.protectedSession.confidence.score);
});

test("confidence explanation includes top contributors", () => {
  const today = generateToday(sampleRyanContext);
  const explanation = explainConfidence(today);

  assert.ok(explanation.confidenceContributors.length >= 7);
  assert.equal(explanation.confidenceContributors[0].id, "identityAlignment");
  assert.ok(explanation.confidenceContributors.some((item) => item.id === "conflictLevel" && item.direction === "negative"));
});
