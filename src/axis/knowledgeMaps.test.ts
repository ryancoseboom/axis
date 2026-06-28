import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import {
  applyPracticeEntryToKnowledgeState,
  generateKnowledgeDevelopmentSignals,
  neglectedConcepts,
  nextConcepts,
  prerequisiteConcepts,
  relatedConcepts,
  reviewConcepts
} from "./knowledgeMaps";
import { morningInputToUserContext } from "./morningInput";
import { recordPracticeEntry, recordPracticeEntryInMemory, samplePillars } from "./pillars";
import { completeProgramSession, sampleWeightliftingProgram } from "./programs";
import type { KnowledgeMap, PillarMemory, PracticeEntry } from "./types";

function bjjMap(): KnowledgeMap {
  const map = samplePillars.find((pillar) => pillar.id === "pillar-bjj")?.knowledgeMap;
  assert.ok(map);
  return map;
}

function armBarEntry(date = "2026-06-25"): PracticeEntry {
  return recordPracticeEntry({
    pillarId: "pillar-bjj",
    date,
    title: "Practiced Arm Bar",
    topics: ["topic-arm-bar"],
    confidence: 6,
    familiarity: 5
  });
}

function memoryWithEntry(entry: PracticeEntry): PillarMemory {
  const memory = { pillars: samplePillars, practiceEntries: [entry] };
  return { ...memory, knowledgeStates: applyPracticeEntryToKnowledgeState(memory, entry) };
}

test("Knowledge Map relationship traversal finds related concepts", () => {
  const related = relatedConcepts(bjjMap(), "knowledge-bjj-arm-bar");

  assert.ok(related.some((item) => item.node.concept.name === "Triangle"));
  assert.ok(related.some((item) => item.node.concept.name === "Closed Guard"));
});

test("Knowledge Map prerequisite traversal finds prerequisites", () => {
  const prerequisites = prerequisiteConcepts(bjjMap(), "knowledge-bjj-arm-bar");

  assert.deepEqual(prerequisites.map((item) => item.node.concept.name), ["Closed Guard"]);
});

test("Knowledge Map next concepts use deterministic follow-up relationships", () => {
  const next = nextConcepts(bjjMap(), "knowledge-bjj-guard-retention");

  assert.deepEqual(next.map((item) => item.node.concept.name), ["Back Takes"]);
});

test("PracticeEntry updates KnowledgeState without scores", () => {
  const memory = memoryWithEntry(armBarEntry());
  const armBar = memory.knowledgeStates?.find((state) => state.nodeId === "knowledge-bjj-arm-bar");
  const triangle = memory.knowledgeStates?.find((state) => state.nodeId === "knowledge-bjj-triangle");
  const closedGuard = memory.knowledgeStates?.find((state) => state.nodeId === "knowledge-bjj-closed-guard");

  assert.equal(armBar?.status, "practiced");
  assert.equal(armBar?.reviewAfterDate, "2026-06-27");
  assert.equal(triangle?.status, "introduced");
  assert.equal(closedGuard?.status, "developing");
  assert.equal(Object.hasOwn(armBar ?? {}, "score"), false);
});

test("recording practice into memory updates KnowledgeState", () => {
  const memory = recordPracticeEntryInMemory({ pillars: samplePillars, practiceEntries: [] }, {
    pillarId: "pillar-bjj",
    date: "2026-06-25",
    title: "Practiced Arm Bar",
    topics: ["topic-arm-bar"]
  });

  assert.equal(memory.practiceEntries.length, 1);
  assert.ok(memory.knowledgeStates?.some((state) => state.nodeId === "knowledge-bjj-arm-bar" && state.status === "practiced"));
});

test("review concepts return nodes whose review window is due", () => {
  const memory = memoryWithEntry(armBarEntry("2026-06-25"));
  const reviews = reviewConcepts(bjjMap(), memory.knowledgeStates ?? [], "2026-06-27");

  assert.ok(reviews.some((node) => node.concept.name === "Arm Bar"));
});

test("neglected concepts return unseen or stale nodes", () => {
  const memory = memoryWithEntry(armBarEntry("2026-06-01"));
  const neglected = neglectedConcepts(bjjMap(), memory.knowledgeStates ?? [], "2026-06-20");

  assert.ok(neglected.some((node) => node.concept.name === "Arm Bar"));
  assert.ok(neglected.some((node) => node.concept.name === "Guard Retention"));
});

test("Knowledge Maps generate DevelopmentSignals", () => {
  const signals = generateKnowledgeDevelopmentSignals(memoryWithEntry(armBarEntry()), "2026-06-27");

  assert.ok(signals.some((signal) => signal.title === "Train Triangle"));
  assert.ok(signals.some((signal) => signal.title === "Review Arm Bar"));
});

test("DevelopmentSignals can originate from Knowledge Maps and enter the Decision Graph", () => {
  const memory = memoryWithEntry(armBarEntry());
  const signals = generateKnowledgeDevelopmentSignals(memory, "2026-06-27");
  const today = generateToday({
    ...morningInputToUserContext({ mainIntention: "Make practice smarter" }),
    pillarMemory: { ...memory, developmentSignals: signals }
  });

  assert.ok(signals.some((signal) => signal.id.startsWith("signal-knowledge-")));
  assert.ok(today.candidateDecisions.some((candidate) => candidate.title === "Train Triangle"));
  assert.ok(today.decisionGraph.nodes.some((node) => node.id.includes("signal-knowledge")));
});

test("Programs determine sequence while Knowledge Maps suggest related concepts", () => {
  const result = completeProgramSession({
    pillars: samplePillars,
    practiceEntries: [],
    programs: [sampleWeightliftingProgram],
    completedProgramSessions: []
  }, {
    programId: sampleWeightliftingProgram.id,
    programDayId: "program-day-pull-back",
    date: "2026-06-28",
    movementsCompleted: ["movement-seated-cable-row"],
    setsCompleted: 3
  });
  const healthStates = result.memory.knowledgeStates ?? [];

  assert.equal(result.progression.currentDay.name, "Push - shoulders");
  assert.ok(healthStates.some((state) => state.nodeId === "knowledge-lift-back" && state.status === "practiced"));
  assert.ok(healthStates.some((state) => state.nodeId === "knowledge-lift-cable-row" && state.status === "practiced"));
});
