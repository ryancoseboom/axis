import {
  buildDecisionGraph,
  completeDecisionGraph,
  generateCandidateDecisions,
  selectTodayFromCandidates
} from "./decisionGraph";
import { overallConfidence } from "./confidence";
import { buildTodayReasoning } from "./reasoning";
import type {
  CandidateDecision,
  Facts,
  GeneratedToday,
  ScoredOpportunity,
  TimelineItem,
  TodayGenerationOptions,
  UserContext
} from "./types";

export function generateToday(userContext: UserContext, options: TodayGenerationOptions = {}): GeneratedToday {
  const facts = gatherFacts(userContext);
  const inputGraph = buildDecisionGraph(facts);
  const candidateDecisions = generateCandidateDecisions(inputGraph, facts);
  const selectedDecisions = selectTodayFromCandidates(candidateDecisions, options.preferredDecisionId);
  const decisionGraph = completeDecisionGraph(inputGraph, candidateDecisions, selectedDecisions);
  const reasoning = buildTodayReasoning(decisionGraph, selectedDecisions);
  const protectedSession = toProtectedSession(selectedDecisions.protectedSession, reasoning.outputs.protectedSession.reasonIds);
  const confidenceByOutput = {
    today: overallConfidence([
      selectedDecisions.theme.confidence,
      selectedDecisions.now.confidence,
      selectedDecisions.next.confidence,
      selectedDecisions.protectedSession.confidence
    ]),
    now: selectedDecisions.now.confidence,
    next: selectedDecisions.next.confidence,
    protectedSession: selectedDecisions.protectedSession.confidence,
    timeline: Object.fromEntries(selectedDecisions.timeline.map((decision) => [decision.id, decision.confidence]))
  };
  const primaryPursuit = facts.pursuits.find((pursuit) => pursuit.id === protectedSession.pursuitId) ?? facts.pursuits[0];

  return {
    theme: selectedDecisions.theme.title,
    primaryPursuit,
    protectedSession,
    timeline: selectedDecisions.timeline.map(toTimelineItem),
    reasoning: titlesFor(reasoning.outputs.now.reasonIds, reasoning.graph),
    confidence: confidenceByOutput.today.score,
    confidenceByOutput,
    decisionGraph,
    candidateDecisions,
    selectedDecisions,
    reasonGraph: reasoning.graph,
    reasonedOutputs: reasoning.outputs
  };
}

export function gatherFacts(userContext: UserContext): Facts {
  return {
    principles: userContext.principles,
    pursuits: userContext.pursuits,
    missions: userContext.missions,
    milestones: userContext.milestones,
    systems: userContext.systems,
    events: userContext.events,
    constraints: userContext.constraints,
    resources: userContext.resources,
    calendarContext: userContext.calendarContext,
    pillarMemory: userContext.pillarMemory
  };
}

function toProtectedSession(decision: CandidateDecision, reasonIds: string[]): ScoredOpportunity {
  return {
    id: decision.opportunityId ?? decision.id,
    title: decision.title,
    pursuitId: decision.pursuitId ?? "pursuit-axis",
    missionId: decision.missionId ?? "mission-version-zero",
    durationMinutes: decision.durationMinutes ?? 0,
    preferredWindow: decision.window ?? { start: "08:45", end: "10:00" },
    evidence: ["Version Zero", "Strongest focus window", "Highest leverage", "Prevents drift"],
    protects: decision.protects,
    milestoneId: decision.milestoneId,
    energyRequired: "high",
    score: {
      selfRespect: decision.score.identityAlignment,
      missionProgress: decision.score.principleAlignment,
      systemProtection: decision.score.recoveryImpact,
      milestoneGravity: decision.score.opportunityLeverage,
      driftReduction: decision.score.driftRiskReduction,
      energyFit: decision.score.constraintSatisfaction,
      contextFit: decision.score.confidence,
      opportunityCost: decision.score.recoveryImpact
    },
    totalScore: decision.score.confidence,
    reasoning: reasonIds
  };
}

function toTimelineItem(decision: CandidateDecision): TimelineItem {
  return {
    time: decision.window ? `${decision.window.start}-${decision.window.end}` : "",
    title: decision.title,
    description: timelineDescription(decision),
    protects: decision.protects,
    kind: decision.kind === "protect_session" ? "protected" : decision.kind === "next" ? "fixed" : "support"
  };
}

function timelineDescription(decision: CandidateDecision): string {
  if (decision.kind === "protect_session") {
    return "Do this now.";
  }

  if (decision.kind === "next") {
    return "Keep this clean. Do not let it consume the day.";
  }

  return decision.explanation;
}

function titlesFor(reasonIds: string[], graph: GeneratedToday["reasonGraph"]): string[] {
  return reasonIds
    .map((reasonId) => graph.reasons.find((reason) => reason.id === reasonId)?.title)
    .filter(Boolean) as string[];
}
