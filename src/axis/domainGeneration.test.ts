import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_DOMAIN_RELATIONSHIP_TYPES,
  DomainModelValidationError,
  compileDomainModel,
  createDomainGenerationPrompt,
  validateGeneratedDomainModel
} from "./domainGeneration";
import type { GeneratedDomainModel } from "./domainGeneration";

function validGeneratedModel(): GeneratedDomainModel {
  return {
    metadata: {
      domainName: "Brazilian Jiu-Jitsu",
      learnerLevel: "intermediate",
      desiredBreadth: "standard",
      version: "1.0.0",
      promptVersion: "domain-generation-v1",
      generatorVersion: "test-generator",
      createdBy: "llm"
    },
    categories: ["Guard", "Submission"],
    concepts: [
      {
        id: "closed_guard",
        name: "Closed Guard",
        description: "Control position for posture breaking.",
        categories: ["Guard"],
        aliases: ["closed guard"],
        sourceTopicIds: ["topic-closed-guard"]
      },
      {
        id: "arm_bar",
        name: "Arm Bar",
        description: "Arm isolation and finishing mechanics.",
        categories: ["Submission"],
        aliases: ["armbar"],
        sourceTopicIds: ["topic-arm-bar"]
      },
      {
        id: "triangle_choke",
        name: "Triangle Choke",
        description: "Leg-based choke from guard.",
        categories: ["Submission"],
        aliases: ["triangle"],
        sourceTopicIds: ["topic-triangle-choke"]
      }
    ],
    relationships: [
      {
        fromConceptId: "closed_guard",
        type: "prerequisite",
        toConceptId: "arm_bar",
        description: "Closed Guard creates reliable Arm Bar entries."
      },
      {
        fromConceptId: "arm_bar",
        type: "related_to",
        toConceptId: "triangle_choke",
        description: "Arm Bar and Triangle Choke share posture breaking."
      },
      {
        fromConceptId: "arm_bar",
        type: "review_with",
        toConceptId: "closed_guard",
        description: "Review Arm Bar together with Closed Guard control."
      },
      {
        fromConceptId: "closed_guard",
        type: "progresses_to",
        toConceptId: "triangle_choke",
        description: "Closed Guard can progress into Triangle Choke attacks."
      }
    ]
  };
}

test("DomainGenerationPrompt is deterministic and complete", () => {
  const prompt = createDomainGenerationPrompt({
    pillarName: "BJJ",
    domainName: "Brazilian Jiu-Jitsu",
    learnerLevel: "intermediate",
    desiredBreadth: "standard",
    notes: "Prefer guard fundamentals."
  });

  assert.equal(prompt.promptVersion, "domain-generation-v1");
  assert.ok(prompt.systemInstructions.some((line) => line.includes("Do not generate daily recommendations")));
  assert.ok(prompt.userPrompt.includes("Brazilian Jiu-Jitsu"));
  assert.ok(prompt.userPrompt.includes("Prefer guard fundamentals."));
  assert.deepEqual(prompt.allowedRelationshipTypes, ALLOWED_DOMAIN_RELATIONSHIP_TYPES);
  assert.deepEqual(prompt.requiredSchema.relationships.type, ALLOWED_DOMAIN_RELATIONSHIP_TYPES);
});

test("generated Domain Model validation succeeds", () => {
  const result = validateGeneratedDomainModel(validGeneratedModel());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validation reports duplicate concept IDs", () => {
  const model = validGeneratedModel();
  model.concepts[1] = { ...model.concepts[1], id: "closed_guard" };

  const result = validateGeneratedDomainModel(model);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => item.code === "duplicate_concept_id" && item.path === "concepts.1.id"));
});

test("validation reports duplicate concept names", () => {
  const model = validGeneratedModel();
  model.concepts[1] = { ...model.concepts[1], name: "closed guard" };

  const result = validateGeneratedDomainModel(model);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => item.code === "duplicate_concept_name" && item.path === "concepts.1.name"));
});

test("validation reports missing relationship endpoints", () => {
  const model = validGeneratedModel();
  model.relationships[0] = { ...model.relationships[0], toConceptId: "missing_concept" };

  const result = validateGeneratedDomainModel(model);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => item.code === "missing_relationship_endpoint" && item.path === "relationships.0.toConceptId"));
});

test("validation reports invalid relationship types", () => {
  const model = validGeneratedModel();
  model.relationships[0] = { ...model.relationships[0], type: "causes" };

  const result = validateGeneratedDomainModel(model);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => item.code === "invalid_relationship_type" && item.path === "relationships.0.type"));
});

test("validation reports duplicate edges", () => {
  const model = validGeneratedModel();
  model.relationships.push({ ...model.relationships[1] });

  const result = validateGeneratedDomainModel(model);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => item.code === "duplicate_edge" && item.path === "relationships.4"));
});

test("compileDomainModel creates canonical DomainModel and KnowledgeMap", () => {
  const compiled = compileDomainModel(validGeneratedModel(), { pillarId: "pillar-bjj" });

  assert.equal(compiled.id, "domain-brazilian-jiu-jitsu");
  assert.equal(compiled.pillarId, "pillar-bjj");
  assert.equal(compiled.name, "Brazilian Jiu-Jitsu");
  assert.deepEqual(compiled.categories, ["Guard", "Submission"]);
  assert.equal(compiled.knowledgeMap.id, "knowledge-map-brazilian-jiu-jitsu");
  assert.equal(compiled.knowledgeMap.nodes[1]?.id, "knowledge-bjj-arm-bar");
  assert.equal(compiled.knowledgeMap.nodes[1]?.concept.name, "Arm Bar");
  assert.equal(compiled.knowledgeMap.nodes[1]?.concept.sourceTopicIds?.[0], "topic-arm-bar");
  assert.equal(compiled.knowledgeMap.edges[0]?.type, "prerequisite");
});

test("compileDomainModel maps generated relationship vocabulary into canonical KnowledgeEdges", () => {
  const compiled = compileDomainModel(validGeneratedModel(), { pillarId: "pillar-bjj" });
  const reviewEdge = compiled.knowledgeMap.edges.find((edge) => edge.id.includes("review-with"));
  const progressionEdge = compiled.knowledgeMap.edges.find((edge) => edge.id.includes("progresses-to"));

  assert.equal(reviewEdge?.type, "reviews");
  assert.equal(progressionEdge?.type, "follow_up");
});

test("compileDomainModel rejects invalid generated models", () => {
  const model = validGeneratedModel();
  model.relationships[0] = { ...model.relationships[0], fromConceptId: "missing_concept" };

  assert.throws(() => compileDomainModel(model), (error) => {
    assert.ok(error instanceof DomainModelValidationError);
    assert.equal(error.errors[0]?.code, "missing_relationship_endpoint");
    return true;
  });
});

test("compileDomainModel derives categories from concepts when omitted", () => {
  const model = validGeneratedModel();
  delete model.categories;

  const compiled = compileDomainModel(model);

  assert.deepEqual(compiled.categories, ["Guard", "Submission"]);
});
