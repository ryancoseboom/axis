import { capacityPlanToDecisionGraphFacts } from "./capacityPlanner";
import { clearConfirmedSetupContextPersistence, loadConfirmedSetupContext, saveConfirmedSetupContext } from "./localPersistence";
import { buildUserContextFromSetup, buildWeeklyPlanFromSetup, type BuildUserContextFromSetupOptions, type SetupState } from "./setup";
import type { UserContext } from "./types";

let confirmedSetupContext: UserContext | undefined;

export type ClearConfirmedSetupContextOptions = {
  persist?: boolean;
};

export function buildConfirmedSetupContext(setup: SetupState, options: BuildUserContextFromSetupOptions = {}): UserContext {
  const context = buildUserContextFromSetup(setup, options);
  const weeklyPlan = buildWeeklyPlanFromSetup(setup);
  const capacityFacts = capacityPlanToDecisionGraphFacts(weeklyPlan);

  return {
    ...context,
    constraints: [...context.constraints, ...capacityFacts.constraints],
    resources: [...context.resources, ...capacityFacts.resources],
    systems: [...context.systems, ...capacityFacts.systems]
  };
}

export function confirmSetupForToday(setup: SetupState, options: BuildUserContextFromSetupOptions = {}): UserContext {
  confirmedSetupContext = buildConfirmedSetupContext(setup, options);
  saveConfirmedSetupContext(confirmedSetupContext);
  return confirmedSetupContext;
}

export function setConfirmedSetupContext(context: UserContext): UserContext {
  confirmedSetupContext = context;
  saveConfirmedSetupContext(confirmedSetupContext);
  return confirmedSetupContext;
}

export function getConfirmedSetupContext(): UserContext | undefined {
  if (!confirmedSetupContext) {
    confirmedSetupContext = loadConfirmedSetupContext();
  }

  return confirmedSetupContext;
}

export function setupContextIndicatorText(context: UserContext | undefined = confirmedSetupContext): string | undefined {
  return context ? "Reasoning from your confirmed profile" : undefined;
}

export function clearConfirmedSetupContext(options: ClearConfirmedSetupContextOptions = {}): void {
  confirmedSetupContext = undefined;
  if (options.persist ?? true) {
    clearConfirmedSetupContextPersistence();
  }
}
