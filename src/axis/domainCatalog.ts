import { compileDomainModel } from "./domainGeneration";
import type { DomainModel, GeneratedDomainModel } from "./domainGeneration";
import type { KnowledgeMap, KnowledgeState, Pillar, PillarMemory } from "./types";

export type DomainModelSummary = {
  id: string;
  pillarId: string;
  name: string;
  version: string;
  categories: string[];
};

export type DomainModelCatalog = {
  domainModels: DomainModel[];
  aliases: Record<string, string>;
};

export type AttachDomainModelResult = {
  pillar: Pillar;
  knowledgeStates: KnowledgeState[];
};

export function createDomainModelCatalog(domainModels: DomainModel[] = [], aliases: Record<string, string> = {}): DomainModelCatalog {
  const catalog = domainModels.reduce<DomainModelCatalog>((current, domainModel) => registerDomainModel(current, domainModel), { domainModels: [], aliases: {} });
  return {
    ...catalog,
    aliases: normalizedAliases(aliases)
  };
}

export function registerDomainModel(catalog: DomainModelCatalog, domainModel: DomainModel): DomainModelCatalog {
  return {
    domainModels: [...catalog.domainModels.filter((item) => item.id !== domainModel.id), domainModel].sort((a, b) => a.id.localeCompare(b.id)),
    aliases: catalog.aliases
  };
}

export function listDomainModels(catalog: DomainModelCatalog): DomainModelSummary[] {
  return catalog.domainModels.map((domainModel) => ({
    id: domainModel.id,
    pillarId: domainModel.pillarId,
    name: domainModel.name,
    version: domainModel.version,
    categories: domainModel.categories
  }));
}

export function getDomainModel(catalog: DomainModelCatalog, domainModelId: string): DomainModel | undefined {
  return catalog.domainModels.find((domainModel) => domainModel.id === domainModelId);
}

export function findDomainModel(catalog: DomainModelCatalog, value: string): DomainModel | undefined {
  const direct = catalog.domainModels.find((domainModel) =>
    normalize(domainModel.id) === normalize(value) ||
    normalize(domainModel.name) === normalize(value)
  );
  if (direct) return direct;

  const aliasedId = catalog.aliases[normalize(value)];
  return aliasedId ? getDomainModel(catalog, aliasedId) : undefined;
}

export function attachDomainModelToPillar(pillar: Pillar, domainModel: DomainModel): Pillar {
  return {
    ...pillar,
    knowledgeMap: knowledgeMapForPillar(domainModel.knowledgeMap, pillar.id)
  };
}

export function attachDomainModelToPillarWithState(
  pillar: Pillar,
  domainModel: DomainModel,
  knowledgeStates: KnowledgeState[] = []
): AttachDomainModelResult {
  const nextPillar = attachDomainModelToPillar(pillar, domainModel);

  return {
    pillar: nextPillar,
    knowledgeStates: preserveKnowledgeStates(pillar.knowledgeMap, nextPillar.knowledgeMap, knowledgeStates)
  };
}

export function attachDomainModelToPillarMemory(memory: PillarMemory, pillarId: string, domainModel: DomainModel): PillarMemory {
  const pillar = memory.pillars.find((item) => item.id === pillarId);
  if (!pillar) return memory;

  const result = attachDomainModelToPillarWithState(pillar, domainModel, memory.knowledgeStates ?? []);

  return {
    ...memory,
    pillars: memory.pillars.map((item) => item.id === pillarId ? result.pillar : item),
    knowledgeStates: result.knowledgeStates
  };
}

export const sampleBrazilianJiuJitsuDomainModel = compileDomainModel(sampleBrazilianJiuJitsuGeneratedModel(), { pillarId: "pillar-bjj" });

export const sampleWeightliftingDomainModel = compileDomainModel(sampleWeightliftingGeneratedModel(), { pillarId: "pillar-health" });

export const sampleMusicDomainModel = compileDomainModel(sampleMusicGeneratedModel(), { pillarId: "pillar-music" });

export const sampleAxisDomainModel = compileDomainModel(sampleAxisGeneratedModel(), { pillarId: "pillar-axis" });

export const sampleDomainModelCatalog = createDomainModelCatalog([
  sampleAxisDomainModel,
  sampleBrazilianJiuJitsuDomainModel,
  sampleMusicDomainModel,
  sampleWeightliftingDomainModel
], {
  bjj: sampleBrazilianJiuJitsuDomainModel.id,
  "jiu jitsu": sampleBrazilianJiuJitsuDomainModel.id,
  "strength training": sampleWeightliftingDomainModel.id,
  lifting: sampleWeightliftingDomainModel.id,
  songwriting: sampleMusicDomainModel.id,
  "software project": sampleAxisDomainModel.id,
  "product engineering": sampleAxisDomainModel.id
});

function preserveKnowledgeStates(previousMap: KnowledgeMap, nextMap: KnowledgeMap, states: KnowledgeState[]): KnowledgeState[] {
  const nextNodeIds = new Set(nextMap.nodes.map((node) => node.id));
  const previousNodesById = new Map(previousMap.nodes.map((node) => [node.id, node]));
  const nextNodesByConceptId = new Map(nextMap.nodes.map((node) => [node.concept.id, node]));
  const preserved = new Map<string, KnowledgeState>();

  for (const state of states) {
    if (nextNodeIds.has(state.nodeId)) {
      preserved.set(state.nodeId, state);
      continue;
    }

    const previousNode = previousNodesById.get(state.nodeId);
    const nextNode = previousNode ? nextNodesByConceptId.get(previousNode.concept.id) : undefined;
    if (!nextNode) continue;

    preserved.set(nextNode.id, {
      ...state,
      nodeId: nextNode.id
    });
  }

  return [...preserved.values()].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
}

function knowledgeMapForPillar(knowledgeMap: KnowledgeMap, pillarId: string): KnowledgeMap {
  return {
    ...knowledgeMap,
    pillarId,
    nodes: knowledgeMap.nodes.map((node) => ({ ...node, pillarId })),
    edges: knowledgeMap.edges.map((edge) => ({ ...edge }))
  };
}

function sampleBrazilianJiuJitsuGeneratedModel(): GeneratedDomainModel {
  return {
    metadata: {
      domainName: "Brazilian Jiu-Jitsu",
      learnerLevel: "intermediate",
      desiredBreadth: "narrow",
      version: "1.0.0",
      promptVersion: "domain-generation-v1",
      generatorVersion: "sample-domain-catalog",
      createdBy: "axis"
    },
    categories: ["Guard", "Submission", "Position"],
    concepts: [
      { id: "closed-guard", name: "Closed Guard", description: "Control position for posture breaking.", categories: ["Guard"], sourceTopicIds: ["topic-closed-guard"] },
      { id: "arm-bar", name: "Arm Bar", description: "Arm isolation and finishing mechanics.", categories: ["Submission"], sourceTopicIds: ["topic-arm-bar"] },
      { id: "triangle-choke", name: "Triangle Choke", description: "Leg-based choke from guard.", categories: ["Submission"], aliases: ["triangle"], sourceTopicIds: ["topic-triangle-choke"] },
      { id: "omoplata", name: "Omoplata", description: "Shoulder lock and sweeping threat.", categories: ["Submission"], sourceTopicIds: ["topic-omoplata"] },
      { id: "back-takes", name: "Back Takes", description: "Routes to back control and finishing positions.", categories: ["Position"], sourceTopicIds: ["topic-back-takes"] }
    ],
    relationships: [
      { fromConceptId: "closed-guard", type: "prerequisite", toConceptId: "arm-bar", description: "Closed Guard creates reliable Arm Bar entries." },
      { fromConceptId: "arm-bar", type: "related_to", toConceptId: "triangle-choke", description: "Arm Bar and Triangle Choke share posture-breaking mechanics." },
      { fromConceptId: "arm-bar", type: "alternative_to", toConceptId: "omoplata", description: "Omoplata follows common Arm Bar defenses." },
      { fromConceptId: "arm-bar", type: "review_with", toConceptId: "closed-guard", description: "Review Arm Bar with Closed Guard control." },
      { fromConceptId: "closed-guard", type: "progresses_to", toConceptId: "back-takes", description: "Guard control can progress into back exposure and back takes." }
    ]
  };
}

function sampleWeightliftingGeneratedModel(): GeneratedDomainModel {
  return {
    metadata: {
      domainName: "Weightlifting",
      learnerLevel: "intermediate",
      desiredBreadth: "narrow",
      version: "1.0.0",
      promptVersion: "domain-generation-v1",
      generatorVersion: "sample-domain-catalog",
      createdBy: "axis"
    },
    categories: ["Movement Pattern", "Muscle Group", "Exercise"],
    concepts: [
      { id: "pull", name: "Pull", description: "Pulling patterns for back and arm development.", categories: ["Movement Pattern"], sourceTopicIds: ["program-day-pull-biceps", "program-day-pull-back"] },
      { id: "push", name: "Push", description: "Pressing patterns for chest and shoulders.", categories: ["Movement Pattern"], sourceTopicIds: ["program-day-push-chest", "program-day-push-shoulders"] },
      { id: "biceps", name: "Biceps", description: "Elbow-flexion strength and curl variations.", categories: ["Muscle Group"], sourceTopicIds: ["program-day-pull-biceps"] },
      { id: "back", name: "Back", description: "Back-focused rows and pulldowns.", categories: ["Muscle Group"], sourceTopicIds: ["program-day-pull-back"] },
      { id: "cable-row", name: "Cable Row", description: "Horizontal pull for mid-back development.", categories: ["Exercise"], sourceTopicIds: ["movement-seated-cable-row"] }
    ],
    relationships: [
      { fromConceptId: "pull", type: "part_of", toConceptId: "biceps", description: "Biceps work is part of the Pull pattern." },
      { fromConceptId: "pull", type: "part_of", toConceptId: "back", description: "Back work is part of the Pull pattern." },
      { fromConceptId: "back", type: "progresses_to", toConceptId: "cable-row", description: "Cable Row is a concrete progression for Back development." },
      { fromConceptId: "push", type: "contrasts_with", toConceptId: "pull", description: "Push and Pull stress complementary movement patterns." }
    ]
  };
}

function sampleMusicGeneratedModel(): GeneratedDomainModel {
  return {
    metadata: {
      domainName: "Music",
      learnerLevel: "advanced",
      desiredBreadth: "narrow",
      version: "1.0.0",
      promptVersion: "domain-generation-v1",
      generatorVersion: "sample-domain-catalog",
      createdBy: "axis"
    },
    categories: ["Writing", "Production", "Structure"],
    concepts: [
      { id: "songwriting", name: "Songwriting", description: "Writing the emotional and structural core of a song.", categories: ["Writing"] },
      { id: "arrangement", name: "Arrangement", description: "Choosing parts, sections, and movement.", categories: ["Structure"] },
      { id: "recording", name: "Recording", description: "Capturing performances and sounds.", categories: ["Production"] },
      { id: "production", name: "Production", description: "Shaping the finished sonic world.", categories: ["Production"] }
    ],
    relationships: [
      { fromConceptId: "songwriting", type: "progresses_to", toConceptId: "arrangement", description: "Songwriting progresses into arrangement decisions." },
      { fromConceptId: "arrangement", type: "progresses_to", toConceptId: "recording", description: "Arrangement creates a path into recording." },
      { fromConceptId: "recording", type: "reinforces", toConceptId: "production", description: "Recording choices reinforce production direction." }
    ]
  };
}

function sampleAxisGeneratedModel(): GeneratedDomainModel {
  return {
    metadata: {
      domainName: "Axis",
      learnerLevel: "advanced",
      desiredBreadth: "narrow",
      version: "1.0.0",
      promptVersion: "domain-generation-v1",
      generatorVersion: "sample-domain-catalog",
      createdBy: "axis"
    },
    categories: ["Reasoning", "Product", "Context"],
    concepts: [
      { id: "decision-graph", name: "Decision Graph", description: "The deterministic reasoning graph that produces Today.", categories: ["Reasoning"] },
      { id: "explainability", name: "Explainability", description: "Traceable reasons for recommendations.", categories: ["Reasoning"] },
      { id: "confidence", name: "Confidence", description: "Computed trust in the generated plan.", categories: ["Reasoning"] },
      { id: "calendar", name: "Calendar", description: "Calendar-shaped context for commitments and availability.", categories: ["Context"] },
      { id: "identity", name: "Identity", description: "Long-lived values and self-definition.", categories: ["Product"] },
      { id: "domain-models", name: "Domain Models", description: "Expert domain structures that compile into deterministic maps.", categories: ["Reasoning"] },
      { id: "knowledge-maps", name: "Knowledge Maps", description: "Concept relationship maps used by development signals.", categories: ["Reasoning"] }
    ],
    relationships: [
      { fromConceptId: "identity", type: "prerequisite", toConceptId: "decision-graph", description: "Identity gives the Decision Graph something to protect." },
      { fromConceptId: "decision-graph", type: "part_of", toConceptId: "explainability", description: "Explainability exposes Decision Graph reasoning." },
      { fromConceptId: "confidence", type: "reinforces", toConceptId: "explainability", description: "Confidence is more useful when explained." },
      { fromConceptId: "calendar", type: "reinforces", toConceptId: "decision-graph", description: "Calendar context improves Decision Graph fit." },
      { fromConceptId: "domain-models", type: "progresses_to", toConceptId: "knowledge-maps", description: "Domain Models compile into Knowledge Maps." },
      { fromConceptId: "knowledge-maps", type: "reinforces", toConceptId: "decision-graph", description: "Knowledge Maps provide development signals to the Decision Graph." }
    ]
  };
}

function normalizedAliases(aliases: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(aliases).map(([alias, domainModelId]) => [normalize(alias), domainModelId]));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
