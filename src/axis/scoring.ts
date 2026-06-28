import type { Facts, Opportunity, ScoreBreakdown, ScoredOpportunity } from "./types";

const energyValue = {
  low: 1,
  steady: 2,
  high: 3
};

export function scoreOpportunity(opportunity: Opportunity, facts: Facts): ScoredOpportunity {
  const mission = facts.missions.find((item) => item.id === opportunity.missionId);
  const milestone = facts.milestones.find((item) => item.id === opportunity.milestoneId);
  const system = facts.systems.find((item) => item.id === opportunity.protectsSystemId);
  const resource = facts.resources.find((item) => item.focusWindow.start === opportunity.preferredWindow.start);

  const score: ScoreBreakdown = {
    selfRespect: mission?.id === "mission-version-zero" ? 10 : 7,
    missionProgress: mission ? 9 : 4,
    systemProtection: system?.currentState === "strained" ? 9 : system ? 6 : 2,
    milestoneGravity: milestone?.gravity ?? 4,
    driftReduction: opportunity.preferredWindow.start < "12:00" ? 10 : 6,
    energyFit: resource ? Math.max(4, 10 - Math.abs(energyValue[resource.energy] - energyValue[opportunity.energyRequired]) * 3) : 6,
    contextFit: overlapsFixedEvent(opportunity, facts) ? 2 : 9,
    opportunityCost: opportunity.durationMinutes <= 75 ? 8 : 5
  };

  return {
    ...opportunity,
    score,
    totalScore: totalScore(score),
    reasoning: buildReasoning(opportunity, facts, score)
  };
}

function totalScore(score: ScoreBreakdown): number {
  return (
    score.selfRespect * 1.6 +
    score.missionProgress * 1.3 +
    score.systemProtection +
    score.milestoneGravity +
    score.driftReduction +
    score.energyFit +
    score.contextFit +
    score.opportunityCost * 0.8
  );
}

function overlapsFixedEvent(opportunity: Opportunity, facts: Facts): boolean {
  return facts.events.some((event) => {
    if (event.kind !== "fixed") {
      return false;
    }

    return opportunity.preferredWindow.start < event.window.end && opportunity.preferredWindow.end > event.window.start;
  });
}

function buildReasoning(opportunity: Opportunity, facts: Facts, score: ScoreBreakdown): string[] {
  const mission = facts.missions.find((item) => item.id === opportunity.missionId);
  const pursuit = facts.pursuits.find((item) => item.id === opportunity.pursuitId);

  return [
    `Protects ${opportunity.protects}`,
    mission?.name ?? "Named mission",
    pursuit?.name ?? "Current pursuit",
    `Self-respect ${score.selfRespect}/10`,
    `Context fit ${score.contextFit}/10`
  ];
}
