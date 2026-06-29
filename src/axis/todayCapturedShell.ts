import { appendTodayCaptured } from "./localPersistence";
import { getCurrentProgramDay, sampleWeightliftingProgram } from "./programs";
import { sampleRyanSetup } from "./setup";
import { buildConfirmedSetupContext, getConfirmedSetupContext, setConfirmedSetupContext } from "./setupHandoff";
import { getTodayCaptureContext, type TodayCaptureContext } from "./todayCaptureContext";
import {
  buildTodayCapturedSummary,
  captureToday,
  type CapturedObservationInput,
  type TodayCapturedSummary
} from "./todayCaptured";
import type { TodayCaptureResult } from "./todayCaptured";
import type { Program, UserContext } from "./types";

export type TodayCapturedShellAction =
  | "completed_lifting_session"
  | "bjj_practice_entry"
  | "work_block"
  | "creative_block"
  | "missed_session"
  | "recovery"
  | "note";

export type TodayCapturedShellInput = {
  action: TodayCapturedShellAction;
  date?: string;
  note?: string;
};

export type TodayCapturedShellBatchInput = {
  actions: TodayCapturedShellAction[];
  date?: string;
  note?: string;
};

export type TodayCapturedShellResult = TodayCaptureResult & {
  summary: TodayCapturedSummary;
};

export type TodayCapturedShellOption = {
  action: TodayCapturedShellAction;
  label: string;
  description: string;
  selected: boolean;
  reason?: string;
};

const DEFAULT_CAPTURE_DATE = "2026-06-28";
const FALLBACK_OPTIONS: Omit<TodayCapturedShellOption, "selected" | "reason">[] = [
  { action: "completed_lifting_session", label: "Completed lifting session", description: "Records the current lifting program day." },
  { action: "bjj_practice_entry", label: "BJJ practice entry", description: "Records Arm Bar practice and updates KnowledgeState." },
  { action: "work_block", label: "Work block", description: "Captures protected work as evidence." },
  { action: "creative_block", label: "Creative block", description: "Captures writing, production, or music work." },
  { action: "missed_session", label: "Missed session", description: "Keeps evidence without judgment." },
  { action: "recovery", label: "Recovery note", description: "Adds recovery context to capacity facts." },
  { action: "note", label: "Simple note", description: "Captures a plain observation." }
];

export function submitTodayCapturedShellObservation(
  input: TodayCapturedShellInput,
  context: UserContext = getConfirmedSetupContext() ?? buildConfirmedSetupContext(sampleRyanSetup)
): TodayCapturedShellResult {
  return submitTodayCapturedShellObservations({
    actions: [input.action],
    date: input.date,
    note: input.note
  }, context);
}

export function submitTodayCapturedShellObservations(
  input: TodayCapturedShellBatchInput,
  context: UserContext = getConfirmedSetupContext() ?? buildConfirmedSetupContext(sampleRyanSetup)
): TodayCapturedShellResult {
  const date = input.date ?? DEFAULT_CAPTURE_DATE;
  const actions: TodayCapturedShellAction[] = input.actions.length > 0 ? input.actions : ["note"];
  const result = captureToday({
    date,
    observations: actions.map((action) => observationForShellAction({ action, date, note: input.note }, context, date))
  }, context);
  const summary = buildTodayCapturedSummary(result.todayCaptured);

  setConfirmedSetupContext(result.context);
  appendTodayCaptured(result.todayCaptured);

  return {
    ...result,
    summary
  };
}

export function buildTodayCapturedShellOptions(context: TodayCaptureContext | undefined = getTodayCaptureContext()): TodayCapturedShellOption[] {
  if (!context) {
    return FALLBACK_OPTIONS.map((option) => ({ ...option, selected: false }));
  }

  const selected = selectedActionsForContext(context);

  return FALLBACK_OPTIONS.map((option) => ({
    ...option,
    selected: selected.has(option.action),
    reason: selected.has(option.action) ? reasonFor(option.action, context) : undefined
  })).sort((a, b) => Number(b.selected) - Number(a.selected));
}

export function buildTodayCapturedShellSummaryLines(summary: TodayCapturedSummary): string[] {
  return [
    ...summary.whatMovedForward,
    ...summary.whatWasMissed,
    ...summary.whatMayMatterTomorrow
  ];
}

function observationForShellAction(input: TodayCapturedShellInput, context: UserContext, date: string): CapturedObservationInput {
  if (input.action === "completed_lifting_session") {
    const program = liftingProgram(context) ?? sampleWeightliftingProgram;
    const progression = getCurrentProgramDay(program, context.pillarMemory?.completedProgramSessions ?? []);
    const movementIds = progression.currentDay.movementOptions.slice(0, 2).map((movement) => movement.id);

    return {
      type: "completed_program_session",
      title: `Completed ${progression.currentDay.name}`,
      pillarId: program.pillarId,
      notes: input.note,
      programSession: {
        programId: program.id,
        programDayId: progression.currentDay.id,
        date,
        movementsCompleted: movementIds,
        setsCompleted: movementIds.length * 3,
        notes: input.note,
        perceivedEffort: "medium"
      }
    };
  }

  if (input.action === "bjj_practice_entry") {
    return {
      type: "practice_entry",
      title: "Practiced Arm Bar",
      pillarId: "pillar-bjj",
      notes: input.note,
      practiceEntry: {
        pillarId: "pillar-bjj",
        topics: ["topic-arm-bar"],
        notes: input.note,
        confidence: 6,
        familiarity: 5,
        intensity: "medium"
      }
    };
  }

  if (input.action === "missed_session") {
    const missedPillarId = todayContextPillarId() ?? "pillar-bjj";
    const missedTitle = missedPillarId === "pillar-lifting" ? "Missed lifting session" : "Missed planned session";

    return {
      type: "missed_session",
      title: missedTitle,
      pillarId: missedPillarId,
      notes: input.note,
      missedSession: {
        pillarId: missedPillarId,
        title: missedTitle
      }
    };
  }

  if (input.action === "work_block") {
    const captureContext = getTodayCaptureContext();

    return {
      type: "work_block",
      title: captureContext?.protectedSession.title ?? "Protected work block",
      notes: input.note,
      evidence: captureContext ? [{ label: "Protected Session", value: captureContext.protectedSession.title }] : []
    };
  }

  if (input.action === "creative_block") {
    const captureContext = getTodayCaptureContext();

    return {
      type: "creative_block",
      title: captureContext?.protectedSession.protects === "Music" ? captureContext.protectedSession.title : "Creative block",
      pillarId: "pillar-music",
      notes: input.note,
      evidence: captureContext ? [{ label: "Today", value: captureContext.theme }] : []
    };
  }

  if (input.action === "recovery") {
    return {
      type: "recovery",
      title: "Recovery noted",
      notes: input.note ?? "A quieter recovery window mattered today.",
      recovery: {
        durationMinutes: 60,
        quality: "steady",
        description: input.note
      }
    };
  }

  return {
    type: "note",
    title: "Captured note",
    notes: input.note ?? "A plain observation was captured."
  };
}

function liftingProgram(context: UserContext): Program | undefined {
  return context.pillarMemory?.programs?.find((program) => program.pillarId === "pillar-lifting" && program.status === "active");
}

function selectedActionsForContext(context: TodayCaptureContext): Set<TodayCapturedShellAction> {
  const selected = new Set<TodayCapturedShellAction>();
  const text = [
    context.theme,
    context.now.title,
    context.next.title,
    context.protectedSession.title,
    context.protectedSession.protects,
    context.relevantDevelopmentSignal?.title,
    context.relevantDevelopmentSignal?.pillarId,
    context.relevantProgramRecommendation?.title,
    context.relevantProgramRecommendation?.pillarId
  ].join(" ").toLowerCase();

  if (context.relevantProgramRecommendation?.pillarId === "pillar-lifting" || text.includes("lifting") || text.includes("lift")) {
    selected.add("completed_lifting_session");
    selected.add("missed_session");
  }

  if (context.relevantDevelopmentSignal?.pillarId === "pillar-bjj" || text.includes("bjj") || text.includes("arm bar") || text.includes("triangle")) {
    selected.add("bjj_practice_entry");
  }

  if (context.protectedSession.protects === "Music" || text.includes("music") || text.includes("creative") || text.includes("halou")) {
    selected.add("creative_block");
  }

  if (context.protectedSession.title.length > 0) {
    selected.add("work_block");
  }

  return selected;
}

function reasonFor(action: TodayCapturedShellAction, context: TodayCaptureContext): string {
  if (action === "completed_lifting_session" || action === "missed_session") {
    return context.relevantProgramRecommendation?.title ?? "Today included lifting context.";
  }

  if (action === "bjj_practice_entry") {
    return context.relevantDevelopmentSignal?.title ?? "Today included BJJ context.";
  }

  if (action === "creative_block") {
    return "Today included creative work.";
  }

  if (action === "work_block") {
    return `Protected Session: ${context.protectedSession.title}`;
  }

  return "Available for local capture.";
}

function todayContextPillarId(): string | undefined {
  const context = getTodayCaptureContext();
  return context?.relevantProgramRecommendation?.pillarId ?? context?.relevantDevelopmentSignal?.pillarId;
}
