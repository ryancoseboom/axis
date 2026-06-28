import type { GoogleCalendarEvent } from "./calendarAdapters";

export const googleCalendarFixtures = {
  normalMeeting: {
    id: "fixture-normal-meeting",
    summary: "Design review",
    start: { dateTime: "2026-06-27T10:30:00-07:00" },
    end: { dateTime: "2026-06-27T11:00:00-07:00" },
    status: "confirmed"
  },
  videoCall: {
    id: "fixture-video-call",
    summary: "Partner video call",
    location: "Google Meet",
    start: { dateTime: "2026-06-27T14:00:00-07:00" },
    end: { dateTime: "2026-06-27T15:00:00-07:00" },
    status: "confirmed"
  },
  allDayEvent: {
    id: "fixture-all-day",
    summary: "Launch awareness day",
    start: { date: "2026-06-27" },
    end: { date: "2026-06-28" },
    status: "confirmed"
  },
  tentativeEvent: {
    id: "fixture-tentative",
    summary: "Tentative investor sync",
    start: { dateTime: "2026-06-27T11:30:00-07:00" },
    end: { dateTime: "2026-06-27T12:00:00-07:00" },
    status: "tentative"
  },
  travelBlock: {
    id: "fixture-travel",
    summary: "Travel to studio",
    start: { dateTime: "2026-06-27T08:30:00-07:00" },
    end: { dateTime: "2026-06-27T09:15:00-07:00" },
    status: "confirmed"
  },
  personalAppointment: {
    id: "fixture-appointment",
    summary: "Dentist appointment",
    start: { dateTime: "2026-06-27T15:30:00-07:00" },
    end: { dateTime: "2026-06-27T16:00:00-07:00" },
    status: "confirmed"
  },
  missingEndTime: {
    id: "fixture-missing-end",
    summary: "Quick check-in",
    start: { dateTime: "2026-06-27T09:30:00-07:00" },
    status: "confirmed"
  },
  overlappingFirst: {
    id: "fixture-overlap-1",
    summary: "Planning meeting",
    start: { dateTime: "2026-06-27T10:00:00-07:00" },
    end: { dateTime: "2026-06-27T11:00:00-07:00" },
    status: "confirmed"
  },
  overlappingSecond: {
    id: "fixture-overlap-2",
    summary: "Review meeting",
    start: { dateTime: "2026-06-27T10:45:00-07:00" },
    end: { dateTime: "2026-06-27T12:00:00-07:00" },
    status: "confirmed"
  }
} satisfies Record<string, GoogleCalendarEvent>;

export const googleCalendarFixtureDay: GoogleCalendarEvent[] = [
  googleCalendarFixtures.normalMeeting,
  googleCalendarFixtures.videoCall,
  googleCalendarFixtures.allDayEvent,
  googleCalendarFixtures.tentativeEvent,
  googleCalendarFixtures.travelBlock,
  googleCalendarFixtures.personalAppointment,
  googleCalendarFixtures.missingEndTime,
  googleCalendarFixtures.overlappingFirst,
  googleCalendarFixtures.overlappingSecond
];
