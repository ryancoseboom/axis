import assert from "node:assert/strict";
import test from "node:test";
import { clearLocalAxisStateForDev } from "./devLocalState";
import { generateToday } from "./engine";
import {
  appendTodayCaptured,
  AXIS_LOCAL_STATE_KEY,
  loadCapturedHistory,
  loadConfirmedSetupContext,
  type AxisLocalStorage
} from "./localPersistence";
import { morningInputToUserContext } from "./morningInput";
import { buildConfirmedSetupContext, getConfirmedSetupContext, setConfirmedSetupContext } from "./setupHandoff";
import { sampleRyanSetup } from "./setup";
import { buildTodayCaptureContext, getTodayCaptureContext, setTodayCaptureContext } from "./todayCaptureContext";
import type { TodayCaptured } from "./todayCaptured";

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

function captured(): TodayCaptured {
  return {
    id: "today-captured-2026-06-28",
    date: "2026-06-28",
    observations: [{
      id: "observation-2026-06-28-1",
      type: "note",
      source: "manual",
      date: "2026-06-28",
      title: "Captured note",
      notes: "",
      evidence: []
    }],
    outcomes: []
  };
}

test("dev clear action clears local Axis state", () => {
  const storage = new MemoryStorage();
  const context = buildConfirmedSetupContext(sampleRyanSetup);

  setConfirmedSetupContext(context);
  appendTodayCaptured(captured(), storage);
  clearLocalAxisStateForDev(storage);

  assert.equal(storage.getItem(AXIS_LOCAL_STATE_KEY), null);
  assert.equal(getConfirmedSetupContext(), undefined);
});

test("dev clear removes persisted setup", () => {
  const storage = new MemoryStorage();
  const context = buildConfirmedSetupContext(sampleRyanSetup);

  setConfirmedSetupContext(context);
  storage.setItem(AXIS_LOCAL_STATE_KEY, JSON.stringify({ version: 1, confirmedSetupContext: context, updatedUserContext: context, capturedHistory: [] }));

  clearLocalAxisStateForDev(storage);

  assert.equal(loadConfirmedSetupContext(storage), undefined);
  assert.equal(getConfirmedSetupContext(), undefined);
});

test("dev clear removes persisted capture history", () => {
  const storage = new MemoryStorage();

  appendTodayCaptured(captured(), storage);

  assert.equal(loadCapturedHistory(storage).length, 1);

  clearLocalAxisStateForDev(storage);

  assert.deepEqual(loadCapturedHistory(storage), []);
});

test("dev clear removes capture context", () => {
  const context = buildConfirmedSetupContext(sampleRyanSetup);
  const today = generateToday(context);

  setTodayCaptureContext(buildTodayCaptureContext(today, context, "setup"));
  assert.ok(getTodayCaptureContext());

  clearLocalAxisStateForDev(new MemoryStorage());

  assert.equal(getTodayCaptureContext(), undefined);
});

test("Today falls back safely after dev clear", () => {
  setConfirmedSetupContext(buildConfirmedSetupContext(sampleRyanSetup));
  clearLocalAxisStateForDev(new MemoryStorage());

  const today = generateToday(morningInputToUserContext({ mainIntention: "Start fresh after reset" }));

  assert.equal(getConfirmedSetupContext(), undefined);
  assert.equal(today.protectedSession.title, "Start fresh after reset");
});
