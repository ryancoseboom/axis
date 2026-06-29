import assert from "node:assert/strict";
import test from "node:test";
import {
  attachDomainModelToPillar,
  attachDomainModelToPillarMemory,
  attachDomainModelToPillarWithState,
  createDomainModelCatalog,
  findDomainModel,
  getDomainModel,
  listDomainModels,
  registerDomainModel,
  internalAxisDevelopmentDomainModel,
  sampleBrazilianJiuJitsuDomainModel,
  sampleDomainModelCatalog,
  sampleWeightliftingDomainModel
} from "./domainCatalog";
import { compileDomainModel } from "./domainGeneration";
import { createKnowledgeMap } from "./knowledgeMaps";
import { recordPracticeEntry, samplePillars } from "./pillars";
import type { DomainModel } from "./domainGeneration";
import type { KnowledgeState, Pillar } from "./types";

function testPillar(): Pillar {
  return {
    id: "pillar-bjj",
    name: "BJJ",
    description: "Develop skill, composure, and technical depth in Brazilian jiu-jitsu.",
    priority: 8,
    identityWeight: 8,
    status: "active",
    knowledgeMap: createKnowledgeMap({
      pillarId: "pillar-bjj",
      concepts: [
        { name: "Arm Bar", description: "Existing arm bar concept." }
      ]
    })
  };
}

function renamedNodePillar(): Pillar {
  const pillar = testPillar();
  return {
    ...pillar,
    knowledgeMap: {
      ...pillar.knowledgeMap,
      nodes: [
        {
          id: "legacy-arm-bar-node",
          pillarId: "pillar-bjj",
          concept: {
            id: "concept-arm-bar",
            name: "Arm Bar",
            description: "Existing arm bar concept."
          }
        }
      ],
      edges: []
    }
  };
}

function generatedTinyBjjModel(): DomainModel {
  return compileDomainModel({
    metadata: {
      domainName: "Tiny BJJ",
      learnerLevel: "beginner",
      desiredBreadth: "narrow",
      createdBy: "axis"
    },
    concepts: [
      { id: "arm-bar", name: "Arm Bar", description: "Arm isolation." },
      { id: "triangle-choke", name: "Triangle Choke", description: "Leg choke." }
    ],
    relationships: [
      { fromConceptId: "arm-bar", type: "related_to", toConceptId: "triangle-choke", description: "Arm Bar and Triangle Choke connect from guard." }
    ]
  }, { pillarId: "pillar-bjj" });
}

test("DomainModel catalog registers models", () => {
  const catalog = registerDomainModel(createDomainModelCatalog(), sampleBrazilianJiuJitsuDomainModel);

  assert.equal(catalog.domainModels.length, 1);
  assert.equal(catalog.domainModels[0]?.id, "domain-brazilian-jiu-jitsu");
});

test("DomainModel catalog registration replaces models with the same id", () => {
  const updated = { ...sampleBrazilianJiuJitsuDomainModel, version: "2.0.0" };
  const catalog = registerDomainModel(createDomainModelCatalog([sampleBrazilianJiuJitsuDomainModel]), updated);

  assert.equal(catalog.domainModels.length, 1);
  assert.equal(catalog.domainModels[0]?.version, "2.0.0");
});

test("DomainModel catalog lists available models", () => {
  const summaries = listDomainModels(sampleDomainModelCatalog);

  assert.deepEqual(summaries.map((summary) => summary.id), ["domain-brazilian-jiu-jitsu", "domain-music", "domain-weightlifting"]);
  assert.ok(summaries.some((summary) => summary.name === "Brazilian Jiu-Jitsu"));
  assert.equal(summaries.some((summary) => summary.name.includes("Axis")), false);
});

test("DomainModel catalog retrieves by id", () => {
  const domainModel = getDomainModel(sampleDomainModelCatalog, "domain-weightlifting");

  assert.equal(domainModel?.name, "Weightlifting");
});

test("DomainModel catalog finds models by id, name, and alias", () => {
  assert.equal(findDomainModel(sampleDomainModelCatalog, "domain-brazilian-jiu-jitsu")?.name, "Brazilian Jiu-Jitsu");
  assert.equal(findDomainModel(sampleDomainModelCatalog, "Weightlifting")?.id, "domain-weightlifting");
  assert.equal(findDomainModel(sampleDomainModelCatalog, "BJJ")?.id, "domain-brazilian-jiu-jitsu");
  assert.equal(findDomainModel(sampleDomainModelCatalog, "Strength Training")?.id, "domain-weightlifting");
  assert.equal(findDomainModel(sampleDomainModelCatalog, "Software Project"), undefined);
});

test("internal Axis development model is preserved outside the user catalog", () => {
  assert.equal(internalAxisDevelopmentDomainModel.id, "domain-internal-axis-development");
  assert.equal(internalAxisDevelopmentDomainModel.name, "Internal Axis Development");
  assert.equal(findDomainModel(sampleDomainModelCatalog, "Internal Axis Development"), undefined);
});

test("DomainModel attachment preserves Pillar identity fields", () => {
  const pillar = testPillar();
  const attached = attachDomainModelToPillar(pillar, sampleBrazilianJiuJitsuDomainModel);

  assert.equal(attached.id, pillar.id);
  assert.equal(attached.name, pillar.name);
  assert.equal(attached.priority, pillar.priority);
  assert.equal(attached.identityWeight, pillar.identityWeight);
  assert.equal(attached.knowledgeMap.name, "Brazilian Jiu-Jitsu Knowledge Map");
  assert.equal(attached.knowledgeMap.pillarId, pillar.id);
  assert.ok(attached.knowledgeMap.nodes.every((node) => node.pillarId === pillar.id));
});

test("DomainModel attachment replaces or initializes a Pillar KnowledgeMap", () => {
  const music = samplePillars.find((pillar) => pillar.id === "pillar-music");
  assert.ok(music);

  const attached = attachDomainModelToPillar(music, sampleWeightliftingDomainModel);

  assert.equal(attached.knowledgeMap.name, "Weightlifting Knowledge Map");
  assert.ok(attached.knowledgeMap.nodes.some((node) => node.concept.name === "Cable Row"));
});

test("DomainModel attachment preserves KnowledgeState when node ids match", () => {
  const pillar = testPillar();
  const state: KnowledgeState = {
    nodeId: "knowledge-bjj-arm-bar",
    status: "practiced",
    lastPracticedDate: "2026-06-25"
  };
  const result = attachDomainModelToPillarWithState(pillar, sampleBrazilianJiuJitsuDomainModel, [state]);

  assert.deepEqual(result.knowledgeStates, [state]);
});

test("DomainModel attachment remaps KnowledgeState when concept ids match", () => {
  const pillar = renamedNodePillar();
  const state: KnowledgeState = {
    nodeId: "legacy-arm-bar-node",
    status: "developing",
    introducedDate: "2026-06-20"
  };
  const result = attachDomainModelToPillarWithState(pillar, sampleBrazilianJiuJitsuDomainModel, [state]);

  assert.equal(result.knowledgeStates[0]?.nodeId, "knowledge-bjj-arm-bar");
  assert.equal(result.knowledgeStates[0]?.status, "developing");
  assert.equal(result.knowledgeStates[0]?.introducedDate, "2026-06-20");
});

test("DomainModel attachment drops KnowledgeState when no concept match exists", () => {
  const pillar = testPillar();
  const result = attachDomainModelToPillarWithState(pillar, sampleWeightliftingDomainModel, [{
    nodeId: "knowledge-bjj-arm-bar",
    status: "practiced"
  }]);

  assert.deepEqual(result.knowledgeStates, []);
});

test("PillarMemory attachment does not overwrite PracticeHistory", () => {
  const entry = recordPracticeEntry({
    pillarId: "pillar-bjj",
    date: "2026-06-25",
    title: "Practiced Arm Bar",
    topics: ["topic-arm-bar"]
  });
  const memory = {
    pillars: [testPillar()],
    practiceEntries: [entry],
    knowledgeStates: [{ nodeId: "knowledge-bjj-arm-bar", status: "practiced" as const }]
  };

  const next = attachDomainModelToPillarMemory(memory, "pillar-bjj", sampleBrazilianJiuJitsuDomainModel);

  assert.deepEqual(next.practiceEntries, [entry]);
  assert.equal(next.pillars[0]?.knowledgeMap.name, "Brazilian Jiu-Jitsu Knowledge Map");
  assert.ok(next.knowledgeStates?.some((state) => state.nodeId === "knowledge-bjj-arm-bar"));
});

test("PillarMemory attachment leaves memory unchanged for missing Pillar", () => {
  const memory = { pillars: [testPillar()], practiceEntries: [] };

  assert.equal(attachDomainModelToPillarMemory(memory, "missing-pillar", sampleBrazilianJiuJitsuDomainModel), memory);
});

test("generated DomainModel can be compiled and attached", () => {
  const domainModel = generatedTinyBjjModel();
  const result = attachDomainModelToPillarWithState(renamedNodePillar(), domainModel, [{
    nodeId: "legacy-arm-bar-node",
    status: "confident"
  }]);

  assert.equal(result.pillar.knowledgeMap.nodes.length, 2);
  assert.equal(result.pillar.knowledgeMap.edges[0]?.type, "related_to");
  assert.equal(result.knowledgeStates[0]?.nodeId, "knowledge-bjj-arm-bar");
});
