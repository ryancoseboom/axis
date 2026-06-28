import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { explainTodayOutput } from "./explainability";
import { morningInputToUserContext } from "./morningInput";
import { buildAdjustAlternatives, buildBecausePresentation } from "./todayPresentation";

test("editing inputs resets adjusted state safely", () => {
  const firstContext = morningInputToUserContext({
    mainIntention: "Write the hard section",
    commitments: ["10:30 meeting"]
  });
  const firstToday = generateToday(firstContext);
  const alternative = buildAdjustAlternatives(firstToday)[0];

  assert.ok(alternative);

  const adjusted = generateToday(firstContext, { preferredDecisionId: alternative.sourceDecisionId });
  const editedContext = morningInputToUserContext({
    mainIntention: "Record the rough demo",
    commitments: ["call from 2-3"]
  });
  const afterEdit = generateToday(editedContext);

  assert.notEqual(adjusted.selectedDecisions.now.id, firstToday.selectedDecisions.now.id);
  assert.equal(afterEdit.protectedSession.title, "Record the rough demo");
  assert.equal(afterEdit.selectedDecisions.now.id, afterEdit.selectedDecisions.protectedSession.id);
});

test("Begin mode target still works after generated input", () => {
  const today = generateToday(
    morningInputToUserContext({
      mainIntention: "Finish the outline",
      commitments: ["10:30 meeting"]
    })
  );

  assert.equal(today.protectedSession.title, "Finish the outline");
  assert.equal(today.protectedSession.preferredWindow.start, "08:45");
  assert.ok(today.protectedSession.protects);
});

test("Adjust still works after inferred focus", () => {
  const context = morningInputToUserContext({
    mainIntention: "Finish the outline",
    commitments: ["10:30 meeting"]
  });
  const today = generateToday(context);
  const alternative = buildAdjustAlternatives(today)[0];

  assert.ok(alternative);

  const adjusted = generateToday(context, { preferredDecisionId: alternative.sourceDecisionId });

  assert.equal(adjusted.selectedDecisions.now.id, alternative.sourceDecisionId);
  assert.notEqual(adjusted.protectedSession.title, today.protectedSession.title);
});

test("Restore still works after inferred focus", () => {
  const context = morningInputToUserContext({
    mainIntention: "Draft the essay",
    commitments: ["10:30 meeting"]
  });
  const original = generateToday(context);
  const alternative = buildAdjustAlternatives(original)[0];

  assert.ok(alternative);

  const adjusted = generateToday(context, { preferredDecisionId: alternative.sourceDecisionId });
  const restored = generateToday(context);

  assert.notEqual(adjusted.selectedDecisions.now.id, restored.selectedDecisions.now.id);
  assert.equal(restored.selectedDecisions.now.id, original.selectedDecisions.now.id);
  assert.equal(restored.protectedSession.title, "Draft the essay");
});

test("Because remains aligned after adjustment and restore", () => {
  const context = morningInputToUserContext({
    mainIntention: "Shape the chapter",
    commitments: ["10:30 meeting"]
  });
  const original = generateToday(context);
  const alternative = buildAdjustAlternatives(original)[0];

  assert.ok(alternative);

  const adjusted = generateToday(context, { preferredDecisionId: alternative.sourceDecisionId });
  const restored = generateToday(context);
  const adjustedBecause = buildBecausePresentation(adjusted).explanation;
  const restoredBecause = buildBecausePresentation(restored).explanation;
  const adjustedExplanation = explainTodayOutput(adjusted, { type: "now" }).conciseExplanation;
  const restoredExplanation = explainTodayOutput(restored, { type: "now" }).conciseExplanation;

  assert.equal(adjustedBecause, adjustedExplanation);
  assert.equal(restoredBecause, restoredExplanation);
  assert.match(adjustedBecause, new RegExp(adjusted.protectedSession.protects));
  assert.match(restoredBecause, new RegExp(restored.protectedSession.protects));
});

test("missing partial input does not break Today", () => {
  const today = generateToday(morningInputToUserContext({ commitments: ["something later"] }));

  assert.ok(today.theme.length > 0);
  assert.ok(today.protectedSession.title.length > 0);
  assert.ok(today.timeline.length > 0);
  assert.ok(today.confidence >= 0 && today.confidence <= 100);
});
