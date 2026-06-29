import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { morningInputToUserContext } from "./morningInput";
import { generateDevelopmentSignals, samplePillars } from "./pillars";
import { recordCompletedProgramSession, sampleWeightliftingProgram } from "./programs";
import { sampleRyanContext } from "./sampleRyanContext";
import {
  buildTodayCaptureContext,
  clearTodayCaptureContext,
  getTodayCaptureContext,
  setTodayCaptureContext
} from "./todayCaptureContext";
import { buildTodayCapturedShellOptions } from "./todayCapturedShell";
import type { DevelopmentSignal, PillarMemory, UserContext } from "./types";

function contextWithSignals(signals: DevelopmentSignal[]): UserContext {
  return {
    ...morningInputToUserContext({ mainIntention: "Protect the strongest thread" }),
    pillarMemory: {
      pillars: samplePillars,
      practiceEntries: [],
      programs: [sampleWeightliftingProgram],
      completedProgramSessions: [],
      developmentSignals: signals
    }
  };
}

test("Today creates capture context", () => {
  const today = generateToday(sampleRyanContext);
  const context = buildTodayCaptureContext(today, sampleRyanContext, "sample");

  assert.equal(context.theme, today.theme);
  assert.equal(context.now.title, today.selectedDecisions.now.title);
  assert.equal(context.next.title, today.selectedDecisions.next.title);
  assert.equal(context.protectedSession.title, today.protectedSession.title);
  assert.equal(context.source, "sample");
});

test("capture shell reads selected Today context", () => {
  clearTodayCaptureContext();
  const today = generateToday(sampleRyanContext);
  const context = setTodayCaptureContext(buildTodayCaptureContext(today, sampleRyanContext, "sample"));

  assert.equal(getTodayCaptureContext(), context);
  assert.ok(buildTodayCapturedShellOptions().some((option) => option.selected));

  clearTodayCaptureContext();
});

test("lifting Today preselects lifting observations", () => {
  const memory: PillarMemory = {
    pillars: samplePillars,
    practiceEntries: [],
    programs: [sampleWeightliftingProgram],
    completedProgramSessions: [recordCompletedProgramSession({
      programId: sampleWeightliftingProgram.id,
      programDayId: "program-day-pull-biceps",
      date: "2026-06-27"
    })]
  };
  const signals = generateDevelopmentSignals(memory, "2026-06-28");
  const userContext = contextWithSignals(signals);
  const today = generateToday(userContext);
  const captureContext = buildTodayCaptureContext(today, userContext, "morning");
  const options = buildTodayCapturedShellOptions(captureContext);

  assert.ok(captureContext.relevantProgramRecommendation?.title.includes("Push - chest"));
  assert.ok(options.some((option) => option.action === "completed_lifting_session" && option.selected));
  assert.ok(options.some((option) => option.action === "missed_session" && option.selected));
});

test("BJJ Today preselects BJJ observation", () => {
  const userContext = contextWithSignals([{
    id: "signal-bjj-arm-bar",
    type: "related_technique",
    pillarId: "pillar-bjj",
    title: "Train Arm Bar",
    description: "Today includes BJJ practice.",
    topicIds: ["knowledge-bjj-arm-bar"],
    priority: 20,
    protects: "BJJ"
  }]);
  const today = generateToday(userContext);
  const options = buildTodayCapturedShellOptions(buildTodayCaptureContext(today, userContext, "morning"));

  assert.ok(options.some((option) => option.action === "bjj_practice_entry" && option.selected));
});

test("protected work preselects work block", () => {
  const userContext = morningInputToUserContext({ mainIntention: "Write the Porthos planning memo" });
  const today = generateToday(userContext);
  const options = buildTodayCapturedShellOptions(buildTodayCaptureContext(today, userContext, "morning"));

  assert.ok(options.some((option) => option.action === "work_block" && option.selected));
});

test("direct capture shell still works without context", () => {
  clearTodayCaptureContext();
  const options = buildTodayCapturedShellOptions();

  assert.ok(options.length > 0);
  assert.ok(options.every((option) => !option.selected));
});

test("clearing Today context prevents stale capture suggestions", () => {
  const today = generateToday(sampleRyanContext);
  setTodayCaptureContext(buildTodayCaptureContext(today, sampleRyanContext, "sample"));

  assert.ok(getTodayCaptureContext());

  clearTodayCaptureContext();

  assert.equal(getTodayCaptureContext(), undefined);
  assert.ok(buildTodayCapturedShellOptions().every((option) => !option.selected));
});
