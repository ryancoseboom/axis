import assert from "node:assert/strict";
import test from "node:test";
import { clearLocalAxisStateForDev } from "./devLocalState";
import { generateToday } from "./engine";
import { AXIS_LOCAL_STATE_KEY, loadCapturedHistory, type AxisLocalStorage } from "./localPersistence";
import { morningInputToUserContext } from "./morningInput";
import { clearConfirmedSetupContext, confirmSetupForToday, getConfirmedSetupContext } from "./setupHandoff";
import { sampleRyanSetup } from "./setup";
import { submitTodayCapturedShellObservations } from "./todayCapturedShell";

class MemoryStorage implements AxisLocalStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function withBrowserStorage<T>(storage: AxisLocalStorage, run: () => T): T {
  const root = globalThis as Record<string, unknown>;
  const previousWindow = root.window;

  root.window = { localStorage: storage };
  try {
    return run();
  } finally {
    root.window = previousWindow;
  }
}

test("setup confirmation persists locally", () => {
  const storage = new MemoryStorage();

  withBrowserStorage(storage, () => {
    clearLocalAxisStateForDev();
    confirmSetupForToday(sampleRyanSetup);

    assert.ok(storage.getItem(AXIS_LOCAL_STATE_KEY)?.includes("confirmedSetupContext"));
  });
});

test("Today restores from local setup after refresh", () => {
  const storage = new MemoryStorage();

  withBrowserStorage(storage, () => {
    clearLocalAxisStateForDev();
    confirmSetupForToday(sampleRyanSetup);
    clearConfirmedSetupContext({ persist: false });

    const restored = getConfirmedSetupContext();
    assert.ok(restored);

    const today = generateToday(restored);

    assert.ok(today.timeline.length > 0);
    assert.ok(today.decisionGraph.nodes.some((node) => node.id === "constraint-constraint-weekly-capacity-remaining"));
  });
});

test("capture writes observations to local state", () => {
  const storage = new MemoryStorage();

  withBrowserStorage(storage, () => {
    clearLocalAxisStateForDev();
    confirmSetupForToday(sampleRyanSetup);

    submitTodayCapturedShellObservations({
      actions: ["completed_lifting_session", "recovery"],
      date: "2026-06-28"
    });

    const state = JSON.parse(storage.getItem(AXIS_LOCAL_STATE_KEY) ?? "{}");

    assert.equal(state.capturedHistory.length, 1);
    assert.deepEqual(state.capturedHistory[0].observations.map((observation: { type: string }) => observation.type), [
      "completed_program_session",
      "recovery"
    ]);
  });
});

test("Today after capture uses updated local context", () => {
  const storage = new MemoryStorage();

  withBrowserStorage(storage, () => {
    clearLocalAxisStateForDev();
    confirmSetupForToday(sampleRyanSetup);
    submitTodayCapturedShellObservations({
      actions: ["completed_lifting_session"],
      date: "2026-06-28"
    });
    clearConfirmedSetupContext({ persist: false });

    const restored = getConfirmedSetupContext();
    assert.ok(restored);
    assert.ok(restored.pillarMemory?.completedProgramSessions?.some((session) => session.programDayId.includes("pull-biceps")));
    assert.ok(restored.pillarMemory?.developmentSignals?.some((signal) => signal.title.includes("Push - chest")));

    const today = generateToday(restored);

    assert.ok(today.timeline.length > 0);
  });
});

test("clear local state resets the full loop", () => {
  const storage = new MemoryStorage();

  withBrowserStorage(storage, () => {
    clearLocalAxisStateForDev();
    confirmSetupForToday(sampleRyanSetup);
    submitTodayCapturedShellObservations({ actions: ["note"], date: "2026-06-28" });

    assert.equal(loadCapturedHistory(storage).length, 1);

    clearLocalAxisStateForDev();

    assert.equal(getConfirmedSetupContext(), undefined);
    assert.deepEqual(loadCapturedHistory(storage), []);
    assert.equal(storage.getItem(AXIS_LOCAL_STATE_KEY), null);
  });
});

test("direct Today still works safely after clear", () => {
  const storage = new MemoryStorage();

  withBrowserStorage(storage, () => {
    clearLocalAxisStateForDev();

    const today = generateToday(morningInputToUserContext({ mainIntention: "Start from Morning input" }));

    assert.equal(getConfirmedSetupContext(), undefined);
    assert.equal(today.protectedSession.title, "Start from Morning input");
  });
});

test("direct captured shell still works safely without restored context", () => {
  const storage = new MemoryStorage();

  withBrowserStorage(storage, () => {
    clearLocalAxisStateForDev();

    const result = submitTodayCapturedShellObservations({
      actions: ["note", "recovery"],
      date: "2026-06-28"
    });

    assert.deepEqual(result.todayCaptured.observations.map((observation) => observation.type), ["note", "recovery"]);
    assert.equal(loadCapturedHistory(storage).length, 1);
  });
});
