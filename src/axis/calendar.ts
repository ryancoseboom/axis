import type {
  AvailabilityWindow,
  CalendarContext,
  CommitmentEnergyCost,
  CommitmentFlexibility,
  CommitmentKind,
  CommitmentSource,
  DayWindow,
  ExternalCommitment
} from "./types";

const DEFAULT_FOCUS_WINDOW: DayWindow = { start: "08:45", end: "10:00" };
const MORNING_BOUNDARY: DayWindow = { start: "08:45", end: "12:00" };
const AFTERNOON_BOUNDARY: DayWindow = { start: "13:15", end: "16:15" };
const MIN_FOCUS_MINUTES = 60;
const PROTECTED_FOCUS_MINUTES = 75;

export function calendarContextFromManualCommitments(commitments: string[], overrideWindow?: DayWindow): CalendarContext {
  const externalCommitments = commitments.map((commitment, index) => externalCommitmentFromText(commitment, index, overrideWindow));
  const availabilityWindows = deriveAvailabilityWindows(externalCommitments);

  return {
    commitments: externalCommitments,
    availabilityWindows,
    dayStart: "08:30",
    dayEnd: "17:45",
    recoveryStartsAt: "16:15"
  };
}

export function externalCommitmentFromText(value: string, index = 0, fallbackAfter: DayWindow = DEFAULT_FOCUS_WINDOW): ExternalCommitment {
  const parsed = parseCommitmentPhrase(value);
  const fallback = fallbackWindow(index, fallbackAfter.end);
  const start = parsed.window?.start ?? fallback.start;
  const end = parsed.window?.end ?? fallback.end;
  const kind = inferCommitmentKind(parsed.title);

  return {
    id: `external-commitment-${index + 1}`,
    title: parsed.title,
    start,
    end,
    kind,
    flexibility: inferFlexibility(value),
    energyCost: inferEnergyCost(kind, value),
    source: "manual"
  };
}

export function deriveAvailabilityWindows(commitments: ExternalCommitment[]): AvailabilityWindow[] {
  const fixedBlocks = commitments
    .filter((commitment) => commitment.flexibility === "fixed")
    .map((commitment) => ({ start: addMinutes(commitment.start, -15), end: addMinutes(commitment.end, 10) }))
    .sort((a, b) => a.start.localeCompare(b.start));

  return [
    ...availabilityInside(MORNING_BOUNDARY, fixedBlocks, "morning"),
    ...availabilityInside(AFTERNOON_BOUNDARY, fixedBlocks, "afternoon")
  ];
}

export function bestFocusWindowFromCalendar(calendarContext?: CalendarContext): DayWindow {
  const best = calendarContext?.availabilityWindows.find((window) => window.focusSuitable);

  if (!best) {
    return DEFAULT_FOCUS_WINDOW;
  }

  return capWindow(best, PROTECTED_FOCUS_MINUTES);
}

export function parseCommitmentPhrase(value: string): { title: string; window?: DayWindow } {
  const title = cleanTitle(value);
  const range = value.match(/(.+?)\s+(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?/i);

  if (range) {
    return {
      title: cleanTitle(range[1]),
      window: {
        start: normalizeTime(range[2], range[3], true),
        end: normalizeTime(range[4], range[5], true)
      }
    };
  }

  const atTime = value.match(/(?:(\d{1,2})(?::(\d{2}))?\s+(.+)|(.+?)\s+at\s+(\d{1,2})(?::(\d{2}))?)/i);

  if (atTime) {
    const hour = atTime[1] ?? atTime[5];
    const minute = atTime[2] ?? atTime[6];
    const rawTitle = atTime[3] ?? atTime[4] ?? title;
    const start = normalizeTime(hour, minute, true);

    return {
      title: cleanTitle(rawTitle),
      window: { start, end: addMinutes(start, 30) }
    };
  }

  return { title };
}

export function parseFocusWindowPhrase(value?: string): DayWindow | undefined {
  const phrase = clean(value)?.toLowerCase();

  if (!phrase) {
    return undefined;
  }

  const explicitRange = phrase.match(/(\d{1,2})(?::(\d{2}))?\s*(?:-|–|to|until)\s*(\d{1,2})(?::(\d{2}))?/i);

  if (explicitRange) {
    return {
      start: normalizeTime(explicitRange[1], explicitRange[2]),
      end: normalizeTime(explicitRange[3], explicitRange[4])
    };
  }

  const beforeCommitment = phrase.match(/before\s+(?:my\s+)?(?:\w+\s+)*?(\d{1,2})(?::(\d{2}))?/i);

  if (beforeCommitment) {
    const end = normalizeTime(beforeCommitment[1], beforeCommitment[2]);
    return { start: addMinutes(end, -90), end };
  }

  if (phrase.includes("late morning")) {
    return { start: "10:30", end: "12:00" };
  }

  if (phrase.includes("after lunch")) {
    return { start: "13:15", end: "14:30" };
  }

  const aroundTime = phrase.match(/(?:around|about|near)\s+(\d{1,2})(?::(\d{2}))?/i);

  if (aroundTime) {
    const start = normalizeTime(aroundTime[1], aroundTime[2]);
    return { start, end: addMinutes(start, 75) };
  }

  return undefined;
}

export function toTimeBlock(commitment: ExternalCommitment): DayWindow {
  return { start: commitment.start, end: commitment.end };
}

function availabilityInside(boundary: DayWindow, fixedBlocks: DayWindow[], partOfDay: "morning" | "afternoon"): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];
  let cursor = boundary.start;

  for (const block of fixedBlocks.filter((window) => window.end > boundary.start && window.start < boundary.end)) {
    const gapEnd = minTime(block.start, boundary.end);
    pushAvailability(windows, { start: cursor, end: gapEnd }, partOfDay);
    cursor = maxTime(cursor, block.end);
  }

  pushAvailability(windows, { start: cursor, end: boundary.end }, partOfDay);

  return windows;
}

function pushAvailability(windows: AvailabilityWindow[], window: DayWindow, partOfDay: "morning" | "afternoon") {
  const duration = durationMinutes(window);

  if (duration <= 0) {
    return;
  }

  windows.push({
    id: `availability-${partOfDay}-${windows.length + 1}`,
    start: window.start,
    end: window.end,
    durationMinutes: duration,
    focusSuitable: duration >= MIN_FOCUS_MINUTES,
    partOfDay,
    source: "derived",
    reason: duration >= MIN_FOCUS_MINUTES ? "Open long enough for protected focus." : "Short gap; useful for transition, not protected focus."
  });
}

function inferCommitmentKind(title: string): CommitmentKind {
  const lower = title.toLowerCase();

  if (lower.includes("call")) return "call";
  if (lower.includes("meeting") || lower.includes("review") || lower.includes("check-in") || lower.includes("standup")) return "meeting";
  if (lower.includes("appointment") || lower.includes("doctor") || lower.includes("dentist")) return "appointment";
  if (lower.includes("travel") || lower.includes("drive") || lower.includes("flight")) return "travel";
  if (lower.includes("lunch") || lower.includes("family") || lower.includes("school") || lower.includes("pickup")) return "personal";

  return "unknown";
}

function inferFlexibility(value: string): CommitmentFlexibility {
  const lower = value.toLowerCase();

  if (lower.includes("tentative") || lower.includes("maybe")) return "tentative";
  if (lower.includes("movable") || lower.includes("moveable") || lower.includes("flexible")) return "movable";

  return "fixed";
}

function inferEnergyCost(kind: CommitmentKind, value: string): CommitmentEnergyCost {
  const lower = value.toLowerCase();

  if (lower.includes("hard") || lower.includes("presentation") || kind === "travel") return "high";
  if (kind === "call" || kind === "meeting" || kind === "appointment") return "medium";

  return "low";
}

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanTitle(value: string): string {
  const title = value
    .trim()
    .replace(/^\s*(at|from)\s+/i, "")
    .replace(/\s+/g, " ");

  if (!title) {
    return "Commitment";
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function fallbackWindow(index: number, earliestStart: string): DayWindow {
  const defaultStarts = ["10:00", "12:30", "15:00", "16:00"];
  const start = maxTime(defaultStarts[index] ?? addMinutes("16:00", index * 30), earliestStart);

  return { start, end: addMinutes(start, 30) };
}

function normalizeTime(hour: string, minute = "00", inferAfternoon = false): string {
  const numericHour = Number(hour);
  const adjustedHour = inferAfternoon && numericHour >= 1 && numericHour <= 7 ? numericHour + 12 : numericHour;

  return `${adjustedHour.toString().padStart(2, "0")}:${minute}`;
}

function capWindow(window: DayWindow, minutes: number): DayWindow {
  if (durationMinutes(window) <= minutes) {
    return { start: window.start, end: window.end };
  }

  return { start: window.start, end: addMinutes(window.start, minutes) };
}

function durationMinutes(window: DayWindow): number {
  return minutesSinceMidnight(window.end) - minutesSinceMidnight(window.start);
}

function minutesSinceMidnight(time: string): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function addMinutes(time: string, minutes: number): string {
  const [hours = "0", rawMinutes = "0"] = time.split(":");
  const total = Number(hours) * 60 + Number(rawMinutes) + minutes;
  const normalizedHours = Math.floor(total / 60).toString().padStart(2, "0");
  const normalizedMinutes = (((total % 60) + 60) % 60).toString().padStart(2, "0");

  return `${normalizedHours}:${normalizedMinutes}`;
}

function minTime(first: string, second: string): string {
  return first <= second ? first : second;
}

function maxTime(first: string, second: string): string {
  return first >= second ? first : second;
}
