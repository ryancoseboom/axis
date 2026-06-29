import type { DayWindow, DevelopmentSignal, Facts, Opportunity } from "./types";

export function generateOpportunities(facts: Facts): Opportunity[] {
  const versionZeroMission = facts.missions.find((mission) => mission.id === "mission-version-zero");
  const recoveryMission = facts.missions.find((mission) => mission.id === "mission-recovery");
  const engineMilestone = facts.milestones.find((milestone) => milestone.id === "milestone-engine-slice");
  const deepWorkSystem = facts.systems.find((system) => system.id === "system-deep-work");
  const recoverySystem = facts.systems.find((system) => system.id === "system-evening-recovery");
  const focusResource = facts.resources.find((resource) => resource.id === "resource-morning-focus");
  const focusWindow = focusResource?.focusWindow ?? { start: "08:45", end: "10:00" };
  const primaryTitle = primaryOpportunityTitle(versionZeroMission?.currentNeed);

  return [
    ...developmentSignalOpportunities(facts, focusWindow),
    {
      id: "opportunity-protected-engine",
      title: primaryTitle,
      pursuitId: versionZeroMission?.pursuitId ?? "pursuit-today",
      missionId: versionZeroMission?.id ?? "mission-version-zero",
      durationMinutes: durationForWindow(focusWindow),
      preferredWindow: focusWindow,
      evidence: ["Named morning intention", "Strongest focus window", "Highest leverage", "Prevents drift"],
      protects: "Creative Identity",
      protectsSystemId: deepWorkSystem?.id,
      milestoneId: engineMilestone?.id,
      energyRequired: "high"
    },
    {
      id: "opportunity-product-notes",
      title: "Clarify the Today screen language",
      pursuitId: versionZeroMission?.pursuitId ?? "pursuit-today",
      missionId: versionZeroMission?.id ?? "mission-version-zero",
      durationMinutes: 45,
      preferredWindow: { start: "14:00", end: "14:45" },
      evidence: ["Today is the product", "Reduces uncertainty", "Improves trust"],
      protects: "Professional Excellence",
      milestoneId: engineMilestone?.id,
      energyRequired: "steady"
    },
    {
      id: "opportunity-recovery-walk",
      title: "Take a real recovery walk before the evening",
      pursuitId: recoveryMission?.pursuitId ?? "pursuit-lifting",
      missionId: recoveryMission?.id ?? "mission-recovery",
      durationMinutes: 30,
      preferredWindow: { start: "17:15", end: "17:45" },
      evidence: ["Tomorrow matters", "Lower evening strain", "Protects baseline"],
      protects: "Recovery",
      protectsSystemId: recoverySystem?.id,
      energyRequired: "low"
    }
  ];
}


function primaryOpportunityTitle(currentNeed?: string): string {
  if (!currentNeed) {
    return "Protect the first honest block of the day";
  }

  return currentNeed;
}

function durationForWindow(window: DayWindow): number {
  const [startHour = "0", startMinute = "0"] = window.start.split(":");
  const [endHour = "0", endMinute = "0"] = window.end.split(":");
  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);

  return Math.max(25, end - start);
}


function developmentSignalOpportunities(facts: Facts, focusWindow: DayWindow): Opportunity[] {
  const signals = facts.pillarMemory?.developmentSignals ?? [];

  return signals.slice(0, 4).map((signal, index) => developmentSignalOpportunity(signal, facts, index, focusWindow));
}

function developmentSignalOpportunity(signal: DevelopmentSignal, facts: Facts, index: number, focusWindow: DayWindow): Opportunity {
  const pillar = facts.pillarMemory?.pillars.find((item) => item.id === signal.pillarId);
  const preferredWindow = index === 0 ? focusWindow : { start: "14:00", end: "14:45" };

  return {
    id: `opportunity-development-${signal.id}`,
    title: signal.title,
    pursuitId: signal.pillarId,
    missionId: `mission-development-${signal.pillarId}`,
    durationMinutes: Math.min(75, durationForWindow(preferredWindow)),
    preferredWindow,
    evidence: [signal.description, `Protects ${signal.protects}`, signal.type.replace(/_/g, " ")],
    protects: signal.protects,
    energyRequired: signal.type === "review" || signal.type === "overdue_review" ? "steady" : "high",
    developmentSignalId: signal.id,
    priority: signal.priority + (pillar?.identityWeight ?? 0) / 2
  };
}
