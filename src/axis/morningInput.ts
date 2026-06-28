import { bestFocusWindowFromCalendar, parseCommitmentPhrase, parseFocusWindowPhrase, toTimeBlock } from "./calendar";
import { ManualCalendarAdapter } from "./calendarAdapters";
import type { CalendarContext, DayWindow, EnergyLevel, Event, ExternalCommitment, UserContext } from "./types";

export type MorningEnergyLevel = "low" | "normal" | "high";

export type MorningInput = {
  mainIntention?: string;
  commitments?: string[];
  optionalTasks?: string[];
  energyLevel?: MorningEnergyLevel;
  focusWindow?: Partial<DayWindow>;
};

const DEFAULT_INTENTION = "Protect the most honest work available today.";
const DEFAULT_FOCUS_WINDOW: DayWindow = { start: "08:45", end: "10:00" };

export { parseCommitmentPhrase, parseFocusWindowPhrase };

export function parseMorningLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function inferFocusWindowFromCommitments(commitments: string[]): DayWindow {
  const adapter = new ManualCalendarAdapter(commitments);
  return bestFocusWindowFromCalendar(adapter.buildCalendarContext(adapter.getEventsForDay("Today")));
}

export function morningInputToUserContext(input: MorningInput): UserContext {
  const mainIntention = clean(input.mainIntention) ?? DEFAULT_INTENTION;
  const commitments = normalizeLines(input.commitments);
  const optionalTasks = normalizeLines(input.optionalTasks);
  const energy = toAxisEnergy(input.energyLevel);
  const manualFocusWindow = normalizeManualWindow(input.focusWindow);
  const calendarAdapter = new ManualCalendarAdapter(commitments, manualFocusWindow);
  const calendarContext = calendarAdapter.buildCalendarContext(calendarAdapter.getEventsForDay("Today"));
  const focusWindow = manualFocusWindow ?? bestFocusWindowFromCalendar(calendarContext);

  return {
    userName: "Ryan",
    dateLabel: "Today",
    themeSeed: mainIntention,
    principles: [
      {
        id: "principle-self-respect",
        name: "Self-respect over throughput",
        statement: "A good day is one where action matches the person Ryan means to become."
      },
      {
        id: "principle-reality",
        name: "Reality wins",
        statement: "Plans should fit the actual day, not an imaginary one."
      }
    ],
    pursuits: [
      {
        id: "pursuit-axis",
        name: "Today",
        whyItMatters: "Spend the day in a way that earns self-respect."
      },
      {
        id: "pursuit-health",
        name: "Health",
        whyItMatters: "Keep energy stable enough for meaningful work and a steady evening."
      }
    ],
    missions: [
      {
        id: "mission-version-zero",
        pursuitId: "pursuit-axis",
        name: "Protect today's intention",
        currentNeed: mainIntention
      },
      {
        id: "mission-recovery",
        pursuitId: "pursuit-health",
        name: "Protect baseline energy",
        currentNeed: "Leave enough margin for tomorrow."
      }
    ],
    milestones: [
      {
        id: "milestone-engine-slice",
        missionId: "mission-version-zero",
        name: mainIntention,
        gravity: 10,
        evidence: "The user named this as today's main intention."
      }
    ],
    systems: [
      {
        id: "system-deep-work",
        name: "Deep work before drift",
        protects: "The first real focus block of the day",
        currentState: energy === "low" ? "strained" : "healthy"
      },
      {
        id: "system-evening-recovery",
        name: "Evening recovery",
        protects: "A calm shutdown and enough margin to sleep well",
        currentState: energy === "low" ? "strained" : "healthy"
      }
    ],
    events: [...commitmentEvents(calendarContext), ...optionalTaskEvents(optionalTasks)],
    constraints: [
      {
        id: "constraint-afternoon-friction",
        description: "Afternoon context switching makes deep reasoning more expensive."
      },
      {
        id: "constraint-user-input",
        description: "Today should honor the user's morning intention and known commitments."
      }
    ],
    resources: [
      {
        id: "resource-morning-focus",
        name: "Best focus window",
        energy,
        focusWindow
      },
      {
        id: "resource-afternoon-ops",
        name: "Operational energy",
        energy: energy === "low" ? "low" : "steady",
        focusWindow: { start: "14:00", end: "16:00" }
      }
    ],
    calendarContext
  };
}

function commitmentEvents(calendarContext: CalendarContext): Event[] {
  if (calendarContext.commitments.length === 0) {
    const focusWindow = bestFocusWindowFromCalendar(calendarContext);
    return [
      {
        id: "event-commitment-review",
        title: "Review commitments",
        window: { start: focusWindow.end, end: addMinutes(focusWindow.end, 30) },
        kind: "fixed"
      }
    ];
  }

  return calendarContext.commitments.map((commitment, index) => ({
    id: `event-commitment-${index + 1}`,
    title: commitment.title,
    window: toTimeBlock(commitment),
    kind: commitment.flexibility === "fixed" ? "fixed" : "flexible"
  }));
}

function normalizeLines(values?: string[]): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeManualWindow(window?: Partial<DayWindow>): DayWindow | undefined {
  const start = clean(window?.start);
  const end = clean(window?.end);

  if (!start && !end) {
    return undefined;
  }

  return {
    start: start ?? DEFAULT_FOCUS_WINDOW.start,
    end: end ?? DEFAULT_FOCUS_WINDOW.end
  };
}

function toAxisEnergy(energy?: MorningEnergyLevel): EnergyLevel {
  if (energy === "low" || energy === "high") {
    return energy;
  }

  return "steady";
}

function optionalTaskEvents(tasks: string[]): Event[] {
  return tasks.map((title, index) => ({
    id: `event-optional-${index + 1}`,
    title,
    window: { start: addMinutes("16:00", index * 30), end: addMinutes("16:00", index * 30 + 25) },
    kind: "flexible" as const
  }));
}

function addMinutes(time: string, minutes: number): string {
  const [hours = "0", rawMinutes = "0"] = time.split(":");
  const total = Number(hours) * 60 + Number(rawMinutes) + minutes;
  const normalizedHours = Math.floor(total / 60).toString().padStart(2, "0");
  const normalizedMinutes = (((total % 60) + 60) % 60).toString().padStart(2, "0");

  return `${normalizedHours}:${normalizedMinutes}`;
}
