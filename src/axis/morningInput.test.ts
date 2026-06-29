import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { inferFocusWindowFromCommitments, morningInputToUserContext, parseMorningLines } from "./morningInput";
import { sampleRyanContext } from "./sampleRyanContext";

test("user input generates a valid Today", () => {
  const context = morningInputToUserContext({
    mainIntention: "Write the proposal draft",
    commitments: ["Client call"],
    optionalTasks: ["Clean inbox"],
    energyLevel: "normal",
    focusWindow: { start: "09:00", end: "10:15" }
  });
  const today = generateToday(context);

  assert.equal(today.protectedSession.title, "Write the proposal draft");
  assert.equal(today.protectedSession.preferredWindow.start, "09:00");
  assert.ok(today.decisionGraph.nodes.length > 0);
  assert.ok(today.reasonedOutputs.now.reasonIds.length > 0);
});

test("main intention influences NOW", () => {
  const context = morningInputToUserContext({ mainIntention: "Record album sketches" });
  const today = generateToday(context);

  assert.equal(today.selectedDecisions.now.title, "Record album sketches");
});

test("commitments influence NEXT or timeline", () => {
  const context = morningInputToUserContext({
    mainIntention: "Draft the essay",
    commitments: ["Call Sam"]
  });
  const today = generateToday(context);
  const titles = today.timeline.map((item) => item.title);

  assert.ok(titles.includes("Call Sam"));
  assert.equal(today.selectedDecisions.next.title, "Call Sam");
});

test("energy level affects confidence", () => {
  const highEnergy = generateToday(morningInputToUserContext({ mainIntention: "Shape the chapter", energyLevel: "high" }));
  const lowEnergy = generateToday(morningInputToUserContext({ mainIntention: "Shape the chapter", energyLevel: "low" }));

  assert.ok(highEnergy.confidenceByOutput.now.score > lowEnergy.confidenceByOutput.now.score);
});

test("missing fields are handled safely", () => {
  const today = generateToday(morningInputToUserContext({}));

  assert.ok(today.protectedSession.title.length > 0);
  assert.ok(today.timeline.length > 0);
  assert.ok(today.confidence >= 0 && today.confidence <= 100);
});

test("existing demo sample flow still works", () => {
  const today = generateToday(sampleRyanContext);

  assert.equal(today.selectedDecisions.now.id, "decision-protect-opportunity-protected-engine");
  assert.equal(today.protectedSession.title, "Write and produce the next Halou sketch.");
});

test("morning line parser keeps only meaningful lines", () => {
  assert.deepEqual(parseMorningLines("Call Sam\n\n  Send notes  "), ["Call Sam", "Send notes"]);
});

test("commitment phrases with leading time are normalized", () => {
  const context = morningInputToUserContext({ commitments: ["10:30 meeting"] });
  const event = context.events.find((item) => item.id === "event-commitment-1");

  assert.equal(event?.title, "Meeting");
  assert.deepEqual(event?.window, { start: "10:30", end: "11:00" });
});

test("commitment phrases with at-time are normalized", () => {
  const context = morningInputToUserContext({ commitments: ["meeting at 10:30"] });
  const event = context.events.find((item) => item.id === "event-commitment-1");

  assert.equal(event?.title, "Meeting");
  assert.deepEqual(event?.window, { start: "10:30", end: "11:00" });
});

test("commitment range phrases are normalized", () => {
  const context = morningInputToUserContext({ commitments: ["call from 2-3"] });
  const event = context.events.find((item) => item.id === "event-commitment-1");

  assert.equal(event?.title, "Call");
  assert.deepEqual(event?.window, { start: "14:00", end: "15:00" });
});

test("rough focus-window phrases are normalized", async () => {
  const { parseFocusWindowPhrase } = await import("./morningInput");

  assert.deepEqual(parseFocusWindowPhrase("around 9"), { start: "09:00", end: "10:15" });
  assert.deepEqual(parseFocusWindowPhrase("late morning"), { start: "10:30", end: "12:00" });
  assert.deepEqual(parseFocusWindowPhrase("after lunch"), { start: "13:15", end: "14:30" });
  assert.deepEqual(parseFocusWindowPhrase("before my 10:30 meeting"), { start: "09:00", end: "10:30" });
});

test("failed parsing falls back gracefully", async () => {
  const { parseFocusWindowPhrase } = await import("./morningInput");
  const context = morningInputToUserContext({
    mainIntention: "Make the hard thing smaller",
    commitments: ["important thing sometime"],
    focusWindow: parseFocusWindowPhrase("when the day opens")
  });
  const today = generateToday(context);
  const event = context.events.find((item) => item.id === "event-commitment-1");

  assert.deepEqual(event?.window, { start: "10:00", end: "10:30" });
  assert.equal(today.protectedSession.preferredWindow.start, "08:45");
  assert.ok(today.protectedSession.title.length > 0);
});

test("generated Today works from rough Morning language", async () => {
  const { parseFocusWindowPhrase } = await import("./morningInput");
  const today = generateToday(
    morningInputToUserContext({
      mainIntention: "Finish the outline",
      commitments: ["meeting at 10:30", "call from 2-3"],
      focusWindow: parseFocusWindowPhrase("before my 10:30 meeting")
    })
  );

  assert.equal(today.protectedSession.title, "Finish the outline");
  assert.equal(today.protectedSession.preferredWindow.end, "10:30");
  assert.ok(today.timeline.some((item) => item.title === "Meeting"));
});


test("10:30 meeting produces a protected window before it", () => {
  const context = morningInputToUserContext({
    mainIntention: "Write the hard section",
    commitments: ["10:30 meeting"]
  });
  const today = generateToday(context);

  assert.deepEqual(inferFocusWindowFromCommitments(["10:30 meeting"]), { start: "08:45", end: "10:00" });
  assert.deepEqual(today.protectedSession.preferredWindow, { start: "08:45", end: "10:00" });
});

test("afternoon commitment preserves morning focus", () => {
  const context = morningInputToUserContext({
    mainIntention: "Shape the proposal",
    commitments: ["call from 2-3"]
  });
  const today = generateToday(context);

  assert.deepEqual(today.protectedSession.preferredWindow, { start: "08:45", end: "10:00" });
});

test("crowded morning shifts focus later", () => {
  const context = morningInputToUserContext({
    mainIntention: "Finish the outline",
    commitments: ["9 meeting", "10:30 review", "11:30 check-in"]
  });
  const today = generateToday(context);

  assert.deepEqual(today.protectedSession.preferredWindow, { start: "13:15", end: "14:30" });
});

test("optional focus override still wins", async () => {
  const { parseFocusWindowPhrase } = await import("./morningInput");
  const context = morningInputToUserContext({
    mainIntention: "Draft the note",
    commitments: ["10:30 meeting"],
    focusWindow: parseFocusWindowPhrase("after lunch")
  });
  const today = generateToday(context);

  assert.deepEqual(today.protectedSession.preferredWindow, { start: "13:15", end: "14:30" });
});

test("missing commitments still falls back safely", () => {
  const context = morningInputToUserContext({ mainIntention: "Make progress" });
  const today = generateToday(context);

  assert.deepEqual(today.protectedSession.preferredWindow, { start: "08:45", end: "10:00" });
});
