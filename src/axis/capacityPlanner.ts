import type { Constraint, Facts, Resource, System } from "./types";

export type CapacityLoad = "low" | "medium" | "high";

export type CapacityItem = {
  id: string;
  title: string;
  durationMinutes: number;
  pillarId?: string;
  recoveryCost?: CapacityLoad;
  cognitiveLoad?: CapacityLoad;
  physicalLoad?: CapacityLoad;
  preparationMinutes?: number;
  travelMinutes?: number;
  momentumValue?: number;
};

export type FixedCommitment = CapacityItem & {
  kind: "fixed";
  day: string;
  start: string;
  end: string;
};

export type FlexibleCommitment = CapacityItem & {
  kind: "flexible";
  preferredDays?: string[];
  movable: true;
};

export type PlannedSession = CapacityItem & {
  kind: "planned_session";
  day?: string;
  userScheduled?: boolean;
};

export type WeeklyCapacity = {
  weekStart: string;
  totalMinutes: number;
  reserveMinutes?: number;
};

export type MomentumRequirement = {
  pillarId: string;
  pillarName: string;
  minimumSessions: number;
  minimumMinutes?: number;
};

export type WeeklyPlan = {
  id: string;
  weekStart: string;
  capacity: WeeklyCapacity;
  fixedCommitments: FixedCommitment[];
  flexibleCommitments: FlexibleCommitment[];
  plannedSessions: PlannedSession[];
  momentumRequirements: MomentumRequirement[];
};

export type PillarMomentumStatus = MomentumRequirement & {
  plannedSessions: number;
  plannedMinutes: number;
  missingSessions: number;
  missingMinutes: number;
  supported: boolean;
};

export type WeeklyCapacitySummary = {
  weekStart: string;
  totalCapacityMinutes: number;
  reserveMinutes: number;
  fixedCommitmentMinutes: number;
  flexibleCommitmentMinutes: number;
  plannedSessionMinutes: number;
  availableAfterFixedMinutes: number;
  remainingCapacityMinutes: number;
  overloaded: boolean;
  movableCommitments: FlexibleCommitment[];
  momentum: PillarMomentumStatus[];
  underSupportedPillars: PillarMomentumStatus[];
};

export type CapacityPlannerFacts = Pick<Facts, "constraints" | "resources" | "systems">;

export function calculateWeeklyCapacity(plan: WeeklyPlan): WeeklyCapacitySummary {
  const reserveMinutes = plan.capacity.reserveMinutes ?? 0;
  const fixedCommitmentMinutes = totalMinutes(plan.fixedCommitments);
  const flexibleCommitmentMinutes = totalMinutes(plan.flexibleCommitments);
  const plannedSessionMinutes = totalMinutes(plan.plannedSessions);
  const availableAfterFixedMinutes = plan.capacity.totalMinutes - reserveMinutes - fixedCommitmentMinutes;
  const remainingCapacityMinutes = availableAfterFixedMinutes - flexibleCommitmentMinutes - plannedSessionMinutes;
  const momentum = calculateMomentumStatus(plan);

  return {
    weekStart: plan.weekStart,
    totalCapacityMinutes: plan.capacity.totalMinutes,
    reserveMinutes,
    fixedCommitmentMinutes,
    flexibleCommitmentMinutes,
    plannedSessionMinutes,
    availableAfterFixedMinutes,
    remainingCapacityMinutes,
    overloaded: remainingCapacityMinutes < 0 || availableAfterFixedMinutes < 0,
    movableCommitments: [...plan.flexibleCommitments],
    momentum,
    underSupportedPillars: momentum.filter((item) => !item.supported)
  };
}

export function remainingWeeklyCapacity(plan: WeeklyPlan): number {
  return calculateWeeklyCapacity(plan).remainingCapacityMinutes;
}

export function isOverloadedWeek(plan: WeeklyPlan): boolean {
  return calculateWeeklyCapacity(plan).overloaded;
}

export function underSupportedPillars(plan: WeeklyPlan): PillarMomentumStatus[] {
  return calculateWeeklyCapacity(plan).underSupportedPillars;
}

export function capacityPlanToDecisionGraphFacts(plan: WeeklyPlan): CapacityPlannerFacts {
  const summary = calculateWeeklyCapacity(plan);

  return {
    constraints: capacityConstraints(summary),
    resources: capacityResources(summary),
    systems: capacitySystems(summary)
  };
}

function calculateMomentumStatus(plan: WeeklyPlan): PillarMomentumStatus[] {
  return plan.momentumRequirements.map((requirement) => {
    const sessions = [...plan.fixedCommitments, ...plan.flexibleCommitments, ...plan.plannedSessions].filter((session) => session.pillarId === requirement.pillarId);
    const plannedSessions = sessions.length;
    const plannedMinutes = totalMinutes(sessions);
    const minimumMinutes = requirement.minimumMinutes ?? 0;
    const missingSessions = Math.max(0, requirement.minimumSessions - plannedSessions);
    const missingMinutes = Math.max(0, minimumMinutes - plannedMinutes);

    return {
      ...requirement,
      plannedSessions,
      plannedMinutes,
      missingSessions,
      missingMinutes,
      supported: missingSessions === 0 && missingMinutes === 0
    };
  });
}

function capacityConstraints(summary: WeeklyCapacitySummary): Constraint[] {
  const constraints: Constraint[] = [
    {
      id: "constraint-weekly-capacity-remaining",
      description: `Weekly capacity remaining: ${summary.remainingCapacityMinutes} minutes.`
    }
  ];

  if (summary.overloaded) {
    constraints.push({
      id: "constraint-weekly-capacity-overloaded",
      description: `This week is overloaded by ${Math.abs(summary.remainingCapacityMinutes)} minutes.`
    });
  }

  for (const pillar of summary.underSupportedPillars) {
    constraints.push({
      id: `constraint-momentum-${slug(pillar.pillarId)}`,
      description: `${pillar.pillarName} is under-supported this week: ${pillar.missingSessions} sessions and ${pillar.missingMinutes} minutes short.`
    });
  }

  return constraints;
}

function capacityResources(summary: WeeklyCapacitySummary): Resource[] {
  return [
    {
      id: "resource-weekly-capacity",
      name: "Weekly capacity",
      energy: summary.overloaded ? "low" : summary.remainingCapacityMinutes >= 180 ? "high" : "steady",
      focusWindow: { start: "08:00", end: "10:00" }
    }
  ];
}

function capacitySystems(summary: WeeklyCapacitySummary): System[] {
  return summary.momentum.map((pillar) => ({
    id: `system-momentum-${slug(pillar.pillarId)}`,
    name: `${pillar.pillarName} momentum`,
    protects: `${pillar.minimumSessions} sessions${pillar.minimumMinutes ? ` / ${pillar.minimumMinutes} minutes` : ""} per week`,
    currentState: pillar.supported ? "healthy" : pillar.plannedSessions > 0 ? "strained" : "neglected"
  }));
}

function totalMinutes(items: CapacityItem[]): number {
  return items.reduce((total, item) => total + itemTotalMinutes(item), 0);
}

function itemTotalMinutes(item: CapacityItem): number {
  return item.durationMinutes + (item.preparationMinutes ?? 0) + (item.travelMinutes ?? 0);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
