import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { explainTodayOutput } from "./explainability";
import { sampleRyanContext } from "./sampleRyanContext";
import { buildAdjustAlternatives, buildBecausePresentation, buildTodayCapturedLink } from "./todayPresentation";

test("Because uses Explainability service output", () => {
  const today = generateToday(sampleRyanContext);
  const because = buildBecausePresentation(today);
  const explanation = explainTodayOutput(today, { type: "now" });

  assert.equal(because.explanation, explanation.conciseExplanation);
  assert.match(because.explanation, /^Axis chose this because /);
});

test("confidence copy comes from Confidence Engine contributors", () => {
  const today = generateToday(sampleRyanContext);
  const because = buildBecausePresentation(today);
  const confidence = explainTodayOutput(today, { type: "confidence" });
  const topLabels = confidence.confidenceContributors.slice(0, 3).map((contributor) => contributor.label);

  for (const label of topLabels) {
    assert.ok(because.confidenceLine.includes(label));
  }
});

test("Adjust alternatives come from candidate or competing decisions", () => {
  const today = generateToday(sampleRyanContext);
  const alternatives = buildAdjustAlternatives(today);
  const candidateIds = new Set(today.candidateDecisions.map((candidate) => candidate.id));
  const competingIds = new Set(today.selectedDecisions.now.competingDecisionIds);

  assert.ok(alternatives.length > 0);
  assert.ok(alternatives.every((alternative) => candidateIds.has(alternative.sourceDecisionId)));
  assert.ok(alternatives.some((alternative) => competingIds.has(alternative.sourceDecisionId)));
});

test("Adjust alternatives do not break when missing", () => {
  const today = generateToday(sampleRyanContext);
  const withoutAlternatives = {
    ...today,
    candidateDecisions: [today.selectedDecisions.now],
    selectedDecisions: {
      ...today.selectedDecisions,
      now: {
        ...today.selectedDecisions.now,
        competingDecisionIds: []
      }
    }
  };

  assert.deepEqual(buildAdjustAlternatives(withoutAlternatives), []);
});

test("Today Captured link points to dev capture shell", () => {
  const link = buildTodayCapturedLink("today");

  assert.equal(link?.label, "Capture what happened");
  assert.equal(link?.href, "/dev/captured");
  assert.equal(link?.placement, "today_header");
});

test("Now mode remains minimal without capture link", () => {
  assert.equal(buildTodayCapturedLink("now"), undefined);
});
