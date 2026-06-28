import assert from "node:assert/strict";
import test from "node:test";
import { bestFocusWindowFromCalendar } from "./calendar";
import { GoogleCalendarAdapter } from "./calendarAdapters";
import { googleCalendarFixtureDay, googleCalendarFixtures } from "./calendarFixtures";

const adapter = new GoogleCalendarAdapter();

test("Google calendar fixtures map into ExternalCommitment", () => {
  const cases = [
    [googleCalendarFixtures.normalMeeting, { title: "Design review", start: "10:30", end: "11:00", kind: "meeting", flexibility: "fixed", energyCost: "medium" }],
    [googleCalendarFixtures.videoCall, { title: "Partner video call", start: "14:00", end: "15:00", kind: "call", flexibility: "fixed", energyCost: "medium" }],
    [googleCalendarFixtures.allDayEvent, { title: "Launch awareness day", start: "00:00", end: "00:00", kind: "meeting", flexibility: "tentative", energyCost: "medium" }],
    [googleCalendarFixtures.tentativeEvent, { title: "Tentative investor sync", start: "11:30", end: "12:00", kind: "meeting", flexibility: "tentative", energyCost: "medium" }],
    [googleCalendarFixtures.travelBlock, { title: "Travel to studio", start: "08:30", end: "09:15", kind: "travel", flexibility: "fixed", energyCost: "high" }],
    [googleCalendarFixtures.personalAppointment, { title: "Dentist appointment", start: "15:30", end: "16:00", kind: "appointment", flexibility: "fixed", energyCost: "medium" }],
    [googleCalendarFixtures.missingEndTime, { title: "Quick check-in", start: "09:30", end: "10:00", kind: "meeting", flexibility: "fixed", energyCost: "medium" }]
  ] as const;

  cases.forEach(([event, expected], index) => {
    const commitment = adapter.mapExternalEventToCommitment(event, index);

    assert.equal(commitment.title, expected.title);
    assert.equal(commitment.start, expected.start);
    assert.equal(commitment.end, expected.end);
    assert.equal(commitment.kind, expected.kind);
    assert.equal(commitment.flexibility, expected.flexibility);
    assert.equal(commitment.energyCost, expected.energyCost);
    assert.equal(commitment.source, "calendar");
  });
});

test("GoogleCalendarAdapter fixture context creates blocked time", () => {
  const context = adapter.buildCalendarContext([
    googleCalendarFixtures.normalMeeting,
    googleCalendarFixtures.videoCall
  ]);

  assert.ok(context.commitments.some((commitment) => commitment.id === "fixture-normal-meeting"));
  assert.ok(context.availabilityWindows.every((window) => !(window.start < "11:10" && window.end > "10:15")));
  assert.ok(context.availabilityWindows.every((window) => !(window.start < "15:10" && window.end > "13:45")));
});

test("all-day event is safe and does not erase availability", () => {
  const context = adapter.buildCalendarContext([googleCalendarFixtures.allDayEvent]);

  assert.equal(context.commitments[0]?.flexibility, "tentative");
  assert.ok(context.availabilityWindows.some((window) => window.partOfDay === "morning" && window.focusSuitable));
  assert.deepEqual(bestFocusWindowFromCalendar(context), { start: "08:45", end: "10:00" });
});

test("missing end time falls back to a short fixed block", () => {
  const context = adapter.buildCalendarContext([googleCalendarFixtures.missingEndTime]);
  const commitment = context.commitments[0];

  assert.equal(commitment?.start, "09:30");
  assert.equal(commitment?.end, "10:00");
  assert.ok(context.availabilityWindows.some((window) => window.start === "10:10" && window.end === "12:00"));
});

test("overlapping events do not break focus inference", () => {
  const context = adapter.buildCalendarContext([
    googleCalendarFixtures.overlappingFirst,
    googleCalendarFixtures.overlappingSecond
  ]);

  assert.ok(context.availabilityWindows.every((window) => window.durationMinutes > 0));
  assert.ok(context.availabilityWindows.some((window) => window.start === "08:45" && window.end === "09:45" && window.focusSuitable));
  assert.deepEqual(bestFocusWindowFromCalendar(context), { start: "08:45", end: "09:45" });
});

test("full fixture day remains safe even when crowded", () => {
  const context = adapter.buildCalendarContext(googleCalendarFixtureDay);

  assert.equal(context.commitments.length, googleCalendarFixtureDay.length);
  assert.ok(context.availabilityWindows.every((window) => window.durationMinutes > 0));
  assert.ok(context.availabilityWindows.every((window) => window.end <= context.recoveryStartsAt));
  assert.deepEqual(bestFocusWindowFromCalendar(context), { start: "08:45", end: "10:00" });
});

test("GoogleCalendarAdapter remains inert without live events", () => {
  assert.deepEqual(adapter.getEventsForDay("2026-06-27"), []);
});
