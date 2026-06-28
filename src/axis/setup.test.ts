import assert from "node:assert/strict";
import test from "node:test";
import { createDomainModelCatalog } from "./domainCatalog";
import { generateToday } from "./engine";
import {
  buildUserContextFromSetup,
  sampleRyanSetup,
  validateSetupState
} from "./setup";
import type { SetupState } from "./setup";

function minimalSetup(): SetupState {
  return {
    userProfile: { name: "Casey" },
    identityProfile: {
      desiredIdentityStatement: "Become steady and clear.",
      values: ["Reality wins"],
      longTermAspirations: ["Build a durable creative life"],
      nonNegotiables: ["Protect sleep"]
    },
    pillars: [
      {
        name: "Health",
        description: "Protect energy and recovery.",
        priority: 7
      }
    ],
    calendar: {
      preferredProvider: "manual",
      importStatus: "placeholder"
    }
  };
}

test("setup state validates with minimal data", () => {
  const result = validateSetupState(minimalSetup());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("setup state validation reports missing foundational data", () => {
  const setup = minimalSetup();
  setup.userProfile.name = "";
  setup.identityProfile.desiredIdentityStatement = "";
  setup.pillars[0].priority = 11;

  const result = validateSetupState(setup);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === "missing_user_name"));
  assert.ok(result.errors.some((error) => error.code === "missing_identity"));
  assert.ok(result.errors.some((error) => error.code === "invalid_pillar_priority"));
});

test("setup state can include multiple pillars", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);

  assert.ok(context.pillarMemory);
  assert.ok(context.pillarMemory.pillars.length >= 5);
  assert.ok(context.pillarMemory.pillars.some((pillar) => pillar.name === "BJJ"));
  assert.ok(context.pillarMemory.pillars.some((pillar) => pillar.name === "Axis"));
});

test("BJJ level and profile maps into pillar and domain data", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const bjj = context.pillarMemory?.pillars.find((pillar) => pillar.name === "BJJ");

  assert.ok(bjj);
  assert.equal(bjj.priority, 8);
  assert.ok(bjj.knowledgeMap.name.includes("Brazilian Jiu-Jitsu"));
  assert.ok(bjj.knowledgeMap.nodes.some((node) => node.concept.name === "Arm Bar"));
  assert.ok(context.constraints.some((constraint) => constraint.description.includes("joint irritation")));
  assert.ok(context.missions.some((mission) => mission.currentNeed.includes("advanced")));
});

test("setup attaches BJJ DomainModel from catalog", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const bjj = context.pillarMemory?.pillars.find((pillar) => pillar.name === "BJJ");

  assert.equal(bjj?.knowledgeMap.name, "Brazilian Jiu-Jitsu Knowledge Map");
  assert.ok(bjj?.knowledgeMap.nodes.some((node) => node.concept.name === "Triangle Choke"));
  assert.ok(bjj?.knowledgeMap.edges.some((edge) => edge.type === "related_to"));
});

test("setup DomainModel alias lookup works", () => {
  const setup = {
    ...minimalSetup(),
    pillars: [
      {
        name: "BJJ",
        description: "Develop jiu-jitsu.",
        priority: 8,
        domainProfile: {
          domainName: "BJJ",
          currentLevel: "intermediate",
          aliases: ["Brazilian Jiu-Jitsu"]
        }
      }
    ]
  };
  const context = buildUserContextFromSetup(setup);
  const bjj = context.pillarMemory?.pillars[0];

  assert.equal(bjj?.knowledgeMap.name, "Brazilian Jiu-Jitsu Knowledge Map");
  assert.ok(bjj?.knowledgeMap.nodes.some((node) => node.concept.name === "Arm Bar"));
});

test("weightlifting program setup maps into Program data", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const program = context.pillarMemory?.programs?.find((item) => item.name === "5-day weightlifting cycle");

  assert.ok(program);
  assert.equal(program.status, "active");
  assert.equal(program.days.length, 5);
  assert.equal(program.days[0]?.name, "Pull - biceps");
  assert.ok(program.days[2]?.movementOptions.some((movement) => movement.name === "seated cable row"));
});

test("Weightlifting setup attaches DomainModel from catalog", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const health = context.pillarMemory?.pillars.find((pillar) => pillar.name === "Health");

  assert.equal(health?.knowledgeMap.name, "Weightlifting Knowledge Map");
  assert.ok(health?.knowledgeMap.nodes.some((node) => node.concept.name === "Cable Row"));
});

test("missing DomainModel falls back safely", () => {
  const setup = minimalSetup();
  setup.pillars[0] = {
    name: "Wine",
    description: "Learn wine calmly.",
    priority: 5,
    domainProfile: {
      domainName: "Wine",
      currentLevel: "beginner",
      knownConcepts: ["Grapes", "Regions"]
    }
  };
  const context = buildUserContextFromSetup(setup, { domainCatalog: createDomainModelCatalog() });
  const wine = context.pillarMemory?.pillars[0];

  assert.equal(wine?.knowledgeMap.name, "Wine Knowledge Map");
  assert.deepEqual(wine?.knowledgeMap.nodes.map((node) => node.concept.name), ["Grapes", "Regions"]);
});

test("user rank and constraints are preserved when DomainModel attaches", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);

  assert.ok(context.missions.some((mission) => mission.name === "Develop BJJ" && mission.currentNeed.includes("advanced")));
  assert.ok(context.constraints.some((constraint) => constraint.description.includes("joint irritation")));
});

test("BJJ purple belt initializes foundational concepts", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const states = context.pillarMemory?.knowledgeStates ?? [];

  assert.ok(states.some((state) => state.nodeId === "knowledge-bjj-closed-guard" && ["developing", "practiced", "confident"].includes(state.status)));
});

test("recent arm bar history marks Arm Bar practiced", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const states = context.pillarMemory?.knowledgeStates ?? [];

  assert.ok(states.some((state) => state.nodeId === "knowledge-bjj-arm-bar" && state.status === "practiced"));
});

test("back takes goal marks Back Takes developing or introduced", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const states = context.pillarMemory?.knowledgeStates ?? [];

  assert.ok(states.some((state) => state.nodeId === "knowledge-bjj-back-takes" && ["introduced", "developing", "practiced"].includes(state.status)));
});

test("Weightlifting program initializes relevant concepts", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const states = context.pillarMemory?.knowledgeStates ?? [];

  assert.ok(states.some((state) => state.nodeId === "knowledge-health-pull" && ["introduced", "practiced", "developing"].includes(state.status)));
  assert.ok(states.some((state) => state.nodeId === "knowledge-health-biceps" && ["introduced", "practiced", "developing"].includes(state.status)));
  assert.ok(states.some((state) => state.nodeId === "knowledge-health-cable-row" && ["introduced", "practiced", "developing"].includes(state.status)));
});

test("recent Cable Row history marks Cable Row practiced", () => {
  const setup = {
    ...sampleRyanSetup,
    pillars: sampleRyanSetup.pillars.map((pillar) => pillar.name === "Health" ? {
      ...pillar,
      domainProfile: {
        domainName: pillar.domainProfile?.domainName ?? "Weightlifting",
        currentLevel: pillar.domainProfile?.currentLevel ?? "intermediate",
        aliases: pillar.domainProfile?.aliases,
        credentials: pillar.domainProfile?.credentials,
        knownConstraints: pillar.domainProfile?.knownConstraints,
        goals: pillar.domainProfile?.goals,
        knownConcepts: pillar.domainProfile?.knownConcepts,
        recentHistory: ["Completed seated cable row"]
      }
    } : pillar)
  };
  const context = buildUserContextFromSetup(setup);
  const states = context.pillarMemory?.knowledgeStates ?? [];

  assert.ok(states.some((state) => state.nodeId === "knowledge-health-cable-row" && state.status === "practiced"));
});

test("Music Halou profile initializes songwriting or production concepts", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const states = context.pillarMemory?.knowledgeStates ?? [];

  assert.ok(states.some((state) => state.nodeId === "knowledge-music-songwriting" && ["developing", "practiced", "confident"].includes(state.status)));
  assert.ok(states.some((state) => state.nodeId === "knowledge-music-production" && ["developing", "practiced", "confident"].includes(state.status)));
});

test("Axis setup initializes architecture concepts", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const states = context.pillarMemory?.knowledgeStates ?? [];

  assert.ok(states.some((state) => state.nodeId === "knowledge-axis-decision-graph" && ["developing", "practiced", "confident"].includes(state.status)));
  assert.ok(states.some((state) => state.nodeId === "knowledge-axis-domain-models" && ["developing", "practiced", "confident"].includes(state.status)));
  assert.ok(states.some((state) => state.nodeId === "knowledge-axis-knowledge-maps" && ["developing", "practiced", "confident"].includes(state.status)));
});

test("existing KnowledgeState is preserved unless setup infers a stronger state", () => {
  const context = buildUserContextFromSetup({
    ...sampleRyanSetup,
    knowledgeStates: [
      { nodeId: "knowledge-bjj-arm-bar", status: "confident", introducedDate: "2026-01-01" },
      { nodeId: "knowledge-bjj-triangle-choke", status: "never_seen" }
    ]
  });
  const states = context.pillarMemory?.knowledgeStates ?? [];
  const armBar = states.find((state) => state.nodeId === "knowledge-bjj-arm-bar");
  const triangle = states.find((state) => state.nodeId === "knowledge-bjj-triangle-choke");

  assert.equal(armBar?.status, "confident");
  assert.equal(armBar?.introducedDate, "2026-01-01");
  assert.equal(triangle?.status, "introduced");
});

test("calendar preference is captured without live integration", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);

  assert.equal(context.calendarContext?.dayStart, "08:00");
  assert.equal(context.calendarContext?.dayEnd, "18:00");
  assert.equal(context.calendarContext?.commitments.length, 0);
  assert.ok(context.constraints.some((constraint) => constraint.description.includes("import status is placeholder")));
});

test("buildUserContextFromSetup returns usable UserContext", () => {
  const context = buildUserContextFromSetup(minimalSetup());

  assert.equal(context.userName, "Casey");
  assert.equal(context.themeSeed, "Become steady and clear.");
  assert.equal(context.pillarMemory?.pillars[0]?.name, "Health");
  assert.ok(context.principles.some((principle) => principle.name === "Reality wins"));
});

test("Today can generate from sample setup context", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const today = generateToday(context);

  assert.ok(context.pillarMemory?.knowledgeStates?.length);
  assert.ok(today.timeline.length > 0);
  assert.ok(today.candidateDecisions.length > 0);
  assert.ok(today.confidence >= 0 && today.confidence <= 100);
});
