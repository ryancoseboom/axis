import assert from "node:assert/strict";
import test from "node:test";
import { generateToday } from "./engine";
import {
  appendTodayCaptured,
  clearAxisLocalState,
  loadAxisLocalState,
  loadCapturedHistory,
  loadConfirmedSetupContext,
  saveConfirmedSetupContext,
  type AxisLocalStorage,
  AXIS_LOCAL_STATE_KEY
} from "./localPersistence";
import { buildConfirmedSetupContext } from "./setupHandoff";
import { sampleRyanSetup } from "./setup";
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

function captured(id = "today-captured-2026-06-28"): TodayCaptured {
  return {
    id,
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
    outcomes: [{
      id: "outcome-observation-2026-06-28-1-observation-recorded",
      type: "evidence_recorded",
      title: "Captured note was noted.",
      description: "The observation is available as local evidence.",
      relatedObjectIds: []
    }]
  };
}

test("setup context saves", () => {
  const storage = new MemoryStorage();
  const context = buildConfirmedSetupContext(sampleRyanSetup);

  saveConfirmedSetupContext(context, storage);

  assert.ok(storage.getItem(AXIS_LOCAL_STATE_KEY)?.includes("confirmedSetupContext"));
});

test("setup context loads", () => {
  const storage = new MemoryStorage();
  const context = buildConfirmedSetupContext(sampleRyanSetup);

  saveConfirmedSetupContext(context, storage);

  assert.equal(loadConfirmedSetupContext(storage)?.userName, "Ryan");
});

test("captured observations save", () => {
  const storage = new MemoryStorage();

  appendTodayCaptured(captured(), storage);

  assert.equal(loadCapturedHistory(storage).length, 1);
});

test("captured observations load", () => {
  const storage = new MemoryStorage();
  const first = captured("today-captured-first");
  const second = captured("today-captured-second");

  appendTodayCaptured(first, storage);
  appendTodayCaptured(second, storage);

  assert.deepEqual(loadCapturedHistory(storage).map((item) => item.id), ["today-captured-first", "today-captured-second"]);
});

test("clear removes persisted state", () => {
  const storage = new MemoryStorage();

  saveConfirmedSetupContext(buildConfirmedSetupContext(sampleRyanSetup), storage);
  appendTodayCaptured(captured(), storage);
  clearAxisLocalState(storage);

  assert.equal(storage.getItem(AXIS_LOCAL_STATE_KEY), null);
  assert.equal(loadConfirmedSetupContext(storage), undefined);
  assert.deepEqual(loadCapturedHistory(storage), []);
});

test("missing or corrupt persisted data falls back safely", () => {
  const missingStorage = new MemoryStorage();
  const corruptStorage = new MemoryStorage();

  corruptStorage.setItem(AXIS_LOCAL_STATE_KEY, "{not valid json");

  assert.deepEqual(loadAxisLocalState(missingStorage).capturedHistory, []);
  assert.equal(loadConfirmedSetupContext(missingStorage), undefined);
  assert.deepEqual(loadAxisLocalState(corruptStorage).capturedHistory, []);
  assert.equal(loadConfirmedSetupContext(corruptStorage), undefined);
});

test("Today can generate from restored setup context", () => {
  const storage = new MemoryStorage();
  const context = buildConfirmedSetupContext(sampleRyanSetup);

  saveConfirmedSetupContext(context, storage);
  const restored = loadConfirmedSetupContext(storage);
  assert.ok(restored);

  const today = generateToday(restored);

  assert.ok(today.theme.length > 0);
  assert.ok(today.timeline.length > 0);
});
