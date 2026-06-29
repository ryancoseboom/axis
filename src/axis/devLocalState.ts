import { clearAxisLocalState, type AxisLocalStorage } from "./localPersistence";
import { clearConfirmedSetupContext } from "./setupHandoff";
import { clearTodayCaptureContext } from "./todayCaptureContext";

export function clearLocalAxisStateForDev(storage?: AxisLocalStorage): void {
  clearConfirmedSetupContext({ persist: false });
  clearTodayCaptureContext({ persist: false });
  clearAxisLocalState(storage);
}
