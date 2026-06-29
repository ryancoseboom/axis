import { generateDevelopmentSignals, recordPracticeEntryInMemory, type PracticeEntryInput } from "./pillars";
import { completeProgramSession, type ProgramSessionInput } from "./programs";
import type { Constraint, PillarMemory, Resource, System, UserContext } from "./types";

export type ObservationType =
  | "completed_program_session"
  | "practice_entry"
  | "work_block"
  | "creative_block"
  | "missed_session"
  | "recovery"
  | "energy"
  | "note";

export type ObservationSource =
  | "manual"
  | "inferred"
  | "future_calendar"
  | "future_health"
  | "future_integration";

export type ObservationEvidence = {
  label: string;
  value?: string;
  relatedObjectId?: string;
};

export type CapturedObservationInput = {
  id?: string;
  type: ObservationType;
  source?: ObservationSource;
  date?: string;
  title: string;
  notes?: string;
  pillarId?: string;
  evidence?: ObservationEvidence[];
  programSession?: Omit<ProgramSessionInput, "date"> & { date?: string };
  practiceEntry?: Omit<PracticeEntryInput, "date" | "title"> & { date?: string; title?: string };
  missedSession?: {
    pillarId?: string;
    title?: string;
  };
  recovery?: {
    durationMinutes?: number;
    quality?: "low" | "steady" | "high";
    description?: string;
  };
};

export type CapturedObservation = {
  id: string;
  type: ObservationType;
  source: ObservationSource;
  date: string;
  title: string;
  notes: string;
  pillarId?: string;
  evidence: ObservationEvidence[];
};

export type CapturedOutcome = {
  id: string;
  type: "memory_updated" | "program_progressed" | "signal_updated" | "capacity_context_updated" | "evidence_recorded";
  title: string;
  description: string;
  pillarId?: string;
  relatedObjectIds: string[];
};

export type TodayCaptured = {
  id: string;
  date: string;
  observations: CapturedObservation[];
  outcomes: CapturedOutcome[];
};

export type TodayCaptureInput = {
  date: string;
  observations: CapturedObservationInput[];
};

export type TodayCaptureResult = {
  todayCaptured: TodayCaptured;
  context: UserContext;
};

export type TodayCapturedSummary = {
  whatMovedForward: string[];
  whatWasMissed: string[];
  whatMayMatterTomorrow: string[];
};

export function captureToday(input: TodayCaptureInput, context: UserContext): TodayCaptureResult {
  let nextContext = { ...context, pillarMemory: ensurePillarMemory(context.pillarMemory) };
  const observations: CapturedObservation[] = [];
  const outcomes: CapturedOutcome[] = [];

  input.observations.forEach((observationInput, index) => {
    const observation = normalizeObservation(observationInput, input.date, index);
    observations.push(observation);

    if (observationInput.type === "completed_program_session" && observationInput.programSession) {
      const result = completeProgramSession(nextContext.pillarMemory, {
        ...observationInput.programSession,
        date: observationInput.programSession.date ?? observation.date
      });
      const developmentSignals = generateDevelopmentSignals(result.memory, observation.date);

      nextContext = {
        ...nextContext,
        pillarMemory: {
          ...result.memory,
          developmentSignals
        }
      };
      outcomes.push(
        outcome("program-progressed", observation, "program_progressed", result.practiceEntry.title, "Program progression was updated from the completed session.", [
          result.session.id,
          result.practiceEntry.id,
          result.progression.currentDay.id
        ]),
        outcome("signals-updated", observation, "signal_updated", "Development signals refreshed.", "Future recommendations can use the new program position.", developmentSignals.map((signal) => signal.id))
      );
      return;
    }

    if (observationInput.type === "practice_entry" && observationInput.practiceEntry) {
      const practiceInput: PracticeEntryInput = {
        ...observationInput.practiceEntry,
        pillarId: observationInput.practiceEntry.pillarId ?? observation.pillarId ?? "pillar-unknown",
        date: observationInput.practiceEntry.date ?? observation.date,
        title: observationInput.practiceEntry.title ?? observation.title,
        source: observationInput.practiceEntry.source ?? (observation.source === "manual" ? "manual" : "inferred")
      };
      const memory = recordPracticeEntryInMemory(nextContext.pillarMemory, practiceInput);
      const developmentSignals = generateDevelopmentSignals(memory, observation.date);

      nextContext = {
        ...nextContext,
        pillarMemory: {
          ...memory,
          developmentSignals
        }
      };
      const entry = nextContext.pillarMemory.practiceEntries[nextContext.pillarMemory.practiceEntries.length - 1];
      outcomes.push(
        outcome("practice-recorded", observation, "memory_updated", `${observation.title} was recorded.`, "Practice history and KnowledgeState were updated.", entry ? [entry.id] : []),
        outcome("signals-updated", observation, "signal_updated", "Development signals refreshed.", "Future recommendations can use the captured practice.", developmentSignals.map((signal) => signal.id))
      );
      return;
    }

    if (observationInput.type === "recovery") {
      const capacityFacts = recoveryCapacityFacts(observation);

      nextContext = {
        ...nextContext,
        constraints: upsertById(nextContext.constraints, capacityFacts.constraints),
        resources: upsertById(nextContext.resources, capacityFacts.resources),
        systems: upsertById(nextContext.systems, capacityFacts.systems)
      };
      outcomes.push(outcome("recovery-captured", observation, "capacity_context_updated", "Recovery was noted.", "Capacity context can account for this recovery signal.", [
        ...capacityFacts.constraints.map((item) => item.id),
        ...capacityFacts.resources.map((item) => item.id),
        ...capacityFacts.systems.map((item) => item.id)
      ]));
      return;
    }

    if (observationInput.type === "missed_session") {
      outcomes.push(outcome("missed-recorded", observation, "evidence_recorded", `${observation.title} was noted.`, "This is context for tomorrow, not a verdict.", []));
      return;
    }

    outcomes.push(outcome("observation-recorded", observation, "evidence_recorded", `${observation.title} was noted.`, "The observation is available as local evidence.", []));
  });

  return {
    todayCaptured: {
      id: `today-captured-${slug(input.date)}`,
      date: input.date,
      observations,
      outcomes
    },
    context: nextContext
  };
}

export function buildTodayCapturedSummary(todayCaptured: TodayCaptured): TodayCapturedSummary {
  return {
    whatMovedForward: todayCaptured.outcomes
      .filter((outcomeItem) => outcomeItem.type === "program_progressed" || outcomeItem.type === "memory_updated")
      .map((outcomeItem) => outcomeItem.title),
    whatWasMissed: todayCaptured.observations
      .filter((observation) => observation.type === "missed_session")
      .map((observation) => `${observation.title} did not happen today. That is useful context.`),
    whatMayMatterTomorrow: todayCaptured.outcomes
      .filter((outcomeItem) => outcomeItem.type === "signal_updated" || outcomeItem.type === "capacity_context_updated")
      .map((outcomeItem) => outcomeItem.description)
  };
}

function normalizeObservation(input: CapturedObservationInput, fallbackDate: string, index: number): CapturedObservation {
  const date = input.date ?? fallbackDate;

  return {
    id: input.id ?? `observation-${slug(date)}-${index + 1}`,
    type: input.type,
    source: input.source ?? "manual",
    date,
    title: input.title.trim(),
    notes: input.notes?.trim() ?? "",
    pillarId: input.pillarId ?? input.practiceEntry?.pillarId ?? input.missedSession?.pillarId,
    evidence: input.evidence ?? []
  };
}

function ensurePillarMemory(memory: PillarMemory | undefined): PillarMemory {
  return memory ?? { pillars: [], practiceEntries: [] };
}

function outcome(
  suffix: string,
  observation: CapturedObservation,
  type: CapturedOutcome["type"],
  title: string,
  description: string,
  relatedObjectIds: string[]
): CapturedOutcome {
  return {
    id: `outcome-${observation.id}-${suffix}`,
    type,
    title,
    description,
    pillarId: observation.pillarId,
    relatedObjectIds
  };
}

function recoveryCapacityFacts(observation: CapturedObservation): { constraints: Constraint[]; resources: Resource[]; systems: System[] } {
  return {
    constraints: [
      {
        id: `constraint-recovery-${slug(observation.id)}`,
        description: observation.notes ? `Recovery context: ${observation.notes}` : "Recovery context was captured today."
      }
    ],
    resources: [
      {
        id: `resource-recovery-${slug(observation.id)}`,
        name: "Recovery context",
        energy: "steady",
        focusWindow: { start: "16:00", end: "18:00" }
      }
    ],
    systems: [
      {
        id: `system-recovery-${slug(observation.id)}`,
        name: "Recovery",
        protects: "Capacity for tomorrow",
        currentState: "healthy"
      }
    ]
  };
}

function upsertById<T extends { id: string }>(existing: T[], additions: T[]): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of additions) {
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
