import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { GoogleCalendarAdapter, ManualCalendarAdapter, type GoogleCalendarEvent } from "./calendarAdapters";
import { morningInputToUserContext } from "./morningInput";

test("ManualCalendarAdapter produces CalendarContext", () => {
  const adapter = new ManualCalendarAdapter(["10:30 meeting"]);
  const events = adapter.getEventsForDay("Today");
  const context = adapter.buildCalendarContext(events);

  assert.equal(events[0]?.text, "10:30 meeting");
  assert.equal(context.commitments[0]?.title, "Meeting");
  assert.equal(context.commitments[0]?.source, "manual");
  assert.ok(context.availabilityWindows.some((window) => window.focusSuitable));
});

test("current Morning input still works through the manual adapter", () => {
  const context = morningInputToUserContext({
    mainIntention: "Write the proposal draft",
    commitments: ["10:30 meeting"]
  });
  const today = generateToday(context);

  assert.equal(context.calendarContext?.commitments[0]?.title, "Meeting");
  assert.equal(today.protectedSession.title, "Write the proposal draft");
  assert.equal(today.selectedDecisions.next.title, "Meeting");
});

test("ManualCalendarAdapter output matches existing focus behavior", () => {
  const adapter = new ManualCalendarAdapter(["9 meeting", "10:30 review", "11:30 check-in"]);
  const context = adapter.buildCalendarContext(adapter.getEventsForDay("Today"));
  const userContext = morningInputToUserContext({
    mainIntention: "Finish the outline",
    commitments: ["9 meeting", "10:30 review", "11:30 check-in"]
  });
  const today = generateToday(userContext);

  assert.ok(context.availabilityWindows.some((window) => window.partOfDay === "afternoon" && window.focusSuitable));
  assert.deepEqual(today.protectedSession.preferredWindow, { start: "13:15", end: "14:30" });
});

test("GoogleCalendarAdapter placeholder is type-safe and performs no network calls", () => {
  const adapter = new GoogleCalendarAdapter();
  const events = adapter.getEventsForDay("2026-06-27");
  const googleEvent: GoogleCalendarEvent = {
    id: "google-1",
    summary: "Client call",
    start: { dateTime: "2026-06-27T14:00:00-07:00" },
    end: { dateTime: "2026-06-27T15:00:00-07:00" },
    status: "confirmed"
  };
  const commitment = adapter.mapExternalEventToCommitment(googleEvent, 0);

  assert.deepEqual(events, []);
  assert.equal(commitment.id, "google-1");
  assert.equal(commitment.kind, "call");
  assert.equal(commitment.source, "calendar");
  assert.equal(commitment.start, "14:00");
});

test("Decision Graph remains provider agnostic", () => {
  const adapter = new GoogleCalendarAdapter();
  const calendarContext = adapter.buildCalendarContext([
    {
      id: "google-2",
      summary: "Design review",
      start: { dateTime: "2026-06-27T10:30:00-07:00" },
      end: { dateTime: "2026-06-27T11:00:00-07:00" },
      status: "confirmed"
    }
  ]);
  const context = {
    ...morningInputToUserContext({ mainIntention: "Write the proposal draft" }),
    calendarContext
  };
  const today = generateToday(context);

  assert.equal(today.selectedDecisions.next.title, "Design review");
  assert.ok(today.decisionGraph.nodes.some((node) => node.id === "constraint-commitment-google-2"));
});
