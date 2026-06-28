import { explainTodayOutput } from "./explainability";
import type { CandidateDecision, ConfidenceContributor, GeneratedToday } from "./types";

export type BecausePresentation = {
  explanation: string;
  confidenceLine: string;
};

export type AdjustAlternative = {
  id: string;
  title: string;
  detail: string;
  protects: string;
  sourceDecisionId: string;
};

export function buildBecausePresentation(today: GeneratedToday): BecausePresentation {
  const explanation = explainTodayOutput(today, { type: "now" });
  const confidence = explainTodayOutput(today, { type: "confidence" });

  return {
    explanation: explanation.conciseExplanation,
    confidenceLine: confidenceLine(confidence.confidenceContributors)
  };
}

export function buildAdjustAlternatives(today: GeneratedToday, decisionId = today.selectedDecisions.now.id): AdjustAlternative[] {
  const decision = today.candidateDecisions.find((candidate) => candidate.id === decisionId);

  if (!decision) {
    return [];
  }

  const competing = decision.competingDecisionIds
    .map((candidateId) => today.candidateDecisions.find((candidate) => candidate.id === candidateId))
    .filter(Boolean) as CandidateDecision[];
  const laterCandidates = today.candidateDecisions.filter((candidate) => {
    if (!candidate.window || !decision.window || candidate.id === decision.id) {
      return false;
    }

    return candidate.kind === "protect_session" && candidate.window.start > decision.window.end;
  });

  return uniqueById([...competing, ...laterCandidates].filter((candidate) => candidate.kind === "protect_session"))
    .sort((a, b) => b.confidence.score - a.confidence.score)
    .slice(0, 3)
    .map((candidate) => ({
      id: `adjust-${candidate.id}`,
      title: candidate.title,
      detail: `${timeLabel(candidate)} / Protects ${candidate.protects}`,
      protects: candidate.protects,
      sourceDecisionId: candidate.id
    }));
}

function confidenceLine(contributors: ConfidenceContributor[]): string {
  const labels = contributors.slice(0, 3).map((contributor) => contributor.label);

  if (labels.length === 0) {
    return "Confidence reflects the current Decision Graph.";
  }

  return `Confidence reflects ${joinNaturally(labels)}.`;
}

function joinNaturally(values: string[]): string {
  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function timeLabel(candidate: CandidateDecision): string {
  return candidate.window ? `${candidate.window.start}-${candidate.window.end}` : "Later";
}

function uniqueById(candidates: CandidateDecision[]): CandidateDecision[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) {
      return false;
    }

    seen.add(candidate.id);
    return true;
  });
}
