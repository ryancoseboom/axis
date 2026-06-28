import { buildConfidence } from "./confidence";
import { generateOpportunities } from "./opportunities";
import type {
  CandidateDecision,
  DecisionEdge,
  DecisionGraph,
  DecisionNode,
  DecisionScore,
  Facts,
  Opportunity,
  SelectedTodayDecisions
} from "./types";

const PROTECT_DEEP_WORK_PRINCIPLE_ID = "principle-protect-deep-work";
const FEWER_MEANINGFUL_THINGS_PRINCIPLE_ID = "principle-fewer-meaningful-things";

export function buildDecisionGraph(facts: Facts): DecisionGraph {
  const opportunities = generateOpportunities(facts);
  const nodes = [
    ...identityNodes(opportunities),
    ...principleNodes(facts),
    ...constraintNodes(facts),
    ...opportunityNodes(opportunities, facts)
  ];
  const edges = inputEdges(nodes, opportunities, facts);

  return { nodes, edges };
}

export function generateCandidateDecisions(graph: DecisionGraph, facts: Facts): CandidateDecision[] {
  const opportunities = graph.nodes.filter((node) => node.type === "opportunity");
  const protectSessionCandidates = opportunities.map((node) => withConfidence(candidateFromOpportunity(node.id, graph, facts)));
  const themeCandidates = protectSessionCandidates.map((candidate) => withConfidence({
    ...candidate,
    id: `decision-theme-${candidate.opportunityId}`,
    kind: "theme" as const,
    title: `Thursday: protect the honest work.`,
    explanation: `Name the day by what ${candidate.protects} needs, not by how much can be done.`
  }));
  const nextCandidates = nextDecisions(facts);
  const supportCandidates = supportDecisions(facts);

  return withCompetingProtectDecisions([
    ...themeCandidates,
    ...protectSessionCandidates,
    ...nextCandidates,
    ...supportCandidates
  ]);
}

export function selectTodayFromCandidates(candidates: CandidateDecision[], preferredDecisionId?: string): SelectedTodayDecisions {
  const protectedSession = preferredProtectSession(candidates, preferredDecisionId) ?? highest(candidates.filter((candidate) => candidate.kind === "protect_session"));
  const theme = candidateForOpportunity(candidates, "theme", protectedSession.opportunityId);
  const now = protectedSession;
  const next = firstNextAfter(candidates.filter((candidate) => candidate.kind === "next"), protectedSession);
  const timeline = [
    ...candidates.filter((candidate) => candidate.kind === "timeline_support" && candidate.window?.start === "08:30"),
    protectedSession,
    next,
    ...candidates.filter((candidate) => candidate.kind === "next" && candidate.id !== next.id),
    ...candidates.filter((candidate) => candidate.kind === "timeline_support" && candidate.window?.start !== "08:30")
  ].sort((a, b) => (a.window?.start ?? "99:99").localeCompare(b.window?.start ?? "99:99"));

  return { theme, now, next, timeline, protectedSession };
}

export function completeDecisionGraph(
  graph: DecisionGraph,
  candidates: CandidateDecision[],
  selected: SelectedTodayDecisions
): DecisionGraph {
  const decisionNodes = candidates.map(decisionNode);
  const decisionEdges = candidates.flatMap((candidate) =>
    candidate.supportingNodeIds.map((nodeId) => ({
      id: `edge-${nodeId}-${candidate.id}`,
      fromNodeId: nodeId,
      toNodeId: candidate.id,
      type: "supports" as const,
      explanation: `${nodeId} supports ${candidate.title}.`,
      weight: 1
    }))
  );
  const outputNodes = outputNodesForSelection(selected);
  const outputEdges = outputNodes.map((node) => ({
    id: `edge-${node.relatedObjectIds[0]}-${node.id}`,
    fromNodeId: node.relatedObjectIds[0],
    toNodeId: node.id,
    type: "derived_from" as const,
    explanation: `${node.title} is derived from the selected decision.`,
    weight: 1
  }));

  return {
    nodes: [...graph.nodes, ...decisionNodes, ...outputNodes],
    edges: [...graph.edges, ...decisionEdges, ...outputEdges]
  };
}

export function confidenceFromDecision(decision: CandidateDecision): number {
  return decision.confidence.score;
}

function identityNodes(opportunities: Opportunity[]): DecisionNode[] {
  return unique(opportunities.map((opportunity) => opportunity.protects)).map((identity) => ({
    id: identityNodeId(identity),
    type: "identity",
    title: identity,
    explanation: `${identity} is a long-lived value this Today should protect.`,
    importance: identity === "Creative Identity" ? 10 : 7,
    relatedObjectIds: [],
    protects: identity,
    confidenceContribution: identity === "Creative Identity" ? 0.18 : 0.1
  }));
}

function principleNodes(facts: Facts): DecisionNode[] {
  return [
    {
      id: PROTECT_DEEP_WORK_PRINCIPLE_ID,
      type: "principle",
      title: "Protect deep work before shallow work",
      explanation: "Meaningful work should be protected before the day fragments.",
      importance: 10,
      relatedObjectIds: facts.principles.map((principle) => principle.id),
      confidenceContribution: 0.14
    },
    {
      id: FEWER_MEANINGFUL_THINGS_PRINCIPLE_ID,
      type: "principle",
      title: "Finish fewer, more meaningful things",
      explanation: "Axis optimizes self-respect, not activity volume.",
      importance: 9,
      relatedObjectIds: facts.principles.map((principle) => principle.id),
      confidenceContribution: 0.12
    }
  ];
}

function constraintNodes(facts: Facts): DecisionNode[] {
  return [
    ...facts.resources.map((resource) => ({
      id: `constraint-resource-${resource.id}`,
      type: "constraint" as const,
      title: resource.name,
      explanation: resource.id === "resource-morning-focus" ? "this is your strongest uninterrupted focus window" : `${resource.focusWindow.start}-${resource.focusWindow.end} is available with ${resource.energy} energy`,
      importance: resource.energy === "high" ? 10 : 7,
      relatedObjectIds: [resource.id],
      confidenceContribution: resource.energy === "high" ? 0.18 : 0.1
    })),
    ...calendarConstraintNodes(facts),
    ...facts.constraints.map((constraint) => ({
      id: `constraint-${constraint.id}`,
      type: "constraint" as const,
      title: constraint.description,
      explanation: constraint.description,
      importance: constraint.id === "constraint-afternoon-friction" ? 8 : 6,
      relatedObjectIds: [constraint.id],
      confidenceContribution: constraint.id === "constraint-afternoon-friction" ? 0.14 : 0.08
    }))
  ];
}


function calendarConstraintNodes(facts: Facts): DecisionNode[] {
  if (!facts.calendarContext) {
    return facts.events.map((event) => ({
      id: `constraint-event-${event.id}`,
      type: "constraint" as const,
      title: event.title,
      explanation: `${event.title} occupies ${event.window.start}-${event.window.end}.`,
      importance: event.kind === "fixed" ? 8 : 5,
      relatedObjectIds: [event.id],
      protects: event.title === "Lunch" ? "Vitality" : "Professional Excellence",
      confidenceContribution: event.kind === "fixed" ? 0.1 : 0.05
    }));
  }

  return [
    ...facts.calendarContext.commitments.map((commitment) => ({
      id: `constraint-commitment-${commitment.id}`,
      type: "constraint" as const,
      title: commitment.title,
      explanation: `${commitment.title} occupies ${commitment.start}-${commitment.end}.`,
      importance: commitment.flexibility === "fixed" ? 8 : 5,
      relatedObjectIds: [commitment.id],
      protects: commitment.kind === "personal" ? "Vitality" : "Professional Excellence",
      confidenceContribution: commitment.flexibility === "fixed" ? 0.1 : 0.05
    })),
    ...facts.calendarContext.availabilityWindows.map((window) => ({
      id: `constraint-availability-${window.id}`,
      type: "constraint" as const,
      title: window.focusSuitable ? "Focus-suitable availability" : "Short availability gap",
      explanation: `${window.start}-${window.end}: ${window.reason}`,
      importance: window.focusSuitable ? 8 : 4,
      relatedObjectIds: [window.id],
      confidenceContribution: window.focusSuitable ? 0.1 : 0.03
    }))
  ];
}

function opportunityNodes(opportunities: Opportunity[], facts: Facts): DecisionNode[] {
  return opportunities.map((opportunity) => {
    const milestone = facts.milestones.find((item) => item.id === opportunity.milestoneId);

    return {
      id: opportunityNodeId(opportunity.id),
      type: "opportunity" as const,
      title: opportunity.title,
      explanation: opportunity.evidence.join(" / "),
      importance: opportunity.priority ?? milestone?.gravity ?? 6,
      relatedObjectIds: [opportunity.id, opportunity.pursuitId, opportunity.missionId, opportunity.milestoneId].filter(Boolean) as string[],
      protects: opportunity.protects,
      confidenceContribution: opportunity.id === "opportunity-protected-engine" ? 0.2 : 0.1
    };
  });
}

function inputEdges(nodes: DecisionNode[], opportunities: Opportunity[], facts: Facts): DecisionEdge[] {
  return opportunities.flatMap((opportunity) => {
    const edges: DecisionEdge[] = [
      edge(identityNodeId(opportunity.protects), opportunityNodeId(opportunity.id), "protects", `${opportunity.title} protects ${opportunity.protects}.`, 1),
      edge(PROTECT_DEEP_WORK_PRINCIPLE_ID, opportunityNodeId(opportunity.id), "supports", "The opportunity satisfies the deep work principle.", 0.9),
      edge(FEWER_MEANINGFUL_THINGS_PRINCIPLE_ID, opportunityNodeId(opportunity.id), "strengthens", "The opportunity favors fewer meaningful commitments.", 0.8)
    ];
    const resource = facts.resources.find((item) => item.focusWindow.start === opportunity.preferredWindow.start);
    const drift = facts.constraints.find((item) => item.id === "constraint-afternoon-friction");

    if (resource) {
      edges.push(edge(`constraint-resource-${resource.id}`, opportunityNodeId(opportunity.id), "enables", `${resource.name} enables ${opportunity.title}.`, 1));
    }

    if (drift && opportunity.preferredWindow.start < "12:00") {
      edges.push(edge(`constraint-${drift.id}`, opportunityNodeId(opportunity.id), "supports", "Morning work reduces afternoon drift risk.", 0.8));
    }

    return edges.filter((item) => nodes.some((node) => node.id === item.fromNodeId || item.fromNodeId.startsWith("constraint-")));
  });
}

function candidateFromOpportunity(opportunityNodeIdValue: string, graph: DecisionGraph, facts: Facts): Omit<CandidateDecision, "confidence"> {
  const node = mustFindNode(graph, opportunityNodeIdValue);
  const opportunityId = node.relatedObjectIds[0];
  const opportunity = generateOpportunities(facts).find((item) => item.id === opportunityId);

  if (!opportunity) {
    throw new Error(`Missing opportunity for ${opportunityNodeIdValue}`);
  }

  const supportingNodeIds = graph.edges
    .filter((edgeItem) => edgeItem.toNodeId === node.id)
    .map((edgeItem) => edgeItem.fromNodeId)
    .concat(node.id);

  return {
    id: `decision-protect-${opportunity.id}`,
    kind: "protect_session",
    title: opportunity.title,
    explanation: `Protect ${opportunity.preferredWindow.start}-${opportunity.preferredWindow.end} because it advances ${opportunity.protects} in the best available context.`,
    window: opportunity.preferredWindow,
    durationMinutes: opportunity.durationMinutes,
    protects: opportunity.protects,
    opportunityId: opportunity.id,
    pursuitId: opportunity.pursuitId,
    missionId: opportunity.missionId,
    milestoneId: opportunity.milestoneId,
    supportingNodeIds,
    competingDecisionIds: [],
    score: scoreOpportunityDecision(opportunity, graph, supportingNodeIds)
  };
}

function scoreOpportunityDecision(opportunity: Opportunity, graph: DecisionGraph, supportingNodeIds: string[]): DecisionScore {
  const supportingNodes = supportingNodeIds.map((id) => mustFindNode(graph, id));
  const focusNode = supportingNodes.find((node) => node.title === "Best focus window");
  const focusFit = focusNode?.importance ?? 7;
  const reducesDrift = supportingNodes.some((node) => node.id === "constraint-constraint-afternoon-friction");
  const identity = supportingNodes.find((node) => node.type === "identity");
  const opportunityNode = supportingNodes.find((node) => node.type === "opportunity");
  const highEnergyMismatch = opportunity.energyRequired === "high" && focusFit < 10;

  return {
    identityAlignment: identity?.importance ?? 5,
    principleAlignment: opportunity.protects === "Creative Identity" ? 10 : 7,
    constraintSatisfaction: focusFit,
    opportunityLeverage: opportunityNode?.importance ?? 6,
    driftRiskReduction: reducesDrift ? 10 : 5,
    recoveryImpact: opportunity.protects === "Recovery" ? 10 : 6,
    confidence: Math.max(5, focusFit - (highEnergyMismatch ? 1 : 0))
  };
}

function scoreSupportDecision(baseConfidence: number): DecisionScore {
  return {
    identityAlignment: baseConfidence,
    principleAlignment: 7,
    constraintSatisfaction: 8,
    opportunityLeverage: 5,
    driftRiskReduction: 4,
    recoveryImpact: baseConfidence,
    confidence: baseConfidence
  };
}


function nextDecisions(facts: Facts): CandidateDecision[] {
  if (facts.calendarContext && facts.calendarContext.commitments.some((commitment) => commitment.flexibility === "fixed")) {
    return facts.calendarContext.commitments
      .filter((commitment) => commitment.flexibility === "fixed")
      .map((commitment) => withConfidence({
        id: `decision-next-${commitment.id}`,
        kind: "next" as const,
        title: commitment.title,
        explanation: `${commitment.title} is the next boundary Axis should keep clean after protected work.`,
        window: { start: commitment.start, end: commitment.end },
        protects: commitment.kind === "personal" ? "Vitality" : "Professional Excellence",
        supportingNodeIds: [`constraint-commitment-${commitment.id}`],
        competingDecisionIds: facts.calendarContext?.commitments.filter((item) => item.id !== commitment.id).map((item) => `decision-next-${item.id}`) ?? [],
        score: scoreSupportDecision(commitment.kind === "personal" ? 6 : 7)
      }));
  }

  return facts.events.filter((event) => event.kind === "fixed").map((event) => withConfidence({
    id: `decision-next-${event.id}`,
    kind: "next" as const,
    title: event.title,
    explanation: `${event.title} is the next boundary Axis should keep clean after protected work.`,
    window: event.window,
    protects: event.title === "Lunch" ? "Vitality" : "Professional Excellence",
    supportingNodeIds: [`constraint-event-${event.id}`],
    competingDecisionIds: facts.events.filter((item) => item.id !== event.id).map((item) => `decision-next-${item.id}`),
    score: scoreSupportDecision(event.title === "Lunch" ? 6 : 7)
  }));
}

function supportDecisions(facts: Facts): CandidateDecision[] {
  return [
    withConfidence({
      id: "decision-arrive",
      kind: "timeline_support",
      title: "Arrive",
      explanation: "Begin cleanly so the protected session is not entered in a rush.",
      window: { start: "08:30", end: "08:45" },
      protects: "Attention",
      supportingNodeIds: [PROTECT_DEEP_WORK_PRINCIPLE_ID, FEWER_MEANINGFUL_THINGS_PRINCIPLE_ID],
      competingDecisionIds: [],
      score: scoreSupportDecision(8)
    }),
    withConfidence({
      id: "decision-product-pass",
      kind: "timeline_support",
      title: "Quiet product pass",
      explanation: "Use steadier afternoon energy for language and review, not core reasoning.",
      window: { start: "14:00", end: "14:45" },
      protects: "Professional Excellence",
      supportingNodeIds: [`constraint-resource-${facts.resources.find((item) => item.id === "resource-afternoon-ops")?.id ?? "resource-afternoon-ops"}`],
      competingDecisionIds: [],
      score: scoreSupportDecision(7)
    }),
    withConfidence({
      id: "decision-recovery-walk",
      kind: "timeline_support",
      title: "Recovery walk",
      explanation: "End with enough margin for tomorrow.",
      window: { start: "17:15", end: "17:45" },
      protects: "Recovery",
      supportingNodeIds: [FEWER_MEANINGFUL_THINGS_PRINCIPLE_ID],
      competingDecisionIds: [],
      score: scoreSupportDecision(8)
    })
  ];
}

function withConfidence(decision: Omit<CandidateDecision, "confidence">): CandidateDecision {
  const confidence = buildConfidence(decision);
  return { ...decision, confidence };
}

function withCompetingProtectDecisions(candidates: CandidateDecision[]): CandidateDecision[] {
  const protectIds = candidates.filter((candidate) => candidate.kind === "protect_session").map((candidate) => candidate.id);

  return candidates.map((candidate) => {
    const nextCandidate = {
      ...candidate,
      competingDecisionIds: candidate.kind === "protect_session" ? protectIds.filter((id) => id !== candidate.id) : candidate.competingDecisionIds
    };

    return { ...nextCandidate, confidence: buildConfidence(nextCandidate) };
  });
}

function highest(candidates: CandidateDecision[]): CandidateDecision {
  const sorted = [...candidates].sort((a, b) => totalDecisionScore(b) - totalDecisionScore(a));

  if (!sorted[0]) {
    throw new Error("No candidate decision available.");
  }

  return sorted[0];
}

function totalDecisionScore(candidate: CandidateDecision): number {
  const score = candidate.score;
  return (
    score.identityAlignment * 1.4 +
    score.principleAlignment +
    score.constraintSatisfaction +
    score.opportunityLeverage * 1.2 +
    score.driftRiskReduction +
    score.recoveryImpact * 0.6 +
    score.confidence
  );
}

function candidateForOpportunity(candidates: CandidateDecision[], kind: CandidateDecision["kind"], opportunityId?: string): CandidateDecision {
  const candidate = candidates.find((item) => item.kind === kind && item.opportunityId === opportunityId);

  if (!candidate) {
    throw new Error(`Missing ${kind} candidate for ${opportunityId}`);
  }

  return candidate;
}

function firstNextAfter(candidates: CandidateDecision[], protectedSession: CandidateDecision): CandidateDecision {
  const sortedCandidates = [...candidates].sort((a, b) => (a.window?.start ?? "99:99").localeCompare(b.window?.start ?? "99:99"));
  const next = sortedCandidates.find((candidate) => candidate.window && protectedSession.window && candidate.window.start >= protectedSession.window.end);

  if (next) {
    return next;
  }

  const fallback = sortedCandidates[0];

  if (!fallback) {
    throw new Error("No NEXT candidate available.");
  }

  return fallback;
}

function preferredProtectSession(candidates: CandidateDecision[], preferredDecisionId?: string): CandidateDecision | undefined {
  if (!preferredDecisionId) {
    return undefined;
  }

  return candidates.find((candidate) => candidate.id === preferredDecisionId && candidate.kind === "protect_session");
}

function decisionNode(candidate: CandidateDecision): DecisionNode {
  return {
    id: candidate.id,
    type: "decision",
    title: candidate.title,
    explanation: candidate.explanation,
    importance: Math.round(totalDecisionScore(candidate) / 7),
    relatedObjectIds: [candidate.opportunityId, candidate.pursuitId, candidate.missionId, candidate.milestoneId].filter(Boolean) as string[],
    protects: candidate.protects,
    confidenceContribution: candidate.confidence.score / 100
  };
}

function outputNodesForSelection(selected: SelectedTodayDecisions): DecisionNode[] {
  return [
    outputNode("output-theme", "Theme", selected.theme),
    outputNode("output-now", "NOW", selected.now),
    outputNode("output-next", "NEXT", selected.next),
    outputNode("output-protected-session", "Protected Session", selected.protectedSession),
    outputNode("output-confidence", "Confidence", selected.protectedSession)
  ];
}

function outputNode(id: string, title: string, candidate: CandidateDecision): DecisionNode {
  return {
    id,
    type: "output",
    title,
    explanation: `${title} is produced from ${candidate.title}.`,
    importance: 8,
    relatedObjectIds: [candidate.id],
    protects: candidate.protects
  };
}

function mustFindNode(graph: DecisionGraph, nodeId: string): DecisionNode {
  const node = graph.nodes.find((item) => item.id === nodeId);

  if (!node) {
    throw new Error(`Missing graph node ${nodeId}`);
  }

  return node;
}

function edge(fromNodeId: string, toNodeId: string, type: DecisionEdge["type"], explanation: string, weight: number): DecisionEdge {
  return {
    id: `edge-${fromNodeId}-${toNodeId}`,
    fromNodeId,
    toNodeId,
    type,
    explanation,
    weight
  };
}

function identityNodeId(identity: string): string {
  return `identity-${slug(identity)}`;
}

function opportunityNodeId(opportunityId: string): string {
  return `opportunity-${opportunityId}`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
