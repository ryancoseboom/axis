import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { morningInputToUserContext } from "./morningInput";
import { samplePillars } from "./pillars";
import { sampleWeightliftingProgram } from "./programs";
import { buildConfirmedSetupContext } from "./setupHandoff";
import { sampleRyanSetup } from "./setup";
import { buildTodayCapturedSummary, captureToday } from "./todayCaptured";
import type { PillarMemory, UserContext } from "./types";

function contextWithMemory(memory: PillarMemory): UserContext {
  return {
    ...morningInputToUserContext({ mainIntention: "Protect the strongest thread" }),
    pillarMemory: memory
  };
}

function baseMemory(): PillarMemory {
  return {
    pillars: samplePillars,
    practiceEntries: [],
    programs: [sampleWeightliftingProgram],
    completedProgramSessions: []
  };
}

test("completed lifting session advances program", () => {
  const result = captureToday({
    date: "2026-06-28",
    observations: [{
      type: "completed_program_session",
      title: "Completed Pull - biceps",
      pillarId: "pillar-lifting",
      programSession: {
        programId: sampleWeightliftingProgram.id,
        programDayId: "program-day-pull-biceps",
        movementsCompleted: ["movement-cable-curl"],
        setsCompleted: 3,
        perceivedEffort: "medium"
      }
    }]
  }, contextWithMemory(baseMemory()));

  const memory = result.context.pillarMemory;

  assert.equal(memory?.completedProgramSessions?.length, 1);
  assert.equal(memory?.practiceEntries[0]?.title, "Completed Pull - biceps.");
  assert.ok(memory?.developmentSignals?.some((signal) => signal.title.includes("Push - chest")));
  assert.ok(result.todayCaptured.outcomes.some((outcome) => outcome.type === "program_progressed"));
});

test("BJJ practice entry updates KnowledgeState", () => {
  const result = captureToday({
    date: "2026-06-28",
    observations: [{
      type: "practice_entry",
      title: "Practiced Arm Bar",
      pillarId: "pillar-bjj",
      practiceEntry: {
        pillarId: "pillar-bjj",
        topics: ["topic-arm-bar"],
        confidence: 6,
        familiarity: 5,
        intensity: "medium"
      }
    }]
  }, contextWithMemory({ pillars: samplePillars, practiceEntries: [] }));

  const memory = result.context.pillarMemory;

  assert.ok(memory?.practiceEntries.some((entry) => entry.title === "Practiced Arm Bar"));
  assert.ok(memory?.knowledgeStates?.some((state) => state.nodeId === "knowledge-bjj-arm-bar" && state.status === "practiced"));
  assert.ok(memory?.developmentSignals?.some((signal) => signal.title === "Train Triangle"));
});

test("missed session is captured without negative scoring", () => {
  const result = captureToday({
    date: "2026-06-28",
    observations: [{
      type: "missed_session",
      title: "BJJ class",
      pillarId: "pillar-bjj",
      missedSession: { pillarId: "pillar-bjj", title: "BJJ class" }
    }]
  }, contextWithMemory(baseMemory()));
  const summary = buildTodayCapturedSummary(result.todayCaptured);

  assert.equal(result.todayCaptured.observations[0]?.type, "missed_session");
  assert.ok(result.todayCaptured.outcomes.some((outcome) => outcome.description === "This is context for tomorrow, not a verdict."));
  assert.equal(JSON.stringify(result.todayCaptured).includes("score"), false);
  assert.equal(summary.whatWasMissed[0], "BJJ class did not happen today. That is useful context.");
});

test("recovery observation updates capacity context", () => {
  const result = captureToday({
    date: "2026-06-28",
    observations: [{
      type: "recovery",
      title: "Early recovery evening",
      notes: "Elbow and sleep need a quieter night.",
      recovery: { durationMinutes: 90, quality: "steady" }
    }]
  }, buildConfirmedSetupContext(sampleRyanSetup));

  assert.ok(result.context.constraints.some((constraint) => constraint.id.startsWith("constraint-recovery-")));
  assert.ok(result.context.resources.some((resource) => resource.id.startsWith("resource-recovery-")));
  assert.ok(result.context.systems.some((system) => system.id.startsWith("system-recovery-")));
  assert.ok(result.todayCaptured.outcomes.some((outcome) => outcome.type === "capacity_context_updated"));
});

test("captured summary is calm and nonjudgmental", () => {
  const result = captureToday({
    date: "2026-06-28",
    observations: [
      {
        type: "practice_entry",
        title: "Practiced Arm Bar",
        pillarId: "pillar-bjj",
        practiceEntry: { pillarId: "pillar-bjj", topics: ["topic-arm-bar"] }
      },
      {
        type: "missed_session",
        title: "Music block",
        pillarId: "pillar-music"
      },
      {
        type: "recovery",
        title: "Recovery walk",
        notes: "Low-key recovery."
      }
    ]
  }, contextWithMemory({ pillars: samplePillars, practiceEntries: [] }));
  const summary = buildTodayCapturedSummary(result.todayCaptured);
  const copy = [...summary.whatMovedForward, ...summary.whatWasMissed, ...summary.whatMayMatterTomorrow].join(" ").toLowerCase();

  assert.ok(summary.whatMovedForward.some((line) => line.includes("Practiced Arm Bar")));
  assert.ok(summary.whatWasMissed.some((line) => line.includes("useful context")));
  assert.ok(summary.whatMayMatterTomorrow.some((line) => line.includes("Future recommendations") || line.includes("Capacity context")));
  assert.equal(copy.includes("failed"), false);
  assert.equal(copy.includes("shame"), false);
  assert.equal(copy.includes("score"), false);
  assert.equal(copy.includes("streak"), false);
});

test("DevelopmentSignals update after capture", () => {
  const result = captureToday({
    date: "2026-06-28",
    observations: [{
      type: "practice_entry",
      title: "Practiced Arm Bar",
      pillarId: "pillar-bjj",
      practiceEntry: {
        pillarId: "pillar-bjj",
        topics: ["topic-arm-bar"]
      }
    }]
  }, contextWithMemory({ pillars: samplePillars, practiceEntries: [] }));

  assert.ok(result.context.pillarMemory?.developmentSignals?.some((signal) => signal.title === "Train Triangle"));
  assert.ok(result.todayCaptured.outcomes.some((outcome) => outcome.type === "signal_updated"));
});

test("Today can generate after captured observations", () => {
  const captured = captureToday({
    date: "2026-06-28",
    observations: [{
      type: "completed_program_session",
      title: "Completed Pull - biceps",
      pillarId: "pillar-lifting",
      programSession: {
        programId: sampleWeightliftingProgram.id,
        programDayId: "program-day-pull-biceps",
        movementsCompleted: ["movement-cable-curl"],
        setsCompleted: 3
      }
    }]
  }, contextWithMemory(baseMemory()));
  const today = generateToday(captured.context);

  assert.ok(today.timeline.length > 0);
  assert.ok(today.candidateDecisions.some((candidate) => candidate.title.includes("Push - chest")));
});
