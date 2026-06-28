import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDecisionGraph,
  completeDecisionGraph,
  generateCandidateDecisions,
  selectTodayFromCandidates
} from "./decisionGraph";
import { gatherFacts, generateToday } from "./engine";
import { renderConciseExplanation } from "./reasoning";
import { sampleRyanContext } from "./sampleRyanContext";

test("inputs are converted into a Decision Graph", () => {
  const facts = gatherFacts(sampleRyanContext);
  const graph = buildDecisionGraph(facts);
  const nodeTypes = new Set(graph.nodes.map((node) => node.type));

  assert.ok(nodeTypes.has("identity"));
  assert.ok(nodeTypes.has("principle"));
  assert.ok(nodeTypes.has("constraint"));
  assert.ok(nodeTypes.has("opportunity"));
  assert.ok(graph.edges.some((edge) => edge.type === "protects"));
  assert.ok(graph.edges.some((edge) => edge.type === "supports"));
});

test("candidate decisions are generated from graph nodes", () => {
  const facts = gatherFacts(sampleRyanContext);
  const graph = buildDecisionGraph(facts);
  const candidates = generateCandidateDecisions(graph, facts);
  const protectedSession = candidates.find((candidate) => candidate.id === "decision-protect-opportunity-protected-engine");

  assert.ok(protectedSession);
  assert.equal(protectedSession.protects, "Creative Identity");
  assert.ok(protectedSession.supportingNodeIds.includes("identity-creative-identity"));
  assert.ok(protectedSession.competingDecisionIds.length > 0);
});

test("deterministic selection produces Today from candidate decisions", () => {
  const facts = gatherFacts(sampleRyanContext);
  const graph = buildDecisionGraph(facts);
  const candidates = generateCandidateDecisions(graph, facts);
  const selected = selectTodayFromCandidates(candidates);

  assert.equal(selected.theme.title, "Thursday: protect the honest work.");
  assert.equal(selected.now.id, "decision-protect-opportunity-protected-engine");
  assert.equal(selected.protectedSession.id, selected.now.id);
  assert.equal(selected.next.title, "Team check-in");
  assert.ok(selected.timeline.length >= 5);
});

test("completed graph traces outputs back to supporting decisions", () => {
  const facts = gatherFacts(sampleRyanContext);
  const inputGraph = buildDecisionGraph(facts);
  const candidates = generateCandidateDecisions(inputGraph, facts);
  const selected = selectTodayFromCandidates(candidates);
  const graph = completeDecisionGraph(inputGraph, candidates, selected);

  assert.ok(graph.nodes.some((node) => node.id === selected.now.id && node.type === "decision"));
  assert.ok(graph.nodes.some((node) => node.id === "output-now" && node.type === "output"));
  assert.ok(graph.edges.some((edge) => edge.fromNodeId === "identity-creative-identity" && edge.toNodeId === "opportunity-opportunity-protected-engine"));
  assert.ok(graph.edges.some((edge) => edge.fromNodeId === "opportunity-opportunity-protected-engine" && edge.toNodeId === selected.now.id));
  assert.ok(graph.edges.some((edge) => edge.fromNodeId === selected.now.id && edge.toNodeId === "output-now"));
});

test("generated Today exposes traceable reasoning for every output", () => {
  const today = generateToday(sampleRyanContext);
  const graphNodeIds = new Set(today.decisionGraph.nodes.map((node) => node.id));

  for (const output of Object.values(today.reasonedOutputs)) {
    assert.ok(output.reasonIds.length > 0);
    assert.ok(output.reasonIds.every((reasonId) => graphNodeIds.has(reasonId)));
  }

  assert.ok(today.reasonedOutputs.theme.reasonIds.includes("output-theme"));
  assert.ok(today.reasonedOutputs.now.reasonIds.includes("output-now"));
  assert.ok(today.reasonedOutputs.next.reasonIds.includes("output-next"));
  assert.ok(today.reasonedOutputs.protectedSession.reasonIds.includes("output-protected-session"));
});

test("concise explanation is generated from graph structure", () => {
  const today = generateToday(sampleRyanContext);
  const explanation = renderConciseExplanation(today.reasonGraph, today.reasonedOutputs.now.reasonIds);

  assert.equal(
    explanation,
    "Today protects Creative Identity because this is your strongest uninterrupted focus window, and delaying it would increase drift later in the day."
  );
});

test("confidence is computed from explainable decision factors", () => {
  const today = generateToday(sampleRyanContext);
  const protectedDecision = today.selectedDecisions.protectedSession;

  assert.equal(today.confidence, today.confidenceByOutput.today.score);
  assert.equal(protectedDecision.score.identityAlignment, 10);
  assert.equal(protectedDecision.score.constraintSatisfaction, 10);
  assert.ok(today.reasonedOutputs.confidence.reasonIds.includes(protectedDecision.id));
});
