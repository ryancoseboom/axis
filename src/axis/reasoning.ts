import { confidenceFromDecision } from "./decisionGraph";
import type {
  DecisionEdge,
  DecisionGraph,
  Reason,
  ReasonGraph,
  ReasonedOutput,
  SelectedTodayDecisions,
  TodayReasonedOutputs
} from "./types";

export type TodayReasoning = {
  graph: ReasonGraph;
  outputs: TodayReasonedOutputs;
  confidence: number;
  conciseExplanation: string;
};

export function buildTodayReasoning(decisionGraph: DecisionGraph, selected: SelectedTodayDecisions): TodayReasoning {
  const graph = toReasonGraph(decisionGraph);
  const outputs: TodayReasonedOutputs = {
    theme: output("output-theme", "Theme", reasonsForOutput(decisionGraph, selected.theme.id, "output-theme")),
    now: output("output-now", "NOW", reasonsForOutput(decisionGraph, selected.now.id, "output-now")),
    next: output("output-next", "NEXT", reasonsForOutput(decisionGraph, selected.next.id, "output-next")),
    protectedSession: output(
      "output-protected-session",
      "Protected Session",
      reasonsForOutput(decisionGraph, selected.protectedSession.id, "output-protected-session")
    ),
    confidence: output("output-confidence", "Confidence", reasonsForOutput(decisionGraph, selected.protectedSession.id, "output-confidence"))
  };

  return {
    graph,
    outputs,
    confidence: confidenceFromDecision(selected.protectedSession),
    conciseExplanation: renderConciseExplanation(graph, outputs.now.reasonIds)
  };
}

// The Reason Graph is the public explanation view of the Decision Graph.
// Later it can power an inspector, but Version Zero keeps it as a compact audit trail.
export function toReasonGraph(decisionGraph: DecisionGraph): ReasonGraph {
  return {
    reasons: decisionGraph.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      explanation: node.explanation,
      importance: node.importance,
      relatedObjectIds: node.relatedObjectIds,
      protects: node.protects,
      confidenceContribution: node.confidenceContribution
    })),
    links: decisionGraph.edges.map(reasonLink)
  };
}

export function renderConciseExplanation(graph: ReasonGraph, reasonIds: string[]): string {
  const selected = reasonIds.map((id) => graph.reasons.find((reason) => reason.id === id)).filter(Boolean) as Reason[];
  const identity = selected.find((reason) => reason.type === "identity");
  const focusWindow = selected.find((reason) => reason.title === "Best focus window" || reason.title.includes("focus window"));
  const driftRisk = selected.find((reason) => reason.explanation.includes("drift"));

  if (identity?.protects && focusWindow && driftRisk) {
    return `Today protects ${identity.protects} because ${focusWindow.explanation.toLowerCase()}, and delaying it would increase drift later in the day.`;
  }

  const decision = selected.find((reason) => reason.type === "decision");
  return decision ? `Today is shaped this way because ${decision.explanation}.` : "Today is shaped by the current graph.";
}

function reasonsForOutput(decisionGraph: DecisionGraph, decisionId: string, outputId: string): string[] {
  const supportingNodeIds = decisionGraph.edges
    .filter((edge) => edge.toNodeId === decisionId)
    .map((edge) => edge.fromNodeId);

  return unique([...supportingNodeIds, decisionId, outputId]).filter((nodeId) => decisionGraph.nodes.some((node) => node.id === nodeId));
}

function reasonLink(edge: DecisionEdge) {
  return {
    fromReasonId: edge.fromNodeId,
    toReasonId: edge.toNodeId,
    label: edge.type
  };
}

function output(id: string, label: string, reasonIds: string[]): ReasonedOutput {
  return { id, label, reasonIds };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
