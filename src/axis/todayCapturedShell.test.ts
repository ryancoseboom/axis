import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { clearConfirmedSetupContext, getConfirmedSetupContext } from "./setupHandoff";
import { buildTodayCapturedShellSummaryLines, submitTodayCapturedShellObservation, submitTodayCapturedShellObservations } from "./todayCapturedShell";

test("capture shell can submit completed program session", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservation({ action: "completed_lifting_session", date: "2026-06-28" });

  assert.equal(result.todayCaptured.observations[0]?.type, "completed_program_session");
  assert.ok(result.context.pillarMemory?.completedProgramSessions?.length);
  assert.ok(result.context.pillarMemory?.developmentSignals?.some((signal) => signal.title.includes("Push - chest")));
  assert.equal(getConfirmedSetupContext(), result.context);

  clearConfirmedSetupContext();
});

test("capture shell can submit BJJ practice entry", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservation({ action: "bjj_practice_entry", date: "2026-06-28" });

  assert.equal(result.todayCaptured.observations[0]?.type, "practice_entry");
  assert.ok(result.context.pillarMemory?.knowledgeStates?.some((state) => state.nodeId === "knowledge-bjj-arm-bar" && state.status === "practiced"));
  assert.ok(result.context.pillarMemory?.developmentSignals?.some((signal) => signal.title === "Train Triangle Choke"));

  clearConfirmedSetupContext();
});

test("capture shell can submit missed session", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservation({ action: "missed_session", date: "2026-06-28", note: "Class did not fit today." });

  assert.equal(result.todayCaptured.observations[0]?.type, "missed_session");
  assert.ok(result.summary.whatWasMissed.some((line) => line.includes("useful context")));
  assert.equal(JSON.stringify(result.todayCaptured).includes("score"), false);

  clearConfirmedSetupContext();
});

test("capture shell can submit recovery observation", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservation({ action: "recovery", date: "2026-06-28", note: "Elbow wanted a quieter night." });

  assert.equal(result.todayCaptured.observations[0]?.type, "recovery");
  assert.ok(result.context.constraints.some((constraint) => constraint.id.startsWith("constraint-recovery-")));
  assert.ok(result.summary.whatMayMatterTomorrow.some((line) => line.includes("Capacity context")));

  clearConfirmedSetupContext();
});

test("capture shell can submit simple note", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservation({ action: "note", date: "2026-06-28", note: "The day had more friction than expected." });

  assert.equal(result.todayCaptured.observations[0]?.type, "note");
  assert.ok(result.todayCaptured.outcomes.some((outcome) => outcome.type === "evidence_recorded"));

  clearConfirmedSetupContext();
});

test("capture shell summary renders safely", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservation({ action: "missed_session", date: "2026-06-28" });
  const lines = buildTodayCapturedShellSummaryLines(result.summary);
  const copy = lines.join(" ").toLowerCase();

  assert.ok(lines.length > 0);
  assert.equal(copy.includes("failed"), false);
  assert.equal(copy.includes("streak"), false);
  assert.equal(copy.includes("badge"), false);

  clearConfirmedSetupContext();
});

test("capture shell updated context can generate the next Today", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservation({ action: "completed_lifting_session", date: "2026-06-28" });
  const today = generateToday(getConfirmedSetupContext() ?? result.context);

  assert.ok(today.timeline.length > 0);
  assert.ok(result.context.pillarMemory?.developmentSignals?.some((signal) => signal.title.includes("Push - chest")));

  clearConfirmedSetupContext();
});

test("multiple observations can be selected and captured together", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservations({
    actions: ["completed_lifting_session", "missed_session", "recovery"],
    date: "2026-06-28",
    note: "A mixed day."
  });

  assert.deepEqual(result.todayCaptured.observations.map((observation) => observation.type), [
    "completed_program_session",
    "missed_session",
    "recovery"
  ]);
  assert.equal(getConfirmedSetupContext(), result.context);

  clearConfirmedSetupContext();
});

test("program completion and missed session can coexist", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservations({
    actions: ["completed_lifting_session", "missed_session"],
    date: "2026-06-28"
  });

  assert.ok(result.context.pillarMemory?.completedProgramSessions?.length);
  assert.ok(result.todayCaptured.outcomes.some((outcome) => outcome.type === "program_progressed"));
  assert.ok(result.todayCaptured.outcomes.some((outcome) => outcome.type === "evidence_recorded"));
  assert.ok(result.summary.whatMovedForward.length > 0);
  assert.ok(result.summary.whatWasMissed.length > 0);

  clearConfirmedSetupContext();
});

test("practice entry and recovery note can coexist", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservations({
    actions: ["bjj_practice_entry", "recovery"],
    date: "2026-06-28",
    note: "Arm bars, then a quiet evening."
  });

  assert.ok(result.context.pillarMemory?.knowledgeStates?.some((state) => state.nodeId === "knowledge-bjj-arm-bar" && state.status === "practiced"));
  assert.ok(result.context.constraints.some((constraint) => constraint.id.startsWith("constraint-recovery-")));
  assert.ok(result.summary.whatMovedForward.some((line) => line.includes("Practiced Arm Bar")));
  assert.ok(result.summary.whatMayMatterTomorrow.some((line) => line.includes("Capacity context")));

  clearConfirmedSetupContext();
});

test("multi-capture summary includes multiple outcome groups", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservations({
    actions: ["completed_lifting_session", "missed_session", "recovery"],
    date: "2026-06-28"
  });
  const lines = buildTodayCapturedShellSummaryLines(result.summary);
  const copy = lines.join(" ").toLowerCase();

  assert.ok(result.summary.whatMovedForward.length > 0);
  assert.ok(result.summary.whatWasMissed.length > 0);
  assert.ok(result.summary.whatMayMatterTomorrow.length > 0);
  assert.equal(copy.includes("score"), false);
  assert.equal(copy.includes("streak"), false);

  clearConfirmedSetupContext();
});

test("multi-capture direct shell still works without Today context", () => {
  clearConfirmedSetupContext();

  const result = submitTodayCapturedShellObservations({
    actions: ["note", "recovery"],
    date: "2026-06-28"
  });

  assert.deepEqual(result.todayCaptured.observations.map((observation) => observation.type), ["note", "recovery"]);
  assert.ok(result.context.resources.some((resource) => resource.id.startsWith("resource-recovery-")));

  clearConfirmedSetupContext();
});
