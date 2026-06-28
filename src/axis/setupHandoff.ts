import { buildUserContextFromSetup, type BuildUserContextFromSetupOptions, type SetupState } from "./setup";
import type { UserContext } from "./types";

let confirmedSetupContext: UserContext | undefined;

export function confirmSetupForToday(setup: SetupState, options: BuildUserContextFromSetupOptions = {}): UserContext {
  confirmedSetupContext = buildUserContextFromSetup(setup, options);
  return confirmedSetupContext;
}

export function setConfirmedSetupContext(context: UserContext): UserContext {
  confirmedSetupContext = context;
  return confirmedSetupContext;
}

export function getConfirmedSetupContext(): UserContext | undefined {
  return confirmedSetupContext;
}

export function clearConfirmedSetupContext(): void {
  confirmedSetupContext = undefined;
}
