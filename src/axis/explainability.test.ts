import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { explainConfidence, explainTodayOutput } from "./explainability";
import { sampleRyanContext } from "./sampleRyanContext";
import type { ExplainabilityResult } from "./types";

function assertReadableExplanation(result: ExplainabilityResult) {
  assert.equal(typeof result.conciseExplanation, "string");
  assert.ok(result.conciseExplanation.length > 24);
  assert.match(result.conciseExplanation, /\.$/);
}

function assertTrace(result: ExplainabilityResult) {
  assert.ok(result.supportingNodes.length > 0);
  assert.ok(result.graphPath.length > 0);
  assert.ok(result.debug?.targetNodeId);
}

test("Explainability works for Theme", () => {
  const today = generateToday(sampleRyanContext);
  const result = explainTodayOutput(today, { type: "theme" });

  assertReadableExplanation(result);
  assertTrace(result);
  assert.match(result.conciseExplanation, /Creative Identity/);
});

test("Explainability works for NOW", () => {
  const today = generateToday(sampleRyanContext);
  const result = explainTodayOutput(today, { type: "now" });

  assertReadableExplanation(result);
  assertTrace(result);
  assert.match(result.conciseExplanation, /strongest focus window/);
  assert.ok(result.supportingNodes.some((node) => node.id === "identity-creative-identity"));
});

test("Explainability works for NEXT", () => {
  const today = generateToday(sampleRyanContext);
  const result = explainTodayOutput(today, { type: "next" });

  assertReadableExplanation(result);
  assertTrace(result);
  assert.match(result.conciseExplanation, /next clean boundary/);
});

test("Explainability works for Protected Session", () => {
  const today = generateToday(sampleRyanContext);
  const result = explainTodayOutput(today, { type: "protectedSession" });

  assertReadableExplanation(result);
  assertTrace(result);
  assert.match(result.conciseExplanation, /protects Creative Identity/);
});

test("Explainability works for Timeline items", () => {
  const today = generateToday(sampleRyanContext);
  const decision = today.selectedDecisions.timeline.find((item) => item.id === "decision-recovery-walk");

  assert.ok(decision);

  const result = explainTodayOutput(today, { type: "timelineItem", decisionId: decision.id });

  assertReadableExplanation(result);
  assertTrace(result);
  assert.match(result.conciseExplanation, /Recovery|current day/);
});

test("Confidence explanation includes contributors", () => {
  const today = generateToday(sampleRyanContext);
  const result = explainConfidence(today);

  assertReadableExplanation(result);
  assertTrace(result);
  assert.ok(result.confidenceContributors.length >= 4);
  assert.ok(result.confidenceContributors.some((contributor) => contributor.label === "strong identity alignment"));
  assert.ok(result.confidenceContributors.some((contributor) => contributor.label === "good focus-window fit"));
});

test("Explainability returns graph-derived path details", () => {
  const today = generateToday(sampleRyanContext);
  const result = explainTodayOutput(today, { type: "now" });

  assert.ok(result.graphPath.some((step) => step.toNodeId === today.selectedDecisions.now.id));
  assert.ok(result.graphPath.some((step) => step.toNodeId === "output-now"));
  assert.ok(result.supportingNodes.every((node) => today.decisionGraph.nodes.some((graphNode) => graphNode.id === node.id)));
});
