import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import {
  applyPracticeEntryToKnowledgeState,
  createInitialKnowledgeState,
  createKnowledgeMap,
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

test("createKnowledgeMap creates canonical nodes", () => {
  const map = createKnowledgeMap({
    pillarId: "pillar-test",
    concepts: [
      "Closed Guard",
      { name: "Arm Bar", description: "Arm isolation.", aliases: ["armbar"], sourceTopicIds: ["topic-arm-bar"] }
    ]
  });

  assert.equal(map.id, "knowledge-map-test");
  assert.equal(map.nodes[0]?.id, "knowledge-test-closed-guard");
  assert.equal(map.nodes[1]?.concept.aliases?.[0], "armbar");
  assert.equal(map.nodes[1]?.concept.sourceTopicIds?.[0], "topic-arm-bar");
});

test("createKnowledgeMap creates canonical edges", () => {
  const map = createKnowledgeMap({
    pillarId: "pillar-test",
    concepts: ["Arm Bar", "Triangle Choke"],
    relationships: [["Arm Bar", "related_to", "Triangle Choke"]]
  });

  assert.equal(map.edges[0]?.fromNodeId, "knowledge-test-arm-bar");
  assert.equal(map.edges[0]?.toNodeId, "knowledge-test-triangle-choke");
  assert.equal(map.edges[0]?.type, "related_to");
});

test("createKnowledgeMap accepts object relationships with descriptions", () => {
  const map = createKnowledgeMap({
    pillarId: "pillar-test",
    concepts: ["Decision Graph", "Explainability"],
    relationships: [{
      from: "Decision Graph",
      type: "part_of",
      to: "Explainability",
      description: "Explainability exposes Decision Graph reasoning."
    }]
  });

  assert.equal(map.edges[0]?.id, "knowledge-rel-decision-graph-part_of-explainability");
  assert.equal(map.edges[0]?.description, "Explainability exposes Decision Graph reasoning.");
});

test("createInitialKnowledgeState creates state from concept names", () => {
  const map = createKnowledgeMap({ pillarId: "pillar-test", concepts: ["Arm Bar"] });
  const states = createInitialKnowledgeState(map, [{ concept: "Arm Bar", status: "introduced", introducedDate: "2026-06-25" }]);

  assert.equal(states[0]?.nodeId, "knowledge-test-arm-bar");
  assert.equal(states[0]?.status, "introduced");
  assert.equal(states[0]?.introducedDate, "2026-06-25");
});

test("createInitialKnowledgeState rejects missing concepts", () => {
  const map = createKnowledgeMap({ pillarId: "pillar-test", concepts: ["Arm Bar"] });

  assert.throws(() => createInitialKnowledgeState(map, [{ concept: "Triangle", status: "introduced" }]), /missing concept/);
});

test("createInitialKnowledgeState rejects duplicate concepts", () => {
  const map = createKnowledgeMap({ pillarId: "pillar-test", concepts: ["Arm Bar"] });

  assert.throws(() => createInitialKnowledgeState(map, [
    { concept: "Arm Bar", status: "introduced" },
    { concept: "arm bar", status: "practiced" }
  ]), /Duplicate initial KnowledgeState concept/);
});

test("createKnowledgeMap rejects duplicate concept names", () => {
  assert.throws(() => createKnowledgeMap({ pillarId: "pillar-test", concepts: ["Arm Bar", "arm bar"] }), /Duplicate Knowledge Map concept/);
});

test("createKnowledgeMap rejects missing relationship targets", () => {
  assert.throws(() => createKnowledgeMap({
    pillarId: "pillar-test",
    concepts: ["Arm Bar"],
    relationships: [["Arm Bar", "related_to", "Triangle Choke"]]
  }), /missing concept/);
});

test("createKnowledgeMap rejects duplicate edges", () => {
  assert.throws(() => createKnowledgeMap({
    pillarId: "pillar-test",
    concepts: ["Arm Bar", "Triangle Choke"],
    relationships: [
      ["Arm Bar", "related_to", "Triangle Choke"],
      ["Arm Bar", "related_to", "Triangle Choke"]
    ]
  }), /Duplicate Knowledge Map edge/);
});

test("createKnowledgeMap rejects invalid relationship types", () => {
  assert.throws(() => createKnowledgeMap({
    pillarId: "pillar-test",
    concepts: ["Arm Bar", "Triangle Choke"],
    relationships: [["Arm Bar", "invalid_relationship" as never, "Triangle Choke"]]
  }), /Invalid Knowledge Map relationship type/);
});

test("sample maps use canonical KnowledgeMap structures", () => {
  const samples = ["pillar-porthos", "pillar-music", "pillar-bjj", "pillar-lifting"];

  for (const pillarId of samples) {
    const pillar = samplePillars.find((item) => item.id === pillarId);
    assert.ok(pillar);
    assert.equal(pillar.knowledgeMap.pillarId, pillar.id);
    assert.ok(pillar.knowledgeMap.nodes.every((node) => node.pillarId === pillar.id));
    assert.ok(pillar.knowledgeMap.nodes.every((node) => node.id.startsWith(`knowledge-${pillar.id.replace(/^pillar-/, "")}-`)));
    assert.ok(pillar.knowledgeMap.edges.every((edge) => pillar.knowledgeMap.nodes.some((node) => node.id === edge.fromNodeId)));
    assert.ok(pillar.knowledgeMap.edges.every((edge) => pillar.knowledgeMap.nodes.some((node) => node.id === edge.toNodeId)));
  }
});

test("sample maps preserve aliases and source topic ids through helpers", () => {
  const bjj = bjjMap();
  const armBar = bjj.nodes.find((node) => node.concept.name === "Arm Bar");
  const triangle = bjj.nodes.find((node) => node.concept.name === "Triangle");
  const lifting = samplePillars.find((pillar) => pillar.id === "pillar-lifting")?.knowledgeMap;
  const cableRow = lifting?.nodes.find((node) => node.concept.name === "Cable Row");

  assert.deepEqual(armBar?.concept.sourceTopicIds, ["topic-arm-bar"]);
  assert.deepEqual(triangle?.concept.aliases, ["Triangle Choke"]);
  assert.ok(cableRow?.concept.aliases?.includes("seated cable row"));
  assert.deepEqual(cableRow?.concept.sourceTopicIds, ["movement-seated-cable-row"]);
});

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
  assert.ok(healthStates.some((state) => state.nodeId === "knowledge-lifting-back" && state.status === "practiced"));
  assert.ok(healthStates.some((state) => state.nodeId === "knowledge-lifting-cable-row" && state.status === "practiced"));
});
