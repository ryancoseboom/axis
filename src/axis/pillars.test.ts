import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { morningInputToUserContext } from "./morningInput";
import {
  buildReviewSchedule,
  generateDevelopmentSignals,
  recordPracticeEntry,
  samplePillars
} from "./pillars";
import type { PillarMemory } from "./types";

function bjjArmBarMemory(date = "2026-06-25"): PillarMemory {
  const entry = recordPracticeEntry({
    pillarId: "pillar-bjj",
    date,
    title: "Trained arm bars from closed guard.",
    notes: "Worked posture break, entries, and finishing mechanics.",
    topics: ["topic-arm-bar", "topic-closed-guard"],
    intensity: "medium",
    confidence: 6,
    familiarity: 5
  });

  return { pillars: samplePillars, practiceEntries: [entry] };
}

test("practice entries are recorded", () => {
  const entry = recordPracticeEntry({
    pillarId: "pillar-bjj",
    date: "2026-06-27",
    title: "Trained arm bars from closed guard.",
    topics: ["topic-arm-bar"]
  });

  assert.equal(entry.pillarId, "pillar-bjj");
  assert.equal(entry.source, "manual");
  assert.deepEqual(entry.topics, ["topic-arm-bar"]);
});

test("Pillars no longer carry legacy SkillRelationship domains", () => {
  assert.ok(samplePillars.every((pillar) => !Object.hasOwn(pillar, "domains")));
  assert.ok(samplePillars.every((pillar) => Object.hasOwn(pillar, "knowledgeMap")));
});

test("BJJ arm bar entry creates related triangle choke signal", () => {
  const memory = bjjArmBarMemory();
  const signals = generateDevelopmentSignals(memory, "2026-06-27");
  const triangle = signals.find((signal) => signal.title === "Train Triangle");

  assert.ok(triangle);
  assert.ok(triangle.id.startsWith("signal-knowledge-"));
  assert.equal(triangle.pillarId, "pillar-bjj");
  assert.equal(triangle.type, "related_technique");
  assert.ok(triangle.topicIds.includes("knowledge-bjj-triangle"));
});

test("arm bar creates future review signal", () => {
  const memory = bjjArmBarMemory("2026-06-25");
  const signals = generateDevelopmentSignals(memory, "2026-06-27");
  const review = signals.find((signal) => signal.type === "review" && signal.topicIds.includes("knowledge-bjj-arm-bar"));

  assert.ok(review);
  assert.ok(review.id.startsWith("signal-knowledge-"));
  assert.equal(review.title, "Review Arm Bar");
  assert.equal(review.dueDate, "2026-06-27");
});

test("overdue review is detected", () => {
  const memory = bjjArmBarMemory("2026-06-01");
  const signals = generateDevelopmentSignals(memory, "2026-06-20");
  const overdue = signals.find((signal) => signal.type === "overdue_review" && signal.topicIds.includes("knowledge-bjj-arm-bar"));

  assert.ok(overdue);
  assert.ok(overdue.id.startsWith("signal-knowledge-"));
  assert.equal(overdue.title, "Review overdue Arm Bar");
});

test("review schedule includes two simple review windows", () => {
  const [entry] = bjjArmBarMemory("2026-06-25").practiceEntries;
  const schedule = buildReviewSchedule(entry, "2026-06-27");

  assert.equal(schedule[0]?.firstReviewDate, "2026-06-27");
  assert.equal(schedule[0]?.secondReviewDate, "2026-07-09");
});

test("neglected pillar can generate a signal", () => {
  const memory = bjjArmBarMemory("2026-06-25");
  const signals = generateDevelopmentSignals(memory, "2026-06-27");

  assert.ok(signals.some((signal) => signal.type === "balance_neglected_pillar" && signal.pillarId === "pillar-music"));
});

test("DevelopmentSignals enter the Decision Graph as opportunities", () => {
  const memory = bjjArmBarMemory("2026-06-25");
  const signals = generateDevelopmentSignals(memory, "2026-06-27");
  const context = {
    ...morningInputToUserContext({ mainIntention: "Protect the best work" }),
    pillarMemory: { ...memory, developmentSignals: signals }
  };
  const today = generateToday(context);

  assert.ok(today.candidateDecisions.some((candidate) => candidate.title === "Train Triangle"));
  assert.ok(today.decisionGraph.nodes.some((node) => node.id.includes("opportunity-development-signal-knowledge")));
});

test("Today can be generated using pillar signals", () => {
  const memory = bjjArmBarMemory("2026-06-25");
  const signals = generateDevelopmentSignals(memory, "2026-06-27");
  const today = generateToday({
    ...morningInputToUserContext({ mainIntention: "Make one thing better" }),
    pillarMemory: { ...memory, developmentSignals: signals }
  });

  assert.ok(today.timeline.length > 0);
  assert.ok(today.confidence >= 0 && today.confidence <= 100);
  assert.ok(today.candidateDecisions.some((candidate) => candidate.protects === "BJJ"));
});
