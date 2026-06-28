import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import { morningInputToUserContext } from "./morningInput";
import { sampleRyanContext } from "./sampleRyanContext";
import { sampleRyanSetup } from "./setup";
import {
  clearConfirmedSetupContext,
  confirmSetupForToday,
  getConfirmedSetupContext,
  setConfirmedSetupContext
} from "./setupHandoff";

test("confirmed setup produces UserContext", () => {
  clearConfirmedSetupContext();

  const context = confirmSetupForToday(sampleRyanSetup);

  assert.equal(context.userName, "Ryan");
  assert.equal(getConfirmedSetupContext()?.userName, "Ryan");
  assert.ok(context.pillarMemory?.pillars.some((pillar) => pillar.name === "BJJ"));

  clearConfirmedSetupContext();
});

test("Today can generate from confirmed setup context", () => {
  clearConfirmedSetupContext();

  const context = confirmSetupForToday(sampleRyanSetup);
  const today = generateToday(context);

  assert.ok(today.theme.length > 0);
  assert.ok(today.protectedSession.title.length > 0);
  assert.ok(today.decisionGraph.nodes.length > 0);

  clearConfirmedSetupContext();
});

test("direct Today navigation still works without setup", () => {
  clearConfirmedSetupContext();

  assert.equal(getConfirmedSetupContext(), undefined);

  const today = generateToday(morningInputToUserContext({ mainIntention: "Protect the first useful block" }));

  assert.equal(today.protectedSession.title, "Protect the first useful block");
});

test("clearing setup handoff does not leave stale context", () => {
  clearConfirmedSetupContext();

  const context = confirmSetupForToday(sampleRyanSetup);
  assert.equal(getConfirmedSetupContext(), context);

  clearConfirmedSetupContext();

  assert.equal(getConfirmedSetupContext(), undefined);
});

test("replacing setup handoff prevents stale context after editing", () => {
  clearConfirmedSetupContext();
  confirmSetupForToday(sampleRyanSetup);

  const editedContext = morningInputToUserContext({ mainIntention: "Write the setup handoff note" });
  setConfirmedSetupContext(editedContext);

  assert.equal(getConfirmedSetupContext()?.themeSeed, "Write the setup handoff note");

  clearConfirmedSetupContext();
});

test("sample flow still works with no confirmed setup", () => {
  clearConfirmedSetupContext();

  const today = generateToday(sampleRyanContext);

  assert.equal(today.protectedSession.title, "Build the smallest working Today engine slice");
});
