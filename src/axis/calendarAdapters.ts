import {
  calendarContextFromManualCommitments,
  deriveAvailabilityWindows,
  externalCommitmentFromText
} from "./calendar";
import type { CalendarContext, CommitmentFlexibility, CommitmentKind, DayWindow, ExternalCommitment } from "./types";

export interface CalendarAdapter<TExternalEvent> {
  getEventsForDay(date: string): TExternalEvent[];
  mapExternalEventToCommitment(event: TExternalEvent, index: number): ExternalCommitment;
  buildCalendarContext(events: TExternalEvent[]): CalendarContext;
}

export type ManualCalendarEvent = {
  text: string;
};

export class ManualCalendarAdapter implements CalendarAdapter<ManualCalendarEvent> {
  constructor(
    private readonly commitments: string[],
    private readonly focusOverride?: DayWindow
  ) {}

  getEventsForDay(_date: string): ManualCalendarEvent[] {
    return this.commitments.map((text) => ({ text }));
  }

  mapExternalEventToCommitment(event: ManualCalendarEvent, index: number): ExternalCommitment {
    return externalCommitmentFromText(event.text, index, this.focusOverride);
  }

  buildCalendarContext(events: ManualCalendarEvent[]): CalendarContext {
    if (this.focusOverride) {
      return calendarContextFromManualCommitments(events.map((event) => event.text), this.focusOverride);
    }

    const commitments = events.map((event, index) => this.mapExternalEventToCommitment(event, index));

    return {
      commitments,
      availabilityWindows: deriveAvailabilityWindows(commitments),
      dayStart: "08:30",
      dayEnd: "17:45",
      recoveryStartsAt: "16:15"
    };
  }
}

export type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  status?: "confirmed" | "tentative" | "cancelled";
  eventType?: string;
  location?: string;
};

export class GoogleCalendarAdapter implements CalendarAdapter<GoogleCalendarEvent> {
  getEventsForDay(_date: string): GoogleCalendarEvent[] {
    // Future OAuth and Google Calendar API calls enter here.
    // Version Zero deliberately performs no network work.
    return [];
  }

  mapExternalEventToCommitment(event: GoogleCalendarEvent, index: number): ExternalCommitment {
    const title = event.summary?.trim() || "Calendar commitment";
    const allDay = isAllDay(event);
    const start = allDay ? "00:00" : toLocalTime(event.start.dateTime ?? event.start.date ?? "09:00");
    const end = allDay ? "00:00" : toLocalTime(event.end?.dateTime ?? event.end?.date ?? addMinutes(start, 30));
    const kind = inferGoogleKind(title, event);

    return {
      id: event.id ?? `google-calendar-${index + 1}`,
      title,
      start,
      end,
      kind,
      flexibility: allDay ? "tentative" : event.status === "tentative" ? "tentative" : "fixed",
      energyCost: inferGoogleEnergyCost(title, kind),
      source: "calendar"
    };
  }

  buildCalendarContext(events: GoogleCalendarEvent[]): CalendarContext {
    const commitments = events
      .filter((event) => event.status !== "cancelled")
      .map((event, index) => this.mapExternalEventToCommitment(event, index));

    return {
      commitments,
      availabilityWindows: deriveAvailabilityWindows(commitments),
      dayStart: "08:30",
      dayEnd: "17:45",
      recoveryStartsAt: "16:15"
    };
  }
}

function isAllDay(event: GoogleCalendarEvent): boolean {
  return Boolean(event.start.date && !event.start.dateTime);
}

function inferGoogleKind(title: string, event: GoogleCalendarEvent): CommitmentKind {
  const text = `${title} ${event.description ?? ""} ${event.location ?? ""}`.toLowerCase();

  if (text.includes("call") || text.includes("zoom") || text.includes("google meet") || text.includes("video")) return "call";
  if (text.includes("appointment") || text.includes("doctor") || text.includes("dentist")) return "appointment";
  if (text.includes("travel") || text.includes("flight") || text.includes("drive")) return "travel";
  if (text.includes("lunch") || text.includes("family") || text.includes("pickup")) return "personal";
  if (event.eventType === "workingLocation") return "personal";
  if (title) return "meeting";

  return "unknown";
}

function inferGoogleEnergyCost(title: string, kind: CommitmentKind): "low" | "medium" | "high" {
  const lower = title.toLowerCase();

  if (kind === "travel" || lower.includes("presentation")) return "high";
  if (kind === "personal" || kind === "unknown") return "low";

  return "medium";
}

function toLocalTime(value: string): string {
  const timeMatch = value.match(/T(\d{2}):(\d{2})/);

  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}`;
  }

  const looseTime = value.match(/^(\d{1,2})(?::(\d{2}))?$/);

  if (looseTime) {
    return `${looseTime[1].padStart(2, "0")}:${looseTime[2] ?? "00"}`;
  }

  return "09:00";
}


function addMinutes(time: string, minutes: number): string {
  const [hours = "0", rawMinutes = "0"] = time.split(":");
  const total = Number(hours) * 60 + Number(rawMinutes) + minutes;
  const normalizedHours = Math.floor(total / 60).toString().padStart(2, "0");
  const normalizedMinutes = (((total % 60) + 60) % 60).toString().padStart(2, "0");

  return `${normalizedHours}:${normalizedMinutes}`;
}
