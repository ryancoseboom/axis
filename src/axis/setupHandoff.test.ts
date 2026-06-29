import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisionGraph } from "./decisionGraph";
import { gatherFacts, generateToday } from "./engine";
import { morningInputToUserContext } from "./morningInput";
import { sampleRyanContext } from "./sampleRyanContext";
import { sampleRyanSetup, type SetupState } from "./setup";
import {
  buildConfirmedSetupContext,
  clearConfirmedSetupContext,
  confirmSetupForToday,
  getConfirmedSetupContext,
  setConfirmedSetupContext,
  setupContextIndicatorText
} from "./setupHandoff";

test("confirmed setup produces UserContext", () => {
  clearConfirmedSetupContext();

  const context = confirmSetupForToday(sampleRyanSetup);

  assert.equal(context.userName, "Ryan");
  assert.equal(getConfirmedSetupContext()?.userName, "Ryan");
  assert.ok(context.pillarMemory?.pillars.some((pillar) => pillar.name === "BJJ"));
  assert.ok(context.constraints.some((constraint) => constraint.id === "constraint-weekly-capacity-remaining"));
  assert.ok(context.resources.some((resource) => resource.id === "resource-weekly-capacity"));
  assert.ok(context.systems.some((system) => system.id === "system-momentum-pillar-bjj"));

  clearConfirmedSetupContext();
});

test("confirmed setup context includes setup-derived capacity facts", () => {
  const context = buildConfirmedSetupContext(sampleRyanSetup);

  assert.ok(context.constraints.some((constraint) => constraint.id === "constraint-weekly-capacity-remaining"));
  assert.ok(context.resources.some((resource) => resource.id === "resource-weekly-capacity"));
  assert.ok(context.systems.some((system) => system.id === "system-momentum-pillar-lifting"));
});

test("Today can generate from confirmed setup context", () => {
  clearConfirmedSetupContext();

  const context = confirmSetupForToday(sampleRyanSetup);
  const today = generateToday(context);

  assert.ok(today.theme.length > 0);
  assert.ok(today.protectedSession.title.length > 0);
  assert.ok(today.decisionGraph.nodes.length > 0);
  assert.ok(today.decisionGraph.nodes.some((node) => node.id === "constraint-constraint-weekly-capacity-remaining"));
  assert.ok(today.decisionGraph.nodes.some((node) => node.id === "constraint-resource-resource-weekly-capacity"));

  clearConfirmedSetupContext();
});

test("Decision Graph consumes setup capacity constraints resources and systems", () => {
  const context = buildConfirmedSetupContext(sampleRyanSetup);
  const facts = gatherFacts(context);
  const graph = buildDecisionGraph(facts);

  assert.ok(facts.constraints.some((constraint) => constraint.id === "constraint-weekly-capacity-remaining"));
  assert.ok(facts.resources.some((resource) => resource.id === "resource-weekly-capacity"));
  assert.ok(facts.systems.some((system) => system.id === "system-momentum-pillar-bjj"));
  assert.ok(graph.nodes.some((node) => node.id === "constraint-constraint-weekly-capacity-remaining"));
  assert.ok(graph.nodes.some((node) => node.id === "constraint-resource-resource-weekly-capacity"));
});

test("full setup handoff flow can confirm, generate Today, reset, and use Morning input", () => {
  clearConfirmedSetupContext();

  const setupContext = confirmSetupForToday(sampleRyanSetup);
  const setupToday = generateToday(getConfirmedSetupContext() ?? setupContext);

  assert.equal(setupContext.userName, "Ryan");
  assert.equal(setupContextIndicatorText(), "Reasoning from your confirmed profile");
  assert.ok(setupToday.protectedSession.title.length > 0);
  assert.ok(setupToday.decisionGraph.nodes.some((node) => node.id === "constraint-constraint-weekly-capacity-remaining"));

  clearConfirmedSetupContext();
  const morningToday = generateToday(morningInputToUserContext({ mainIntention: "Choose from Morning input" }));

  assert.equal(getConfirmedSetupContext(), undefined);
  assert.equal(setupContextIndicatorText(), undefined);
  assert.equal(morningToday.protectedSession.title, "Choose from Morning input");
  assert.ok(!morningToday.decisionGraph.nodes.some((node) => node.id === "constraint-constraint-weekly-capacity-remaining"));
});

test("setup context indicator appears when setup context is active", () => {
  clearConfirmedSetupContext();

  const context = confirmSetupForToday(sampleRyanSetup);

  assert.equal(setupContextIndicatorText(context), "Reasoning from your confirmed profile");
  assert.equal(setupContextIndicatorText(), "Reasoning from your confirmed profile");

  clearConfirmedSetupContext();
});

test("setup context indicator does not appear without setup context", () => {
  clearConfirmedSetupContext();

  assert.equal(setupContextIndicatorText(), undefined);
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

test("reset clears setup context and Morning input still works after reset", () => {
  clearConfirmedSetupContext();
  confirmSetupForToday(sampleRyanSetup);

  clearConfirmedSetupContext();

  const today = generateToday(morningInputToUserContext({ mainIntention: "Use Morning input instead" }));

  assert.equal(getConfirmedSetupContext(), undefined);
  assert.equal(setupContextIndicatorText(), undefined);
  assert.equal(today.protectedSession.title, "Use Morning input instead");
});

test("sample flow clears setup context before generating Today", () => {
  clearConfirmedSetupContext();
  confirmSetupForToday(sampleRyanSetup);

  clearConfirmedSetupContext();
  const today = generateToday(sampleRyanContext);

  assert.equal(getConfirmedSetupContext(), undefined);
  assert.equal(today.protectedSession.title, "Write and produce the next Halou sketch.");
});

test("returning to setup can replace prior context", () => {
  clearConfirmedSetupContext();
  confirmSetupForToday(sampleRyanSetup);

  const replacementSetup: SetupState = {
    ...sampleRyanSetup,
    userProfile: {
      ...sampleRyanSetup.userProfile,
      name: "Avery"
    },
    identityProfile: {
      ...sampleRyanSetup.identityProfile,
      desiredIdentityStatement: "Start from a freshly confirmed profile."
    }
  };
  const replacementContext = confirmSetupForToday(replacementSetup);

  assert.equal(replacementContext.userName, "Avery");
  assert.equal(getConfirmedSetupContext()?.userName, "Avery");
  assert.equal(getConfirmedSetupContext()?.themeSeed, "Start from a freshly confirmed profile.");

  clearConfirmedSetupContext();
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

  assert.equal(today.protectedSession.title, "Write and produce the next Halou sketch.");
});
