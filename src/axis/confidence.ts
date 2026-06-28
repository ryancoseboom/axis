import type { CandidateDecision, ConfidenceFactor, ConfidenceResult } from "./types";

export function buildConfidence(decision: Omit<CandidateDecision, "confidence">): ConfidenceResult {
  return calculateConfidence(confidenceFactorsForDecision(decision));
}

export function calculateConfidence(factors: ConfidenceFactor[]): ConfidenceResult {
  const totalWeight = factors.reduce((total, factor) => total + factor.weight, 0);
  const weightedScore = factors.reduce((total, factor) => {
    const normalizedScore = clamp(factor.score, 0, 100);
    const contribution = factor.direction === "positive" ? normalizedScore : 100 - normalizedScore;
    return total + contribution * factor.weight;
  }, 0);

  return {
    score: clamp(Math.round(weightedScore / totalWeight), 0, 100),
    factors
  };
}

export function confidenceFactorsForDecision(decision: Omit<CandidateDecision, "confidence">): ConfidenceFactor[] {
  return [
    {
      id: "identityAlignment",
      label: "strong identity alignment",
      score: toPercent(decision.score.identityAlignment),
      weight: 1.4,
      direction: "positive",
      explanation: `${decision.title} protects ${decision.protects}`
    },
    {
      id: "focusWindowFit",
      label: "good focus-window fit",
      score: toPercent(decision.score.constraintSatisfaction),
      weight: 1.2,
      direction: "positive",
      explanation: "the selected window fits the available constraints"
    },
    {
      id: "versionZeroRelevance",
      label: "Version Zero relevance",
      score: toPercent(decision.score.opportunityLeverage),
      weight: 1.1,
      direction: "positive",
      explanation: "the decision advances the current Version Zero objective"
    },
    {
      id: "conflictLevel",
      label: "low conflict",
      score: toConflictPercent(decision),
      weight: 1,
      direction: "negative",
      explanation: "there is no stronger conflicting commitment in this window"
    },
    {
      id: "driftRisk",
      label: "drift protection",
      score: toPercent(decision.score.driftRiskReduction),
      weight: 1,
      direction: "positive",
      explanation: "protecting this earlier reduces drift later"
    },
    {
      id: "constraintCertainty",
      label: "constraint certainty",
      score: toPercent(decision.score.confidence),
      weight: 0.9,
      direction: "positive",
      explanation: "the supporting constraints are clear enough to act on"
    },
    {
      id: "recoverySupport",
      label: "recovery support",
      score: toPercent(decision.score.recoveryImpact),
      weight: 0.7,
      direction: "positive",
      explanation: "the decision leaves enough margin for the rest of the day"
    }
  ];
}

export function overallConfidence(results: ConfidenceResult[]): ConfidenceResult {
  const allFactors = results.flatMap((result) => result.factors);
  return calculateConfidence(allFactors);
}

function toPercent(score: number): number {
  return clamp(score * 10, 0, 100);
}

function toConflictPercent(decision: Omit<CandidateDecision, "confidence">): number {
  const conflictPenalty = Math.min(70, decision.competingDecisionIds.length * 12);
  const contextPenalty = Math.max(0, 10 - decision.score.confidence) * 5;
  return clamp(conflictPenalty + contextPenalty, 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
