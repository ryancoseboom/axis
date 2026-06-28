import type {
  CandidateDecision,
  ConfidenceContributor,
  DecisionGraph,
  DecisionNode,
  ExplainabilityResult,
  GeneratedToday,
  GraphPathStep,
  TodayOutputReference
} from "./types";

const OUTPUT_NODE_BY_REFERENCE = {
  theme: "output-theme",
  now: "output-now",
  next: "output-next",
  protectedSession: "output-protected-session",
  confidence: "output-confidence"
};

export function explainTodayOutput(today: GeneratedToday, output: TodayOutputReference): ExplainabilityResult {
  const targetNodeId = targetFor(today, output);
  const graphPath = graphPathTo(today.decisionGraph, targetNodeId);
  const supportingNodeIds = unique(graphPath.map((step) => step.fromNodeId).concat(targetNodeId));
  const supportingNodes = supportingNodeIds.map((nodeId) => findNode(today.decisionGraph, nodeId));
  const selectedDecision = selectedDecisionFor(today, output, supportingNodes);

  return {
    output,
    conciseExplanation: conciseExplanation(output, supportingNodes, selectedDecision),
    supportingNodes,
    confidenceContributors: selectedDecision ? confidenceContributors(selectedDecision) : [],
    graphPath,
    debug: {
      targetNodeId,
      selectedDecisionId: selectedDecision?.id,
      supportingNodeIds
    }
  };
}

export function explainConfidence(today: GeneratedToday): ExplainabilityResult {
  return explainTodayOutput(today, { type: "confidence" });
}

function targetFor(today: GeneratedToday, output: TodayOutputReference): string {
  if (output.type === "timelineItem") {
    return output.decisionId;
  }

  return OUTPUT_NODE_BY_REFERENCE[output.type];
}

function graphPathTo(graph: DecisionGraph, targetNodeId: string): GraphPathStep[] {
  const visited = new Set<string>();
  const steps: GraphPathStep[] = [];

  walkBackward(graph, targetNodeId, visited, steps);

  return steps.reverse();
}

function walkBackward(graph: DecisionGraph, nodeId: string, visited: Set<string>, steps: GraphPathStep[]) {
  if (visited.has(nodeId)) {
    return;
  }

  visited.add(nodeId);

  for (const edge of graph.edges.filter((item) => item.toNodeId === nodeId)) {
    walkBackward(graph, edge.fromNodeId, visited, steps);
    steps.push({
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      edgeType: edge.type,
      explanation: edge.explanation
    });
  }
}

function selectedDecisionFor(
  today: GeneratedToday,
  output: TodayOutputReference,
  supportingNodes: DecisionNode[]
): CandidateDecision | undefined {
  if (output.type === "timelineItem") {
    return today.selectedDecisions.timeline.find((decision) => decision.id === output.decisionId);
  }

  const decisionId = supportingNodes.find((node) => node.type === "decision")?.id;

  if (!decisionId) {
    return undefined;
  }

  return today.candidateDecisions.find((decision) => decision.id === decisionId);
}

function conciseExplanation(
  output: TodayOutputReference,
  supportingNodes: DecisionNode[],
  selectedDecision: CandidateDecision | undefined
): string {
  if (output.type === "confidence" && selectedDecision) {
    const strongest = confidenceContributors(selectedDecision)[0];
    return `Confidence is ${selectedDecision.confidence.score >= 70 ? "steady" : "limited"} because ${strongest.explanation}.`;
  }

  const identity = supportingNodes.find((node) => node.type === "identity");
  const focusWindow = supportingNodes.find((node) => node.title === "Best focus window" || node.title.includes("focus window"));
  const drift = supportingNodes.find((node) => node.explanation.toLowerCase().includes("drift"));
  const decision = selectedDecision ?? supportingNodes.find((node) => node.type === "decision");
  const protects = selectedDecision?.protects ?? identity?.protects;

  if (output.type === "theme" && protects) {
    return `Axis names today around ${protects} because that is what the selected decision protects.`;
  }

  if ((output.type === "now" || output.type === "protectedSession" || output.type === "timelineItem") && protects && focusWindow) {
    const driftClause = drift ? " and reduces drift later in the day" : "";
    return `Axis chose this because it protects ${protects} during your strongest focus window${driftClause}.`;
  }

  if (output.type === "next" && decision) {
    return `Axis shows this next because it is the next clean boundary after the protected work.`;
  }

  if (decision && protects) {
    return `Axis chose this because it protects ${protects} and fits the current day.`;
  }

  return "Axis includes this because it is supported by the current Decision Graph.";
}

function confidenceContributors(decision: CandidateDecision): ConfidenceContributor[] {
  return [...decision.confidence.factors].sort((a, b) => factorImpact(b) - factorImpact(a));
}

function factorImpact(factor: ConfidenceContributor): number {
  const effectiveScore = factor.direction === "positive" ? factor.score : 100 - factor.score;
  return effectiveScore * factor.weight;
}


function findNode(graph: DecisionGraph, nodeId: string): DecisionNode {
  const node = graph.nodes.find((item) => item.id === nodeId);

  if (!node) {
    throw new Error(`Missing graph node ${nodeId}`);
  }

  return node;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
