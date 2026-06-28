import assert from "node:assert/strict";
import test from "node:test";
import {
  bestFocusWindowFromCalendar,
  calendarContextFromManualCommitments,
  deriveAvailabilityWindows,
  externalCommitmentFromText
} from "./calendar";
import { generateToday } from "./engine";
import { morningInputToUserContext } from "./morningInput";
import type { ExternalCommitment } from "./types";

test("manual commitment text becomes ExternalCommitment", () => {
  const commitment = externalCommitmentFromText("10:30 meeting");

  assert.equal(commitment.title, "Meeting");
  assert.equal(commitment.start, "10:30");
  assert.equal(commitment.end, "11:00");
  assert.equal(commitment.flexibility, "fixed");
  assert.equal(commitment.source, "manual");
});

test("meeting and call kinds are inferred", () => {
  assert.equal(externalCommitmentFromText("10:30 meeting").kind, "meeting");
  assert.equal(externalCommitmentFromText("call from 2-3").kind, "call");
});

test("fixed commitments create blocked time", () => {
  const context = calendarContextFromManualCommitments(["10:30 meeting"]);
  const morningWindows = context.availabilityWindows.filter((window) => window.partOfDay === "morning");

  assert.ok(morningWindows.some((window) => window.end === "10:15"));
  assert.ok(morningWindows.every((window) => !(window.start < "11:10" && window.end > "10:15")));
});

test("availability windows are derived correctly", () => {
  const commitments: ExternalCommitment[] = [
    {
      id: "calendar-1",
      title: "Design review",
      start: "09:00",
      end: "10:00",
      kind: "meeting",
      flexibility: "fixed",
      energyCost: "medium",
      source: "calendar"
    }
  ];
  const windows = deriveAvailabilityWindows(commitments);

  assert.ok(windows.some((window) => window.start === "10:10" && window.end === "12:00"));
  assert.ok(windows.some((window) => window.start === "13:15" && window.end === "16:15"));
});

test("focus-suitable windows are identified", () => {
  const context = calendarContextFromManualCommitments(["9 meeting", "10:30 review", "11:30 check-in"]);

  assert.deepEqual(bestFocusWindowFromCalendar(context), { start: "13:15", end: "14:30" });
  assert.ok(context.availabilityWindows.some((window) => window.focusSuitable && window.partOfDay === "afternoon"));
});

test("Morning input stores calendar context", () => {
  const context = morningInputToUserContext({ commitments: ["call from 2-3"] });

  assert.equal(context.calendarContext?.commitments[0]?.kind, "call");
  assert.ok(context.calendarContext?.availabilityWindows.some((window) => window.focusSuitable));
});

test("Decision Graph still generates Today from calendar-shaped input", () => {
  const today = generateToday(
    morningInputToUserContext({
      mainIntention: "Write the proposal draft",
      commitments: ["10:30 meeting"]
    })
  );

  assert.equal(today.protectedSession.title, "Write the proposal draft");
  assert.equal(today.selectedDecisions.next.title, "Meeting");
  assert.ok(today.decisionGraph.nodes.some((node) => node.id.startsWith("constraint-commitment-")));
  assert.ok(today.decisionGraph.nodes.some((node) => node.id.startsWith("constraint-availability-")));
});
