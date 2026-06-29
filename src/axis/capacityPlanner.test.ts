import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisionGraph } from "./decisionGraph";
import { gatherFacts, generateToday } from "./engine";
import { sampleRyanContext } from "./sampleRyanContext";
import {
  calculateWeeklyCapacity,
  capacityPlanToDecisionGraphFacts,
  isOverloadedWeek,
  remainingWeeklyCapacity,
  underSupportedPillars,
  type WeeklyPlan
} from "./capacityPlanner";

function basePlan(overrides: Partial<WeeklyPlan> = {}): WeeklyPlan {
  return {
    id: "week-2026-06-29",
    weekStart: "2026-06-29",
    capacity: {
      weekStart: "2026-06-29",
      totalMinutes: 1200,
      reserveMinutes: 120
    },
    fixedCommitments: [
      {
        id: "fixed-bjj-class",
        kind: "fixed",
        title: "BJJ class",
        pillarId: "pillar-bjj",
        day: "Tuesday",
        start: "18:00",
        end: "19:30",
        durationMinutes: 90,
        travelMinutes: 30,
        physicalLoad: "high"
      }
    ],
    flexibleCommitments: [
      {
        id: "flex-errands",
        kind: "flexible",
        title: "Errands",
        preferredDays: ["Friday"],
        movable: true,
        durationMinutes: 60,
        cognitiveLoad: "low"
      }
    ],
    plannedSessions: [
      {
        id: "session-music-writing",
        kind: "planned_session",
        title: "Music writing",
        pillarId: "pillar-music",
        durationMinutes: 90,
        cognitiveLoad: "high",
        momentumValue: 8
      },
      {
        id: "session-lifting-pull",
        kind: "planned_session",
        title: "Pull day",
        pillarId: "pillar-lifting",
        durationMinutes: 60,
        physicalLoad: "medium",
        momentumValue: 7
      }
    ],
    momentumRequirements: [
      { pillarId: "pillar-bjj", pillarName: "BJJ", minimumSessions: 1, minimumMinutes: 90 },
      { pillarId: "pillar-music", pillarName: "Music", minimumSessions: 2, minimumMinutes: 180 },
      { pillarId: "pillar-lifting", pillarName: "Lifting", minimumSessions: 1, minimumMinutes: 60 }
    ],
    ...overrides
  };
}

test("fixed commitments reduce available capacity", () => {
  const summary = calculateWeeklyCapacity(basePlan());

  assert.equal(summary.fixedCommitmentMinutes, 120);
  assert.equal(summary.availableAfterFixedMinutes, 960);
});

test("flexible commitments remain movable", () => {
  const summary = calculateWeeklyCapacity(basePlan());

  assert.equal(summary.flexibleCommitmentMinutes, 60);
  assert.deepEqual(summary.movableCommitments.map((item) => item.id), ["flex-errands"]);
  assert.equal(summary.movableCommitments[0]?.movable, true);
});

test("remaining weekly capacity includes fixed, flexible, planned, and reserve load", () => {
  const plan = basePlan();
  const summary = calculateWeeklyCapacity(plan);

  assert.equal(summary.plannedSessionMinutes, 150);
  assert.equal(summary.remainingCapacityMinutes, 750);
  assert.equal(remainingWeeklyCapacity(plan), 750);
});

test("overloaded week detection is deterministic", () => {
  const plan = basePlan({
    capacity: { weekStart: "2026-06-29", totalMinutes: 240, reserveMinutes: 60 }
  });

  assert.equal(isOverloadedWeek(plan), true);
  assert.equal(calculateWeeklyCapacity(plan).remainingCapacityMinutes, -150);
});

test("momentum requirements identify under-supported pillars", () => {
  const unsupported = underSupportedPillars(basePlan());

  assert.deepEqual(unsupported.map((pillar) => pillar.pillarName), ["Music"]);
  assert.equal(unsupported.find((pillar) => pillar.pillarName === "Music")?.missingMinutes, 90);
});

test("planner facts enter the Decision Graph as constraints and resources", () => {
  const plan = basePlan({
    capacity: { weekStart: "2026-06-29", totalMinutes: 240, reserveMinutes: 60 }
  });
  const plannerFacts = capacityPlanToDecisionGraphFacts(plan);
  const facts = gatherFacts({
    ...sampleRyanContext,
    constraints: [...sampleRyanContext.constraints, ...plannerFacts.constraints],
    resources: [...sampleRyanContext.resources, ...plannerFacts.resources],
    systems: [...sampleRyanContext.systems, ...plannerFacts.systems]
  });
  const graph = buildDecisionGraph(facts);

  assert.ok(graph.nodes.some((node) => node.id === "constraint-constraint-weekly-capacity-overloaded"));
  assert.ok(graph.nodes.some((node) => node.id === "constraint-resource-resource-weekly-capacity"));
});

test("Today can be generated with Capacity Planner facts present", () => {
  const plannerFacts = capacityPlanToDecisionGraphFacts(basePlan());
  const today = generateToday({
    ...sampleRyanContext,
    constraints: [...sampleRyanContext.constraints, ...plannerFacts.constraints],
    resources: [...sampleRyanContext.resources, ...plannerFacts.resources],
    systems: [...sampleRyanContext.systems, ...plannerFacts.systems]
  });

  assert.ok(today.decisionGraph.nodes.some((node) => node.id === "constraint-constraint-weekly-capacity-remaining"));
  assert.ok(today.timeline.length > 0);
});
