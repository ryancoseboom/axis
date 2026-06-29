import { clearTodayCaptureContextPersistence, loadTodayCaptureContext, saveTodayCaptureContext } from "./localPersistence";
import type { DevelopmentSignal, GeneratedToday, ScoredOpportunity, UserContext } from "./types";

export type TodayCaptureContextSource = "setup" | "morning" | "sample" | "unknown";

export type TodayCaptureContext = {
  date: string;
  theme: string;
  now: TodayCaptureContextItem;
  next: TodayCaptureContextItem;
  protectedSession: TodayCaptureContextItem;
  relevantProgramRecommendation?: TodayCaptureContextSignal;
  relevantDevelopmentSignal?: TodayCaptureContextSignal;
  source: TodayCaptureContextSource;
};

export type TodayCaptureContextItem = {
  title: string;
  protects: string;
  time?: string;
};

export type TodayCaptureContextSignal = {
  id: string;
  title: string;
  pillarId: string;
  protects: string;
  type: DevelopmentSignal["type"];
};

let selectedTodayCaptureContext: TodayCaptureContext | undefined;

export type ClearTodayCaptureContextOptions = {
  persist?: boolean;
};

export function buildTodayCaptureContext(
  today: GeneratedToday,
  userContext: UserContext,
  source: TodayCaptureContextSource = "unknown"
): TodayCaptureContext {
  const relevantDevelopmentSignal = developmentSignalFor(today.protectedSession, userContext);
  const relevantProgramRecommendation = programSignalFrom(today, userContext, relevantDevelopmentSignal);

  return {
    date: userContext.dateLabel,
    theme: today.theme,
    now: itemFromDecision(today.selectedDecisions.now.title, today.selectedDecisions.now.protects, timeLabel(today.selectedDecisions.now.window)),
    next: itemFromDecision(today.selectedDecisions.next.title, today.selectedDecisions.next.protects, timeLabel(today.selectedDecisions.next.window)),
    protectedSession: itemFromDecision(today.protectedSession.title, today.protectedSession.protects, timeLabel(today.protectedSession.preferredWindow)),
    relevantProgramRecommendation,
    relevantDevelopmentSignal,
    source
  };
}

export function setTodayCaptureContext(context: TodayCaptureContext): TodayCaptureContext {
  selectedTodayCaptureContext = context;
  saveTodayCaptureContext(selectedTodayCaptureContext);
  return selectedTodayCaptureContext;
}

export function getTodayCaptureContext(): TodayCaptureContext | undefined {
  if (!selectedTodayCaptureContext) {
    selectedTodayCaptureContext = loadTodayCaptureContext();
  }

  return selectedTodayCaptureContext;
}

export function clearTodayCaptureContext(options: ClearTodayCaptureContextOptions = {}): void {
  selectedTodayCaptureContext = undefined;
  if (options.persist ?? true) {
    clearTodayCaptureContextPersistence();
  }
}

function developmentSignalFor(session: ScoredOpportunity, userContext: UserContext): TodayCaptureContextSignal | undefined {
  const signalId = session.developmentSignalId;
  const signal = userContext.pillarMemory?.developmentSignals?.find((item) => item.id === signalId);

  return signal ? signalFrom(signal) : undefined;
}

function programSignalFrom(
  today: GeneratedToday,
  userContext: UserContext,
  primarySignal: TodayCaptureContextSignal | undefined
): TodayCaptureContextSignal | undefined {
  if (primarySignal && isProgramLike(primarySignal)) {
    return primarySignal;
  }

  const titles = new Set(today.candidateDecisions.map((candidate) => candidate.title));
  const signal = userContext.pillarMemory?.developmentSignals?.find((item) => titles.has(item.title) && isProgramLike(item));

  return signal ? signalFrom(signal) : undefined;
}

function signalFrom(signal: DevelopmentSignal): TodayCaptureContextSignal {
  return {
    id: signal.id,
    title: signal.title,
    pillarId: signal.pillarId,
    protects: signal.protects,
    type: signal.type
  };
}

function isProgramLike(signal: Pick<DevelopmentSignal, "id" | "pillarId" | "title" | "type">): boolean {
  return signal.id.startsWith("signal-program-") || signal.pillarId === "pillar-lifting" || signal.title.toLowerCase().includes("lift");
}

function itemFromDecision(title: string, protects: string, time?: string): TodayCaptureContextItem {
  return { title, protects, time };
}

function timeLabel(window: { start: string; end: string } | undefined): string | undefined {
  return window ? `${window.start}-${window.end}` : undefined;
}
