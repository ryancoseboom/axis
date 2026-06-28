import type { ConceptRelationship, KnowledgeMap } from "./types";

export type LearnerLevel = "beginner" | "intermediate" | "advanced" | "expert" | string;

export type DesiredBreadth = "narrow" | "standard" | "broad" | "comprehensive" | string;

export type DomainGenerationRequest = {
  pillarName: string;
  domainName: string;
  learnerLevel: LearnerLevel;
  desiredBreadth: DesiredBreadth;
  notes?: string;
};

export type DomainRelationshipType =
  | "related_to"
  | "prerequisite"
  | "part_of"
  | "reinforces"
  | "alternative_to"
  | "follow_up"
  | "review_with"
  | "contrasts_with"
  | "progresses_to";

export type DomainGenerationPrompt = {
  promptVersion: string;
  systemInstructions: string[];
  userPrompt: string;
  requiredSchema: DomainGenerationSchema;
  allowedRelationshipTypes: DomainRelationshipType[];
};

export type DomainGenerationSchema = {
  metadata: {
    domainName: "string";
    learnerLevel: "string";
    desiredBreadth: "string";
    version: "string";
    promptVersion: "string";
    generatorVersion: "string";
    createdBy: "llm" | "human" | "axis";
  };
  concepts: {
    id: "string";
    name: "string";
    description: "string";
    categories: "string[]";
    aliases: "string[]";
    sourceTopicIds: "string[]";
  };
  relationships: {
    fromConceptId: "string";
    type: DomainRelationshipType[];
    toConceptId: "string";
    description: "string";
  };
  categories: "string[]";
};

export type GeneratedDomainConcept = {
  id: string;
  name: string;
  description?: string;
  categories?: string[];
  aliases?: string[];
  sourceTopicIds?: string[];
};

export type GeneratedDomainRelationship = {
  fromConceptId: string;
  type: string;
  toConceptId: string;
  description?: string;
};

export type GeneratedDomainMetadata = {
  domainName: string;
  learnerLevel: string;
  desiredBreadth: string;
  version?: string;
  promptVersion?: string;
  generatorVersion?: string;
  createdBy?: "llm" | "human" | "axis" | string;
};

export type GeneratedDomainModel = {
  metadata: GeneratedDomainMetadata;
  concepts: GeneratedDomainConcept[];
  relationships: GeneratedDomainRelationship[];
  categories?: string[];
};

export type DomainValidationErrorCode =
  | "duplicate_concept_id"
  | "duplicate_concept_name"
  | "missing_relationship_endpoint"
  | "invalid_relationship_type"
  | "duplicate_edge";

export type DomainValidationError = {
  code: DomainValidationErrorCode;
  message: string;
  path: string;
};

export type DomainValidationResult = {
  valid: boolean;
  errors: DomainValidationError[];
};

export type DomainModel = {
  id: string;
  pillarId: string;
  name: string;
  version: string;
  promptVersion: string;
  generatorVersion: string;
  createdBy: string;
  categories: string[];
  knowledgeMap: KnowledgeMap;
};

const PROMPT_VERSION = "domain-generation-v1";
const COMPILER_VERSION = "axis-domain-compiler-v1";

export const ALLOWED_DOMAIN_RELATIONSHIP_TYPES: DomainRelationshipType[] = [
  "related_to",
  "prerequisite",
  "part_of",
  "reinforces",
  "alternative_to",
  "follow_up",
  "review_with",
  "contrasts_with",
  "progresses_to"
];

const RELATIONSHIP_TO_KNOWLEDGE_EDGE: Record<DomainRelationshipType, ConceptRelationship> = {
  related_to: "related_to",
  prerequisite: "prerequisite",
  part_of: "part_of",
  reinforces: "reinforces",
  alternative_to: "alternative_to",
  follow_up: "follow_up",
  review_with: "reviews",
  contrasts_with: "contrasts_with",
  progresses_to: "follow_up"
};

export function createDomainGenerationPrompt(request: DomainGenerationRequest): DomainGenerationPrompt {
  return {
    promptVersion: PROMPT_VERSION,
    systemInstructions: [
      "You are authoring a deterministic Axis Domain Model.",
      "Generate domain knowledge only. Do not generate daily recommendations, user history, scores, or runtime state.",
      "Use only the allowed relationship types.",
      "Return JSON matching the required schema exactly."
    ],
    userPrompt: [
      `Generate a deterministic Domain Model for ${request.domainName}.`,
      `Pillar: ${request.pillarName}.`,
      `Learner level: ${request.learnerLevel}.`,
      `Desired breadth: ${request.desiredBreadth}.`,
      request.notes ? `Notes: ${request.notes}.` : undefined,
      `Allowed relationship types: ${ALLOWED_DOMAIN_RELATIONSHIP_TYPES.join(", ")}.`
    ].filter((line): line is string => Boolean(line)).join("\n"),
    requiredSchema: domainGenerationSchema(),
    allowedRelationshipTypes: ALLOWED_DOMAIN_RELATIONSHIP_TYPES
  };
}

export function validateGeneratedDomainModel(model: GeneratedDomainModel): DomainValidationResult {
  const errors: DomainValidationError[] = [];
  const conceptIds = new Set<string>();
  const conceptNames = new Set<string>();

  model.concepts.forEach((concept, index) => {
    const idKey = normalizeId(concept.id);
    const nameKey = normalizeName(concept.name);

    if (conceptIds.has(idKey)) {
      errors.push(error("duplicate_concept_id", `Duplicate concept id: ${concept.id}`, `concepts.${index}.id`));
    }
    conceptIds.add(idKey);

    if (conceptNames.has(nameKey)) {
      errors.push(error("duplicate_concept_name", `Duplicate concept name: ${concept.name}`, `concepts.${index}.name`));
    }
    conceptNames.add(nameKey);
  });

  const knownIds = new Set(model.concepts.map((concept) => normalizeId(concept.id)));
  const edges = new Set<string>();

  model.relationships.forEach((relationship, index) => {
    const fromId = normalizeId(relationship.fromConceptId);
    const toId = normalizeId(relationship.toConceptId);
    const type = relationship.type as DomainRelationshipType;

    if (!knownIds.has(fromId)) {
      errors.push(error("missing_relationship_endpoint", `Missing relationship source concept: ${relationship.fromConceptId}`, `relationships.${index}.fromConceptId`));
    }

    if (!knownIds.has(toId)) {
      errors.push(error("missing_relationship_endpoint", `Missing relationship target concept: ${relationship.toConceptId}`, `relationships.${index}.toConceptId`));
    }

    if (!ALLOWED_DOMAIN_RELATIONSHIP_TYPES.includes(type)) {
      errors.push(error("invalid_relationship_type", `Invalid relationship type: ${relationship.type}`, `relationships.${index}.type`));
    }

    const edgeKey = `${fromId}:${relationship.type}:${toId}`;
    if (edges.has(edgeKey)) {
      errors.push(error("duplicate_edge", `Duplicate relationship edge: ${relationship.fromConceptId} ${relationship.type} ${relationship.toConceptId}`, `relationships.${index}`));
    }
    edges.add(edgeKey);
  });

  return { valid: errors.length === 0, errors };
}

export function compileDomainModel(model: GeneratedDomainModel, options: { pillarId?: string } = {}): DomainModel {
  const validation = validateGeneratedDomainModel(model);
  if (!validation.valid) {
    throw new DomainModelValidationError(validation.errors);
  }

  const pillarId = options.pillarId ?? `pillar-${slug(model.metadata.domainName)}`;
  const domainId = `domain-${slug(model.metadata.domainName)}`;
  const nodesByConceptId = new Map<string, string>();
  const nodes = model.concepts.map((concept) => {
    const nodeId = `knowledge-${slug(pillarId)}-${slug(concept.id)}`;
    nodesByConceptId.set(normalizeId(concept.id), nodeId);

    return {
      id: nodeId,
      pillarId,
      concept: {
        id: `concept-${slug(concept.id)}`,
        name: concept.name,
        description: concept.description ?? `${concept.name} concept.`,
        aliases: concept.aliases ?? [],
        sourceTopicIds: concept.sourceTopicIds ?? []
      }
    };
  });
  const edges = model.relationships.map((relationship) => {
    const type = relationship.type as DomainRelationshipType;
    const fromNodeId = nodesByConceptId.get(normalizeId(relationship.fromConceptId));
    const toNodeId = nodesByConceptId.get(normalizeId(relationship.toConceptId));

    return {
      id: `knowledge-rel-${slug(relationship.fromConceptId)}-${slug(relationship.type)}-${slug(relationship.toConceptId)}`,
      fromNodeId: fromNodeId ?? "",
      toNodeId: toNodeId ?? "",
      type: RELATIONSHIP_TO_KNOWLEDGE_EDGE[type],
      description: relationship.description ?? `${relationship.fromConceptId} ${relationship.type.replace(/_/g, " ")} ${relationship.toConceptId}.`
    };
  });

  return {
    id: domainId,
    pillarId,
    name: model.metadata.domainName,
    version: model.metadata.version ?? "1.0.0",
    promptVersion: model.metadata.promptVersion ?? PROMPT_VERSION,
    generatorVersion: model.metadata.generatorVersion ?? COMPILER_VERSION,
    createdBy: model.metadata.createdBy ?? "llm",
    categories: model.categories ?? unique(model.concepts.flatMap((concept) => concept.categories ?? [])),
    knowledgeMap: {
      id: `knowledge-map-${slug(model.metadata.domainName)}`,
      pillarId,
      name: `${model.metadata.domainName} Knowledge Map`,
      nodes,
      edges
    }
  };
}

export class DomainModelValidationError extends Error {
  readonly errors: DomainValidationError[];

  constructor(errors: DomainValidationError[]) {
    super("Generated Domain Model failed validation.");
    this.name = "DomainModelValidationError";
    this.errors = errors;
  }
}

function domainGenerationSchema(): DomainGenerationSchema {
  return {
    metadata: {
      domainName: "string",
      learnerLevel: "string",
      desiredBreadth: "string",
      version: "string",
      promptVersion: "string",
      generatorVersion: "string",
      createdBy: "llm"
    },
    concepts: {
      id: "string",
      name: "string",
      description: "string",
      categories: "string[]",
      aliases: "string[]",
      sourceTopicIds: "string[]"
    },
    relationships: {
      fromConceptId: "string",
      type: ALLOWED_DOMAIN_RELATIONSHIP_TYPES,
      toConceptId: "string",
      description: "string"
    },
    categories: "string[]"
  };
}

function error(code: DomainValidationErrorCode, message: string, path: string): DomainValidationError {
  return { code, message, path };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/^pillar-/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
