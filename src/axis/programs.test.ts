import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { morningInputToUserContext } from "./morningInput";
import { generateDevelopmentSignals, samplePillars } from "./pillars";
import {
  completeProgramSession,
  generateProgramDevelopmentSignals,
  getCurrentProgramDay,
  recommendMovementsForProgramDay,
  recordCompletedProgramSession,
  sampleWeightliftingProgram
} from "./programs";
import type { CompletedProgramSession, PillarMemory } from "./types";

const equipment = ["dumbbells", "cable machine", "Smith machine", "barbell", "plates"];

function session(dayId: string, date: string, movementsCompleted: string[] = []): CompletedProgramSession {
  return recordCompletedProgramSession({
    programId: sampleWeightliftingProgram.id,
    programDayId: dayId,
    date,
    movementsCompleted,
    setsCompleted: 12
  });
}

function programMemory(completedProgramSessions: CompletedProgramSession[] = []): PillarMemory {
  return {
    pillars: samplePillars,
    practiceEntries: [],
    programs: [sampleWeightliftingProgram],
    completedProgramSessions
  };
}

test("no history starts at first day", () => {
  const progression = getCurrentProgramDay(sampleWeightliftingProgram, []);

  assert.equal(progression.currentDay.name, "Pull - biceps");
  assert.equal(progression.nextDay.name, "Push - chest");
});

test("completed sessions determine next day", () => {
  const progression = getCurrentProgramDay(sampleWeightliftingProgram, [session("program-day-pull-biceps", "2026-06-27")]);

  assert.equal(progression.currentDay.name, "Push - chest");
  assert.equal(progression.nextDay.name, "Pull - back");
});

test("program cycle advances correctly", () => {
  const sessions = [
    session("program-day-pull-biceps", "2026-06-23"),
    session("program-day-push-chest", "2026-06-24"),
    session("program-day-pull-back", "2026-06-25")
  ];
  const progression = getCurrentProgramDay(sampleWeightliftingProgram, sessions);

  assert.equal(progression.currentDay.name, "Push - shoulders");
});

test("cycle repeats after Legs", () => {
  const progression = getCurrentProgramDay(sampleWeightliftingProgram, [session("program-day-legs", "2026-06-27")]);

  assert.equal(progression.currentDay.name, "Pull - biceps");
});

test("movement recommendations return 4 movements", () => {
  const day = sampleWeightliftingProgram.days.find((item) => item.id === "program-day-pull-back");
  assert.ok(day);

  const movements = recommendMovementsForProgramDay(day, [], { availableEquipment: equipment });

  assert.equal(movements.length, 4);
  assert.ok(movements.every((movement) => movement.tags.includes("back") || movement.primaryFocus.includes("back") || movement.primaryFocus === "lats"));
});

test("cautioned movements can be avoided", () => {
  const day = sampleWeightliftingProgram.days.find((item) => item.id === "program-day-pull-biceps");
  assert.ok(day);

  const movements = recommendMovementsForProgramDay(day, [], {
    availableEquipment: equipment,
    activeCautionTags: ["hammer-curl", "elbow-irritation"]
  });

  assert.equal(movements.length, 4);
  assert.ok(movements.every((movement) => movement.id !== "movement-hammer-curl"));
});

test("equipment constraints are respected", () => {
  const day = sampleWeightliftingProgram.days.find((item) => item.id === "program-day-legs");
  assert.ok(day);

  const movements = recommendMovementsForProgramDay(day, [], { availableEquipment: ["dumbbells"] });

  assert.ok(movements.length > 0);
  assert.ok(movements.every((movement) => movement.equipment.length === 0 || movement.equipment.includes("dumbbells")));
});

test("completed session records program work", () => {
  const completed = session("program-day-push-chest", "2026-06-27", ["movement-db-bench", "movement-cable-fly"]);

  assert.equal(completed.programId, sampleWeightliftingProgram.id);
  assert.equal(completed.setsCompleted, 12);
  assert.deepEqual(completed.movementsCompleted, ["movement-db-bench", "movement-cable-fly"]);
});

test("weightlifting program creates DevelopmentSignal", () => {
  const signals = generateProgramDevelopmentSignals(programMemory([session("program-day-pull-biceps", "2026-06-27")]), "2026-06-28");

  assert.equal(signals[0]?.title, "Today's lift: Push - chest, 4 movements, 3 sets each");
  assert.equal(signals[0]?.pillarId, "pillar-lifting");
  assert.equal(signals[0]?.type, "continue_thread");
});

test("program signals are included in Pillar Intelligence", () => {
  const signals = generateDevelopmentSignals(programMemory([session("program-day-push-chest", "2026-06-27")]), "2026-06-28");

  assert.ok(signals.some((signalItem) => signalItem.title.includes("Pull - back")));
});

test("Decision Graph can consume the program signal", () => {
  const memory = programMemory([session("program-day-push-chest", "2026-06-27")]);
  const signals = generateDevelopmentSignals(memory, "2026-06-28");
  const today = generateToday({
    ...morningInputToUserContext({ mainIntention: "Keep the day honest" }),
    pillarMemory: { ...memory, developmentSignals: signals }
  });

  assert.ok(today.candidateDecisions.some((candidate) => candidate.title.includes("Pull - back")));
  assert.ok(today.candidateDecisions.some((candidate) => candidate.protects === "Lifting"));
});


test("completeProgramSession advances Pull - biceps to Push - chest", () => {
  const result = completeProgramSession(programMemory(), {
    programId: sampleWeightliftingProgram.id,
    programDayId: "program-day-pull-biceps",
    date: "2026-06-28",
    movementsCompleted: ["movement-cable-curl", "movement-incline-db-curl"],
    setsCompleted: 6,
    notes: "Short completion path.",
    perceivedEffort: "medium"
  });

  assert.equal(result.progression.currentDay.name, "Push - chest");
  assert.equal(result.progression.nextDay.name, "Pull - back");
});

test("completeProgramSession records completed movements and sets", () => {
  const result = completeProgramSession(programMemory(), {
    programId: sampleWeightliftingProgram.id,
    programDayId: "program-day-pull-biceps",
    date: "2026-06-28",
    movementsCompleted: ["movement-cable-curl", "movement-preacher-curl"],
    setsCompleted: 6
  });

  assert.deepEqual(result.session.movementsCompleted, ["movement-cable-curl", "movement-preacher-curl"]);
  assert.equal(result.session.setsCompleted, 6);
  assert.equal(result.memory.completedProgramSessions?.length, 1);
});

test("completed program session creates a practice entry and updates DevelopmentSignal", () => {
  const result = completeProgramSession(programMemory(), {
    programId: sampleWeightliftingProgram.id,
    programDayId: "program-day-pull-biceps",
    date: "2026-06-28",
    movementsCompleted: ["movement-cable-curl"],
    setsCompleted: 3
  });

  assert.equal(result.practiceEntry.pillarId, "pillar-lifting");
  assert.equal(result.practiceEntry.title, "Completed Pull - biceps.");
  assert.ok(result.developmentSignals.some((signal) => signal.title.includes("Push - chest")));
  assert.ok(result.memory.developmentSignals?.some((signal) => signal.title.includes("Push - chest")));
});

test("Today can recommend next program day after completion", () => {
  const result = completeProgramSession(programMemory(), {
    programId: sampleWeightliftingProgram.id,
    programDayId: "program-day-pull-biceps",
    date: "2026-06-28",
    movementsCompleted: ["movement-cable-curl", "movement-incline-db-curl"],
    setsCompleted: 6
  });
  const signals = generateDevelopmentSignals(result.memory, "2026-06-29");
  const today = generateToday({
    ...morningInputToUserContext({ mainIntention: "Protect the strongest thread" }),
    pillarMemory: { ...result.memory, developmentSignals: signals }
  });

  assert.ok(today.candidateDecisions.some((candidate) => candidate.title.includes("Push - chest")));
  assert.ok(today.candidateDecisions.some((candidate) => candidate.protects === "Lifting"));
});

test("partial program completion input falls back safely", () => {
  const result = completeProgramSession(programMemory(), {
    programId: sampleWeightliftingProgram.id,
    programDayId: "program-day-pull-biceps",
    date: "2026-06-28"
  });

  assert.deepEqual(result.session.movementsCompleted, []);
  assert.equal(result.session.setsCompleted, 0);
  assert.equal(result.progression.currentDay.name, "Push - chest");
  assert.ok(result.developmentSignals.length > 0);
});
