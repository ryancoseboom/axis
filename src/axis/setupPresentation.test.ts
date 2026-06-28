import assert from "node:assert/strict";
import test from "node:test";
import { buildUserContextFromSetup, sampleRyanSetup } from "./setup";
import { buildKnowledgeStateSummary, buildSetupKnowledgeReview } from "./setupPresentation";
import type { UserContext } from "./types";

function reviewFor(pillarName: string) {
  const review = buildSetupKnowledgeReview(sampleRyanSetup).find((pillar) => pillar.pillarName === pillarName);
  assert.ok(review);
  return review;
}

function conceptsFor(pillarName: string, label: string): string[] {
  return reviewFor(pillarName).groups.find((group) => group.label === label)?.concepts ?? [];
}

function allConceptsFor(pillarName: string): string[] {
  return reviewFor(pillarName).groups.flatMap((group) => group.concepts);
}

test("BJJ setup review includes Arm Bar and Closed Guard where appropriate", () => {
  const concepts = allConceptsFor("BJJ");

  assert.ok(concepts.includes("Arm Bar"));
  assert.ok(concepts.includes("Closed Guard"));
});

test("Weightlifting setup review includes program concepts", () => {
  const review = reviewFor("Health");
  const allConcepts = review.groups.flatMap((group) => group.concepts);

  assert.ok(allConcepts.includes("Pull"));
  assert.ok(allConcepts.includes("Biceps"));
  assert.ok(allConcepts.includes("Cable Row"));
});

test("Music setup review includes songwriting and production concepts", () => {
  const concepts = allConceptsFor("Music");

  assert.ok(concepts.includes("Songwriting"));
  assert.ok(concepts.includes("Production"));
});

test("Axis setup review includes architecture concepts", () => {
  const concepts = allConceptsFor("Axis");

  assert.ok(concepts.includes("Decision Graph"));
  assert.ok(concepts.includes("Domain Models"));
  assert.ok(concepts.includes("Knowledge Maps"));
});

test("setup review excludes raw ids", () => {
  const review = buildSetupKnowledgeReview(sampleRyanSetup);
  const text = JSON.stringify(review);

  assert.equal(text.includes("knowledge-bjj-arm-bar"), false);
  assert.equal(text.includes("topic-arm-bar"), false);
});

test("setup review limits concepts per state", () => {
  const review = buildSetupKnowledgeReview(sampleRyanSetup, { limitPerState: 2 });

  assert.ok(review.every((pillar) => pillar.groups.every((group) => group.concepts.length <= 2)));
});

test("setup review handles missing KnowledgeState safely", () => {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const withoutKnowledge: UserContext = {
    ...context,
    pillarMemory: context.pillarMemory ? {
      ...context.pillarMemory,
      knowledgeStates: undefined
    } : undefined
  };
  const review = buildKnowledgeStateSummary(withoutKnowledge, sampleRyanSetup);

  assert.ok(review.length > 0);
  assert.ok(review.every((pillar) => pillar.groups.length === 0));
});

test("setup review includes domain level and credential context", () => {
  const bjj = reviewFor("BJJ");

  assert.equal(bjj.domainName, "Brazilian Jiu-Jitsu");
  assert.equal(bjj.currentLevel, "advanced");
  assert.equal(bjj.credential, "Purple belt");
});
