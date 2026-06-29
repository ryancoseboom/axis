import { attachDomainModelToPillar, findDomainModel, sampleDomainModelCatalog, type DomainModelCatalog } from "./domainCatalog";
import type { FlexibleCommitment, MomentumRequirement, PlannedSession, WeeklyPlan } from "./capacityPlanner";
import { applyPracticeEntryToKnowledgeState, createKnowledgeMap } from "./knowledgeMaps";
import type {
  AvailabilityWindow,
  CalendarContext,
  ExternalCommitment,
  KnowledgeNodeStatus,
  KnowledgeState,
  MovementOption,
  Pillar,
  PillarMemory,
  PracticeEntry,
  Program,
  ProgramDay,
  ProgramPrescription,
  UserContext
} from "./types";

export type ExperienceLevel = "new" | "beginner" | "intermediate" | "advanced" | "expert" | string;

export type CalendarProviderPreference = "manual" | "google" | "apple" | "none";

export type CalendarImportStatus = "not_started" | "placeholder" | "connected" | "declined";

export type UserProfile = {
  name: string;
  timezone?: string;
};

export type IdentityProfile = {
  desiredIdentityStatement: string;
  values: string[];
  longTermAspirations: string[];
  nonNegotiables: string[];
};

export type DomainConstraint = {
  id?: string;
  description: string;
};

export type DomainProfile = {
  domainId?: string;
  domainName: string;
  aliases?: string[];
  currentLevel: ExperienceLevel;
  credentials?: string[];
  knownConstraints?: DomainConstraint[];
  goals?: string[];
  recentHistory?: string[];
  knownConcepts?: string[];
};

export type PillarSetup = {
  id?: string;
  name: string;
  description: string;
  priority: number;
  identityWeight?: number;
  status?: "active" | "inactive";
  domainProfile?: DomainProfile;
};

export type RoutineSetup = {
  id?: string;
  pillarName: string;
  name: string;
  cadence: string;
  preferredDurationMinutes?: number;
  resources?: string[];
};

export type ProgramMovementSetup = {
  name: string;
  movementPattern?: string;
  primaryFocus?: string;
  secondaryFocus?: string[];
  equipment?: string[];
  contraindications?: string[];
  tags?: string[];
};

export type ProgramDaySetup = {
  name: string;
  focus: string;
  movementOptions?: ProgramMovementSetup[];
  prescription?: Partial<ProgramPrescription>;
};

export type ProgramSetup = {
  id?: string;
  pillarName: string;
  name: string;
  description?: string;
  cadence: string;
  preferredDurationMinutes?: number;
  equipment?: string[];
  resources?: string[];
  status?: "active" | "inactive";
  days?: ProgramDaySetup[];
};

export type CalendarSetupPreference = {
  preferredProvider: CalendarProviderPreference;
  importStatus: CalendarImportStatus;
  dayStart?: string;
  dayEnd?: string;
  recoveryStartsAt?: string;
  notes?: string;
};

export type SetupState = {
  userProfile: UserProfile;
  identityProfile: IdentityProfile;
  pillars: PillarSetup[];
  routines?: RoutineSetup[];
  programs?: ProgramSetup[];
  calendar: CalendarSetupPreference;
  knowledgeStates?: KnowledgeState[];
};

export type BuildUserContextFromSetupOptions = {
  domainCatalog?: DomainModelCatalog;
};

export type SetupValidationIssue = {
  code: "missing_user_name" | "missing_identity" | "missing_pillar" | "invalid_pillar_priority" | "missing_calendar_preference";
  message: string;
  path: string;
};

export type SetupValidationResult = {
  valid: boolean;
  errors: SetupValidationIssue[];
};

export function validateSetupState(setup: SetupState): SetupValidationResult {
  const errors: SetupValidationIssue[] = [];

  if (!setup.userProfile.name.trim()) {
    errors.push({ code: "missing_user_name", message: "Setup requires a user name.", path: "userProfile.name" });
  }

  if (!setup.identityProfile.desiredIdentityStatement.trim()) {
    errors.push({ code: "missing_identity", message: "Setup requires a desired identity statement.", path: "identityProfile.desiredIdentityStatement" });
  }

  if (setup.pillars.length === 0) {
    errors.push({ code: "missing_pillar", message: "Setup requires at least one Pillar.", path: "pillars" });
  }

  setup.pillars.forEach((pillar, index) => {
    if (pillar.priority < 1 || pillar.priority > 10) {
      errors.push({ code: "invalid_pillar_priority", message: "Pillar priority must be between 1 and 10.", path: `pillars.${index}.priority` });
    }
  });

  if (!setup.calendar.preferredProvider) {
    errors.push({ code: "missing_calendar_preference", message: "Setup requires a calendar preference.", path: "calendar.preferredProvider" });
  }

  return { valid: errors.length === 0, errors };
}

export function buildUserContextFromSetup(setup: SetupState, options: BuildUserContextFromSetupOptions = {}): UserContext {
  const validation = validateSetupState(setup);
  if (!validation.valid) {
    throw new SetupValidationError(validation.errors);
  }

  const domainCatalog = options.domainCatalog ?? sampleDomainModelCatalog;
  const pillars = setup.pillars.map((pillar) => setupPillarToPillar(pillar, domainCatalog));
  const programs = (setup.programs ?? []).map((program) => setupProgramToProgram(program, pillars));
  const practiceEntries = setupToPracticeEntries(setup, pillars);
  const knowledgeStates = initializeKnowledgeStatesFromSetup(setup, pillars, practiceEntries, programs);
  const calendarContext = setupCalendarToCalendarContext(setup.calendar);

  return {
    userName: setup.userProfile.name.trim(),
    dateLabel: "Today",
    themeSeed: setup.identityProfile.desiredIdentityStatement,
    principles: [
      ...setup.identityProfile.values.map((value, index) => ({
        id: `principle-value-${index + 1}`,
        name: value,
        statement: value
      })),
      ...setup.identityProfile.nonNegotiables.map((value, index) => ({
        id: `principle-non-negotiable-${index + 1}`,
        name: value,
        statement: `Non-negotiable: ${value}`
      }))
    ],
    pursuits: pillars.map((pillar) => ({
      id: `pursuit-${slug(pillar.name)}`,
      name: pillar.name,
      whyItMatters: pillar.description
    })),
    missions: pillars.filter((pillar) => pillar.status === "active").map((pillar) => ({
      id: `mission-setup-${slug(pillar.name)}`,
      pursuitId: `pursuit-${slug(pillar.name)}`,
      name: `Develop ${pillar.name}`,
      currentNeed: currentNeedForPillar(setup, pillar)
    })),
    milestones: setup.identityProfile.longTermAspirations.map((aspiration, index) => ({
      id: `milestone-aspiration-${index + 1}`,
      missionId: `mission-setup-${slug(pillars[0]?.name ?? "identity")}`,
      name: aspiration,
      gravity: 8,
      evidence: "Named during setup as a long-term aspiration."
    })),
    systems: [
      ...setup.routines?.map((routine) => ({
        id: routine.id ?? `system-routine-${slug(routine.name)}`,
        name: routine.name,
        protects: `${routine.cadence}${routine.preferredDurationMinutes ? ` / ${routine.preferredDurationMinutes} minutes` : ""}`,
        currentState: "healthy" as const
      })) ?? [],
      {
        id: "system-setup-calendar",
        name: "Calendar preference",
        protects: `${setup.calendar.preferredProvider} calendar setup`,
        currentState: setup.calendar.importStatus === "connected" ? "healthy" as const : "strained" as const
      }
    ],
    events: [
      {
        id: "event-setup-calendar-review",
        title: "Review calendar setup",
        window: { start: "10:00", end: "10:30" },
        kind: "fixed"
      }
    ],
    constraints: [
      ...setup.pillars.flatMap((pillar) => (pillar.domainProfile?.knownConstraints ?? []).map((constraint, index) => ({
        id: constraint.id ?? `constraint-${slug(pillar.name)}-${index + 1}`,
        description: `${pillar.name}: ${constraint.description}`
      }))),
      {
        id: "constraint-calendar-setup",
        description: `Calendar preference is ${setup.calendar.preferredProvider}; import status is ${setup.calendar.importStatus}.`
      }
    ],
    resources: [
      {
        id: "resource-setup-focus",
        name: "Default focus window",
        energy: "high",
        focusWindow: { start: setup.calendar.dayStart ?? "08:45", end: "10:00" }
      },
      ...resourceNamesFromSetup(setup).map((resource, index) => ({
        id: `resource-setup-${index + 1}`,
        name: resource,
        energy: "steady" as const,
        focusWindow: { start: "14:00", end: "16:00" }
      }))
    ],
    calendarContext,
    pillarMemory: {
      pillars,
      practiceEntries,
      programs,
      knowledgeStates
    }
  };
}

export function buildWeeklyPlanFromSetup(setup: SetupState, options: { weekStart?: string; totalCapacityMinutes?: number; reserveMinutes?: number } = {}): WeeklyPlan {
  const validation = validateSetupState(setup);
  if (!validation.valid) {
    throw new SetupValidationError(validation.errors);
  }

  const weekStart = options.weekStart ?? "2026-06-29";

  return {
    id: `weekly-plan-${weekStart}`,
    weekStart,
    capacity: {
      weekStart,
      totalMinutes: options.totalCapacityMinutes ?? 2400,
      reserveMinutes: options.reserveMinutes ?? 420
    },
    fixedCommitments: [],
    flexibleCommitments: flexibleCommitmentsFromSetup(setup),
    plannedSessions: plannedSessionsFromSetup(setup),
    momentumRequirements: momentumRequirementsFromSetup(setup)
  };
}

export class SetupValidationError extends Error {
  readonly errors: SetupValidationIssue[];

  constructor(errors: SetupValidationIssue[]) {
    super("SetupState failed validation.");
    this.name = "SetupValidationError";
    this.errors = errors;
  }
}

export const sampleRyanSetup: SetupState = {
  userProfile: {
    name: "Ryan",
    timezone: "America/Los_Angeles"
  },
  identityProfile: {
    desiredIdentityStatement: "Build a life organized around clear work, strong training, music, and care.",
    values: ["Self-respect over throughput", "Reality wins", "Protect the work before drift"],
    longTermAspirations: ["Care for Porthos with steadiness", "Stay dangerous and technical in BJJ", "Keep writing and producing music with Halou"],
    nonNegotiables: ["No plan that ignores recovery", "Protect deep work", "Keep training honest"]
  },
  pillars: [
    {
      name: "Porthos",
      description: "Care, relationship, and daily steadiness with Porthos.",
      priority: 8,
      identityWeight: 7,
      status: "active",
      domainProfile: {
        domainName: "Porthos",
        currentLevel: "advanced",
        goals: ["Keep care steady", "Protect daily routines", "Stay present"],
        recentHistory: ["Porthos care", "Daily steadiness"],
        knownConcepts: ["Care", "Routine", "Presence"]
      }
    },
    {
      name: "Music",
      description: "Write, record, and deepen musical craft.",
      priority: 8,
      identityWeight: 8,
      status: "active",
      domainProfile: {
        domainName: "Music",
        aliases: ["Songwriting"],
        currentLevel: "advanced",
        credentials: ["Halou"],
        goals: ["Write", "Produce", "Keep the emotional center intact"],
        recentHistory: ["Writing and production sketches"],
        knownConcepts: ["Songwriting", "Recording", "Arrangement", "Production"]
      }
    },
    {
      name: "BJJ",
      description: "Develop skill, composure, and technical depth in Brazilian jiu-jitsu.",
      priority: 8,
      identityWeight: 8,
      status: "active",
      domainProfile: {
        domainId: "domain-brazilian-jiu-jitsu",
        domainName: "Brazilian Jiu-Jitsu",
        aliases: ["BJJ"],
        currentLevel: "advanced",
        credentials: ["Purple belt"],
        knownConstraints: [{ description: "Training must respect recovery and joint irritation." }],
        goals: ["Sharpen Arm Bar chains", "Improve Back Takes", "Keep guard retention alive"],
        recentHistory: ["Trained arm bars from closed guard", "Back take rounds"],
        knownConcepts: ["Closed Guard", "Arm Bar", "Triangle", "Omoplata", "Back Takes", "Guard Retention"]
      }
    },
    {
      name: "Lifting",
      description: "Protect strength, vitality, and recovery.",
      priority: 7,
      identityWeight: 7,
      status: "active",
      domainProfile: {
        domainName: "Weightlifting",
        aliases: ["Strength Training"],
        currentLevel: "intermediate",
        knownConstraints: [{ id: "constraint-elbow-caution", description: "Use caution with elbow-irritating curl variations." }],
        goals: ["Keep the 5-day lifting cycle moving", "Build strength without irritating elbows"],
        recentHistory: ["Pull and biceps day", "Push and chest day"],
        knownConcepts: ["Pull", "Push", "Back", "Biceps", "Cable Row", "Squat"]
      }
    }
  ],
  routines: [
    { pillarName: "BJJ", name: "BJJ training", cadence: "2-4 sessions per week", preferredDurationMinutes: 90 },
    { pillarName: "Music", name: "Writing and production", cadence: "weekly", preferredDurationMinutes: 90 },
    { pillarName: "Porthos", name: "Porthos care", cadence: "daily", preferredDurationMinutes: 30 }
  ],
  programs: [
    {
      pillarName: "Lifting",
      name: "5-day weightlifting cycle",
      description: "Repeating development cycle for strength and muscular balance.",
      cadence: "5-day repeating cycle",
      preferredDurationMinutes: 60,
      equipment: ["dumbbells", "cable machine", "Smith machine", "barbell", "plates"],
      resources: ["dumbbells", "cable machine", "Smith machine", "barbell", "plates"],
      days: [
        { name: "Pull - biceps", focus: "biceps", movementOptions: [{ name: "cable curl", primaryFocus: "biceps", equipment: ["cable machine"], tags: ["biceps", "pull"] }] },
        { name: "Push - chest", focus: "chest", movementOptions: [{ name: "dumbbell bench press", primaryFocus: "chest", equipment: ["dumbbells"], tags: ["chest", "push"] }] },
        { name: "Pull - back", focus: "back", movementOptions: [{ name: "seated cable row", primaryFocus: "back", equipment: ["cable machine"], tags: ["back", "pull"] }] },
        { name: "Push - shoulders", focus: "shoulders", movementOptions: [{ name: "dumbbell shoulder press", primaryFocus: "shoulders", equipment: ["dumbbells"], tags: ["shoulders", "push"] }] },
        { name: "Legs", focus: "legs", movementOptions: [{ name: "Smith squat", movementPattern: "squat", primaryFocus: "quads", equipment: ["Smith machine", "plates"], tags: ["legs", "squat"] }] }
      ]
    }
  ],
  calendar: {
    preferredProvider: "manual",
    importStatus: "placeholder",
    dayStart: "08:00",
    dayEnd: "18:00",
    recoveryStartsAt: "20:30",
    notes: "Calendar-shaped setup only; no live integration yet."
  }
};

function setupPillarToPillar(pillar: PillarSetup, domainCatalog: DomainModelCatalog): Pillar {
  const id = pillar.id ?? `pillar-${slug(pillar.name)}`;
  const concepts = pillar.domainProfile?.knownConcepts ?? [
    pillar.domainProfile?.domainName ?? pillar.name
  ];
  const basePillar = {
    id,
    name: pillar.name.trim(),
    description: pillar.description.trim(),
    priority: pillar.priority,
    identityWeight: pillar.identityWeight ?? pillar.priority,
    status: pillar.status ?? "active",
    knowledgeMap: createKnowledgeMap({
      pillarId: id,
      name: `${pillar.domainProfile?.domainName ?? pillar.name} Knowledge Map`,
      concepts: concepts.map((concept) => ({ name: concept }))
    })
  };
  const domainModel = findDomainModelForSetup(domainCatalog, pillar);

  return domainModel ? attachDomainModelToPillar(basePillar, domainModel) : basePillar;
}

function plannedSessionsFromSetup(setup: SetupState): PlannedSession[] {
  const routineSessions = (setup.routines ?? []).filter((routine) => normalize(routine.pillarName) !== "porthos").flatMap((routine) => {
    const count = sessionCountFromCadence(routine.cadence);
    return Array.from({ length: count }, (_, index) => ({
      id: `capacity-routine-${slug(routine.pillarName)}-${slug(routine.name)}-${index + 1}`,
      kind: "planned_session" as const,
      title: routine.name,
      pillarId: `pillar-${slug(routine.pillarName)}`,
      durationMinutes: routine.preferredDurationMinutes ?? defaultDurationForPillar(routine.pillarName),
      cognitiveLoad: cognitiveLoadForPillar(routine.pillarName),
      physicalLoad: physicalLoadForPillar(routine.pillarName),
      momentumValue: 7
    }));
  });
  const programSessions = (setup.programs ?? [])
    .filter((program) => (program.status ?? "active") === "active")
    .flatMap((program) => {
      const count = sessionCountFromCadence(program.cadence, program.days?.length);
      const days = program.days?.length ? program.days : [{ name: program.name, focus: program.name }];

      return Array.from({ length: count }, (_, index) => {
        const day = days[index % days.length];
        return {
          id: `capacity-program-${slug(program.pillarName)}-${slug(program.name)}-${index + 1}`,
          kind: "planned_session" as const,
          title: day ? `${program.name}: ${day.name}` : program.name,
          pillarId: `pillar-${slug(program.pillarName)}`,
          durationMinutes: program.preferredDurationMinutes ?? defaultDurationForPillar(program.pillarName),
          physicalLoad: "medium" as const,
          recoveryCost: "medium" as const,
          momentumValue: 8
        };
      });
    });

  return [...routineSessions, ...programSessions].sort((a, b) => a.id.localeCompare(b.id));
}

function flexibleCommitmentsFromSetup(setup: SetupState): FlexibleCommitment[] {
  const porthosRoutines = (setup.routines ?? []).filter((routine) => normalize(routine.pillarName) === "porthos");
  if (porthosRoutines.length > 0) {
    return porthosRoutines.flatMap((routine) => {
      const count = sessionCountFromCadence(routine.cadence);
      return Array.from({ length: count }, (_, index) => ({
        id: `capacity-flex-${slug(routine.pillarName)}-${slug(routine.name)}-${index + 1}`,
        kind: "flexible" as const,
        title: routine.name,
        pillarId: `pillar-${slug(routine.pillarName)}`,
        durationMinutes: routine.preferredDurationMinutes ?? defaultDurationForPillar(routine.pillarName),
        movable: true,
        recoveryCost: "low" as const,
        cognitiveLoad: "medium" as const,
        momentumValue: 8
      }));
    });
  }

  return setup.pillars.filter((pillar) => normalize(pillar.name) === "porthos").map((pillar) => ({
    id: "capacity-flex-porthos-care-1",
    kind: "flexible" as const,
    title: "Porthos care",
    pillarId: `pillar-${slug(pillar.name)}`,
    durationMinutes: defaultDurationForPillar(pillar.name),
    movable: true,
    recoveryCost: "low" as const,
    cognitiveLoad: "medium" as const,
    momentumValue: 8
  }));
}

function momentumRequirementsFromSetup(setup: SetupState): MomentumRequirement[] {
  return setup.pillars
    .filter((pillar) => (pillar.status ?? "active") === "active")
    .map((pillar) => {
      const program = setup.programs?.find((item) => normalize(item.pillarName) === normalize(pillar.name) && (item.status ?? "active") === "active");
      const routine = setup.routines?.find((item) => normalize(item.pillarName) === normalize(pillar.name));
      const count = program ? sessionCountFromCadence(program.cadence, program.days?.length) : routine ? sessionCountFromCadence(routine.cadence) : defaultMomentumSessionsForPillar(pillar.name);
      const duration = program?.preferredDurationMinutes ?? routine?.preferredDurationMinutes ?? defaultDurationForPillar(pillar.name);

      return {
        pillarId: `pillar-${slug(pillar.name)}`,
        pillarName: pillar.name,
        minimumSessions: count,
        minimumMinutes: count * duration
      };
    });
}

function initializeKnowledgeStatesFromSetup(
  setup: SetupState,
  pillars: Pillar[],
  practiceEntries: PracticeEntry[],
  programs: Program[]
): KnowledgeState[] {
  let states = setup.knowledgeStates ?? [];

  for (const entry of practiceEntries) {
    states = applyPracticeEntryToKnowledgeState({ pillars, practiceEntries, programs, knowledgeStates: states }, entry);
  }

  for (const pillarSetup of setup.pillars) {
    const pillar = pillars.find((item) => normalize(item.name) === normalize(pillarSetup.name));
    if (!pillar || !pillarSetup.domainProfile) continue;

    const profile = pillarSetup.domainProfile;
    const inferred = [
      ...statesFromKnownConcepts(pillar, profile),
      ...statesFromLevelAndCredentials(pillar, profile),
      ...statesFromGoals(pillar, profile),
      ...statesFromPrograms(pillar, programs),
      ...statesFromDomainSpecificHeuristics(pillar, profile)
    ];

    states = mergeKnowledgeStates(states, inferred);
  }

  return states.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
}

function statesFromKnownConcepts(pillar: Pillar, profile: DomainProfile): KnowledgeState[] {
  return (profile.knownConcepts ?? []).flatMap((concept) => {
    const node = findNodeByConceptText(pillar, concept);
    return node ? [stateFor(node.id, "introduced")] : [];
  });
}

function statesFromLevelAndCredentials(pillar: Pillar, profile: DomainProfile): KnowledgeState[] {
  const levelText = normalize([profile.currentLevel, ...(profile.credentials ?? [])].join(" "));
  const foundationStatus = levelText.includes("purple belt") || levelText.includes("advanced") || levelText.includes("expert") ? "developing" : "introduced";
  const foundationalNames = foundationalConceptNames(profile);

  return foundationalNames.flatMap((name) => {
    const node = findNodeByConceptText(pillar, name);
    return node ? [stateFor(node.id, foundationStatus)] : [];
  });
}

function statesFromGoals(pillar: Pillar, profile: DomainProfile): KnowledgeState[] {
  return (profile.goals ?? []).flatMap((goal) =>
    pillar.knowledgeMap.nodes
      .filter((node) => normalize(goal).includes(normalize(node.concept.name)))
      .map((node) => stateFor(node.id, "developing"))
  );
}

function statesFromPrograms(pillar: Pillar, programs: Program[]): KnowledgeState[] {
  return programs
    .filter((program) => program.pillarId === pillar.id && program.status === "active")
    .flatMap((program) => program.days.flatMap((day) => [
      day.name,
      day.focus,
      ...day.movementOptions.flatMap((movement) => [movement.name, movement.primaryFocus, ...movement.tags])
    ]))
    .flatMap((item) => {
      const node = findNodeByConceptText(pillar, item);
      return node ? [stateFor(node.id, "introduced")] : [];
    });
}

function statesFromDomainSpecificHeuristics(pillar: Pillar, profile: DomainProfile): KnowledgeState[] {
  const domain = normalize(profile.domainName);
  const credentials = normalize((profile.credentials ?? []).join(" "));
  const history = normalize((profile.recentHistory ?? []).join(" "));
  const states: KnowledgeState[] = [];

  if (domain.includes("brazilian jiu jitsu") || domain === "bjj") {
    if (credentials.includes("purple belt") || normalize(profile.currentLevel).includes("advanced")) {
      states.push(...["Closed Guard", "Arm Bar"].flatMap((name) => {
        const node = findNodeByConceptText(pillar, name);
        return node ? [stateFor(node.id, "developing")] : [];
      }));
    }
  }

  if (domain.includes("weightlifting") || domain.includes("strength")) {
    if (history.includes("cable row") || history.includes("seated cable row")) {
      const node = findNodeByConceptText(pillar, "Cable Row");
      if (node) states.push(stateFor(node.id, "practiced"));
    }
  }

  if (domain.includes("music") || credentials.includes("halou")) {
    states.push(...["Songwriting", "Production"].flatMap((name) => {
      const node = findNodeByConceptText(pillar, name);
      return node ? [stateFor(node.id, "developing")] : [];
    }));
  }

  if (domain.includes("axis")) {
    states.push(...["Decision Graph", "Domain Models", "Knowledge Maps"].flatMap((name) => {
      const node = findNodeByConceptText(pillar, name);
      return node ? [stateFor(node.id, "developing")] : [];
    }));
  }

  return states;
}

function foundationalConceptNames(profile: DomainProfile): string[] {
  const domain = normalize(profile.domainName);

  if (domain.includes("brazilian jiu jitsu") || domain === "bjj") return ["Closed Guard"];
  if (domain.includes("weightlifting") || domain.includes("strength")) return ["Pull", "Push"];
  if (domain.includes("music")) return ["Songwriting"];
  if (domain.includes("axis")) return ["Decision Graph"];
  return (profile.knownConcepts ?? []).slice(0, 2);
}

function findNodeByConceptText(pillar: Pillar, value: string) {
  const normalized = normalize(value);

  return pillar.knowledgeMap.nodes.find((node) => {
    const names = [node.concept.name, ...(node.concept.aliases ?? []), ...(node.concept.sourceTopicIds ?? [])];
    return names.some((name) => normalize(name) === normalized || normalized.includes(normalize(name)));
  });
}

function stateFor(nodeId: string, status: KnowledgeNodeStatus): KnowledgeState {
  return {
    nodeId,
    status,
    introducedDate: "2026-06-25",
    lastPracticedDate: status === "practiced" ? "2026-06-25" : undefined,
    reviewAfterDate: status === "practiced" ? "2026-06-27" : undefined
  };
}

function mergeKnowledgeStates(existing: KnowledgeState[], next: KnowledgeState[]): KnowledgeState[] {
  const states = new Map(existing.map((state) => [state.nodeId, state]));

  for (const state of next) {
    const current = states.get(state.nodeId);
    states.set(state.nodeId, current ? strongerState(current, state) : state);
  }

  return [...states.values()];
}

function strongerState(current: KnowledgeState, next: KnowledgeState): KnowledgeState {
  if (stateRank(next.status) <= stateRank(current.status)) return current;

  return {
    ...current,
    ...next,
    introducedDate: current.introducedDate ?? next.introducedDate,
    lastPracticedDate: latestDate(current.lastPracticedDate, next.lastPracticedDate),
    reviewAfterDate: latestDate(current.reviewAfterDate, next.reviewAfterDate)
  };
}

function stateRank(status: KnowledgeNodeStatus): number {
  const rank: Record<KnowledgeNodeStatus, number> = {
    never_seen: 0,
    introduced: 1,
    developing: 2,
    needs_review: 3,
    practiced: 4,
    confident: 5
  };

  return rank[status];
}

function findDomainModelForSetup(domainCatalog: DomainModelCatalog, pillar: PillarSetup) {
  const profile = pillar.domainProfile;
  const candidates = [
    profile?.domainId,
    profile?.domainName,
    ...(profile?.aliases ?? []),
    pillar.name
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const domainModel = findDomainModel(domainCatalog, candidate);
    if (domainModel) return domainModel;
  }

  return undefined;
}

function setupProgramToProgram(program: ProgramSetup, pillars: Pillar[]): Program {
  const pillar = pillars.find((item) => normalize(item.name) === normalize(program.pillarName));
  const programId = program.id ?? `program-${slug(program.pillarName)}-${slug(program.name)}`;
  const days = (program.days?.length ? program.days : [{ name: program.name, focus: program.name }]).map((day, index) => setupProgramDayToProgramDay(programId, day, index));

  return {
    id: programId,
    pillarId: pillar?.id ?? `pillar-${slug(program.pillarName)}`,
    name: program.name,
    description: program.description ?? `${program.cadence} program created during setup.`,
    cycleType: "repeating",
    days,
    status: program.status ?? "active"
  };
}

function setupProgramDayToProgramDay(programId: string, day: ProgramDaySetup, index: number): ProgramDay {
  return {
    id: `${programId}-day-${slug(day.name)}`,
    name: day.name,
    focus: day.focus,
    sequenceIndex: index,
    prescription: {
      movementCount: day.prescription?.movementCount ?? Math.max(1, day.movementOptions?.length ?? 1),
      setsPerMovement: day.prescription?.setsPerMovement ?? 3,
      repRange: day.prescription?.repRange ?? "setup-defined work",
      notes: day.prescription?.notes ?? "Program structure captured during setup."
    },
    movementOptions: (day.movementOptions ?? []).map((movement) => setupMovementToMovementOption(movement))
  };
}

function setupMovementToMovementOption(movement: ProgramMovementSetup): MovementOption {
  return {
    id: `movement-${slug(movement.name)}`,
    name: movement.name,
    movementPattern: movement.movementPattern ?? movement.primaryFocus ?? movement.name,
    primaryFocus: movement.primaryFocus ?? movement.name,
    secondaryFocus: movement.secondaryFocus ?? [],
    equipment: movement.equipment ?? [],
    contraindications: movement.contraindications ?? [],
    tags: movement.tags ?? []
  };
}

function setupToPracticeEntries(setup: SetupState, pillars: Pillar[]): PracticeEntry[] {
  return setup.pillars.flatMap((pillarSetup) => {
    const pillar = pillars.find((item) => normalize(item.name) === normalize(pillarSetup.name));
    const history = pillarSetup.domainProfile?.recentHistory ?? [];
    return history.map((item, index) => ({
      id: `practice-setup-${slug(pillarSetup.name)}-${index + 1}`,
      pillarId: pillar?.id ?? `pillar-${slug(pillarSetup.name)}`,
      date: setupHistoryDate(index),
      title: item,
      notes: `Imported from setup history for ${pillarSetup.name}.`,
      topics: conceptsForHistory(item, pillarSetup.domainProfile?.knownConcepts ?? []),
      intensity: "medium" as const,
      confidence: 5,
      familiarity: 5,
      source: "manual" as const
    }));
  });
}

function setupCalendarToCalendarContext(calendar: CalendarSetupPreference): CalendarContext {
  const dayStart = calendar.dayStart ?? "08:00";
  const dayEnd = calendar.dayEnd ?? "18:00";
  const recoveryStartsAt = calendar.recoveryStartsAt ?? "20:30";
  const commitments: ExternalCommitment[] = [];
  const availabilityWindows: AvailabilityWindow[] = calendar.preferredProvider === "none" ? [] : [
    {
      id: "availability-setup-default",
      start: dayStart,
      end: "10:00",
      durationMinutes: durationMinutes(dayStart, "10:00"),
      focusSuitable: true,
      partOfDay: "morning",
      source: "manual",
      reason: "Calendar preference captured during setup; no live import yet."
    }
  ];

  return { commitments, availabilityWindows, dayStart, dayEnd, recoveryStartsAt };
}

function currentNeedForPillar(setup: SetupState, pillar: Pillar): string {
  const profile = setup.pillars.find((item) => normalize(item.name) === normalize(pillar.name))?.domainProfile;
  const goal = profile?.goals?.[0];
  const level = profile?.currentLevel;

  return [goal, level ? `Current level: ${level}` : undefined].filter(Boolean).join(" / ") || pillar.description;
}

function resourceNamesFromSetup(setup: SetupState): string[] {
  return unique([
    ...setup.routines?.flatMap((routine) => routine.resources ?? []) ?? [],
    ...setup.programs?.flatMap((program) => [...program.resources ?? [], ...program.equipment ?? []]) ?? []
  ]);
}

function sessionCountFromCadence(cadence: string, fallback?: number): number {
  const normalized = normalize(cadence);
  const range = normalized.match(/(\d+)\s+(\d+)/);
  if (range) return Math.max(Number(range[1]), Number(range[2]));

  const single = normalized.match(/\d+/);
  if (single) return Number(single[0]);

  if (normalized.includes("daily")) return 7;
  if (normalized.includes("weekly")) return 1;
  return Math.max(1, fallback ?? 1);
}

function defaultMomentumSessionsForPillar(pillarName: string): number {
  const name = normalize(pillarName);
  if (name === "porthos") return 7;
  if (name === "lifting") return 4;
  if (name === "bjj") return 2;
  if (name === "music") return 2;
  return 1;
}

function defaultDurationForPillar(pillarName: string): number {
  const name = normalize(pillarName);
  if (name === "porthos") return 30;
  if (name === "lifting") return 60;
  if (name === "bjj") return 90;
  if (name === "music") return 90;
  return 45;
}

function cognitiveLoadForPillar(pillarName: string) {
  const name = normalize(pillarName);
  if (name === "music") return "high" as const;
  if (name === "porthos") return "medium" as const;
  return "medium" as const;
}

function physicalLoadForPillar(pillarName: string) {
  const name = normalize(pillarName);
  if (name === "bjj" || name === "lifting") return "high" as const;
  return "low" as const;
}

function conceptsForHistory(history: string, concepts: string[]): string[] {
  const normalizedHistory = normalize(history);
  const matches = concepts.filter((concept) => normalizedHistory.includes(normalize(concept)));
  return matches.length > 0 ? matches : concepts.slice(0, 1);
}

function setupHistoryDate(index: number): string {
  const day = 25 - index;
  return `2026-06-${day.toString().padStart(2, "0")}`;
}

function durationMinutes(start: string, end: string): number {
  const [startHour = "0", startMinute = "0"] = start.split(":");
  const [endHour = "0", endMinute = "0"] = end.split(":");
  return Math.max(0, Number(endHour) * 60 + Number(endMinute) - Number(startHour) * 60 - Number(startMinute));
}

function latestDate(current: string | undefined, next: string | undefined): string | undefined {
  if (!current) return next;
  if (!next) return current;
  return next > current ? next : current;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/^pillar-/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
