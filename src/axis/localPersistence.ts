import type { TodayCaptureContext } from "./todayCaptureContext";
import type { TodayCaptured } from "./todayCaptured";
import type { UserContext } from "./types";

export type AxisLocalState = {
  version: 1;
  confirmedSetupContext?: UserContext;
  updatedUserContext?: UserContext;
  todayCaptureContext?: TodayCaptureContext;
  capturedHistory: TodayCaptured[];
};

export type AxisLocalStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const AXIS_LOCAL_STATE_KEY = "axis.localState.v1";

export function emptyAxisLocalState(): AxisLocalState {
  return {
    version: 1,
    capturedHistory: []
  };
}

export function loadAxisLocalState(storage: AxisLocalStorage | undefined = browserStorage()): AxisLocalState {
  if (!storage) {
    return emptyAxisLocalState();
  }

  try {
    const raw = storage.getItem(AXIS_LOCAL_STATE_KEY);
    if (!raw) {
      return emptyAxisLocalState();
    }

    const parsed = JSON.parse(raw) as Partial<AxisLocalState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.capturedHistory)) {
      return emptyAxisLocalState();
    }

    return {
      version: 1,
      confirmedSetupContext: parsed.confirmedSetupContext,
      updatedUserContext: parsed.updatedUserContext,
      todayCaptureContext: parsed.todayCaptureContext,
      capturedHistory: parsed.capturedHistory
    };
  } catch {
    return emptyAxisLocalState();
  }
}

export function saveAxisLocalState(state: AxisLocalState, storage: AxisLocalStorage | undefined = browserStorage()): AxisLocalState {
  if (storage) {
    storage.setItem(AXIS_LOCAL_STATE_KEY, JSON.stringify(state));
  }

  return state;
}

export function saveConfirmedSetupContext(context: UserContext, storage?: AxisLocalStorage): UserContext {
  const state = loadAxisLocalState(storage);
  saveAxisLocalState({ ...state, confirmedSetupContext: context, updatedUserContext: context }, storage);
  return context;
}

export function loadConfirmedSetupContext(storage?: AxisLocalStorage): UserContext | undefined {
  const state = loadAxisLocalState(storage);
  return state.updatedUserContext ?? state.confirmedSetupContext;
}

export function clearConfirmedSetupContextPersistence(storage?: AxisLocalStorage): void {
  const state = loadAxisLocalState(storage);
  const next: AxisLocalState = {
    ...state,
    confirmedSetupContext: undefined,
    updatedUserContext: undefined
  };

  saveAxisLocalState(next, storage);
}

export function saveTodayCaptureContext(context: TodayCaptureContext, storage?: AxisLocalStorage): TodayCaptureContext {
  const state = loadAxisLocalState(storage);
  saveAxisLocalState({ ...state, todayCaptureContext: context }, storage);
  return context;
}

export function loadTodayCaptureContext(storage?: AxisLocalStorage): TodayCaptureContext | undefined {
  return loadAxisLocalState(storage).todayCaptureContext;
}

export function clearTodayCaptureContextPersistence(storage?: AxisLocalStorage): void {
  const state = loadAxisLocalState(storage);
  saveAxisLocalState({ ...state, todayCaptureContext: undefined }, storage);
}

export function appendTodayCaptured(todayCaptured: TodayCaptured, storage?: AxisLocalStorage): TodayCaptured[] {
  const state = loadAxisLocalState(storage);
  const capturedHistory = [...state.capturedHistory, todayCaptured];

  saveAxisLocalState({ ...state, capturedHistory }, storage);

  return capturedHistory;
}

export function loadCapturedHistory(storage?: AxisLocalStorage): TodayCaptured[] {
  return loadAxisLocalState(storage).capturedHistory;
}

export function clearAxisLocalState(storage: AxisLocalStorage | undefined = browserStorage()): void {
  storage?.removeItem(AXIS_LOCAL_STATE_KEY);
}

function browserStorage(): AxisLocalStorage | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
