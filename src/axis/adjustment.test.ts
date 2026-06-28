import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { sampleRyanContext } from "./sampleRyanContext";
import { buildAdjustAlternatives, buildBecausePresentation } from "./todayPresentation";

test("selecting an alternative recomputes Today", () => {
  const original = generateToday(sampleRyanContext);
  const alternative = buildAdjustAlternatives(original)[0];

  assert.ok(alternative);

  const adjusted = generateToday(sampleRyanContext, { preferredDecisionId: alternative.sourceDecisionId });

  assert.equal(adjusted.selectedDecisions.now.id, alternative.sourceDecisionId);
  assert.notEqual(adjusted.protectedSession.title, original.protectedSession.title);
});

test("Because updates after adjustment", () => {
  const original = generateToday(sampleRyanContext);
  const alternative = buildAdjustAlternatives(original)[0];

  assert.ok(alternative);

  const adjusted = generateToday(sampleRyanContext, { preferredDecisionId: alternative.sourceDecisionId });
  const originalBecause = buildBecausePresentation(original);
  const adjustedBecause = buildBecausePresentation(adjusted);

  assert.notEqual(adjustedBecause.explanation, originalBecause.explanation);
  assert.match(adjustedBecause.explanation, new RegExp(adjusted.protectedSession.protects));
});

test("confidence updates after adjustment", () => {
  const original = generateToday(sampleRyanContext);
  const alternative = buildAdjustAlternatives(original)[0];

  assert.ok(alternative);

  const adjusted = generateToday(sampleRyanContext, { preferredDecisionId: alternative.sourceDecisionId });

  assert.notEqual(adjusted.confidenceByOutput.now.score, original.confidenceByOutput.now.score);
});

test("Restore returns to original recommendation", () => {
  const original = generateToday(sampleRyanContext);
  const alternative = buildAdjustAlternatives(original)[0];

  assert.ok(alternative);

  const adjusted = generateToday(sampleRyanContext, { preferredDecisionId: alternative.sourceDecisionId });
  const restored = generateToday(sampleRyanContext);

  assert.notEqual(adjusted.selectedDecisions.now.id, restored.selectedDecisions.now.id);
  assert.equal(restored.selectedDecisions.now.id, original.selectedDecisions.now.id);
  assert.equal(restored.protectedSession.title, original.protectedSession.title);
});

test("missing alternatives are handled safely", () => {
  const original = generateToday(sampleRyanContext);
  const withoutAlternatives = {
    ...original,
    candidateDecisions: [original.selectedDecisions.now],
    selectedDecisions: {
      ...original.selectedDecisions,
      now: {
        ...original.selectedDecisions.now,
        competingDecisionIds: []
      }
    }
  };

  assert.deepEqual(buildAdjustAlternatives(withoutAlternatives), []);
});
