import type {
  CompletedProgramSession,
  DevelopmentSignal,
  MovementOption,
  PillarMemory,
  PracticeEntry,
  PracticeIntensity,
  Program,
  ProgramDay
} from "./types";

export type ProgramRecommendationOptions = {
  availableEquipment: string[];
  activeCautionTags?: string[];
};

export type ProgramProgression = {
  currentDay: ProgramDay;
  nextDay: ProgramDay;
};

export type ProgramSessionInput = {
  programId: string;
  programDayId: string;
  date: string;
  movementsCompleted?: string[];
  setsCompleted?: number;
  notes?: string;
  perceivedEffort?: PracticeIntensity;
};

export type CompleteProgramSessionResult = {
  memory: PillarMemory;
  session: CompletedProgramSession;
  practiceEntry: PracticeEntry;
  developmentSignals: DevelopmentSignal[];
  progression: ProgramProgression;
};

const DEFAULT_EQUIPMENT = ["dumbbells", "cable machine", "Smith machine", "barbell", "plates"];
const DEFAULT_CAUTION_TAGS = ["hammer-curl", "elbow-irritation"];

export const sampleWeightliftingProgram: Program = {
  id: "program-health-weightlifting-5-day",
  pillarId: "pillar-health",
  name: "5-day weightlifting cycle",
  description: "Repeating development cycle for strength and muscular balance.",
  cycleType: "repeating",
  status: "active",
  days: [
    programDay("program-day-pull-biceps", "Pull - biceps", "biceps", 0, [
      movement("movement-cable-curl", "cable curl", "curl", "biceps", ["forearms"], ["cable machine"], [], ["biceps", "pull"]),
      movement("movement-incline-db-curl", "incline dumbbell curl", "curl", "biceps", ["forearms"], ["dumbbells"], [], ["biceps", "pull"]),
      movement("movement-preacher-curl", "preacher curl", "curl", "biceps", ["forearms"], ["dumbbells"], [], ["biceps", "pull"]),
      movement("movement-reverse-curl", "reverse curl", "curl", "forearms", ["biceps"], ["barbell", "plates"], ["Use caution if forearm or elbow irritation is active."], ["biceps", "pull", "elbow-irritation"]),
      movement("movement-hammer-curl", "hammer curl", "curl", "biceps", ["forearms"], ["dumbbells"], ["Known elbow/forearm irritation with hammer curls."], ["biceps", "pull", "hammer-curl", "elbow-irritation"])
    ]),
    programDay("program-day-push-chest", "Push - chest", "chest", 1, [
      movement("movement-db-bench", "dumbbell bench press", "press", "chest", ["triceps", "shoulders"], ["dumbbells"], [], ["chest", "push"]),
      movement("movement-cable-fly", "cable fly", "fly", "chest", ["shoulders"], ["cable machine"], [], ["chest", "push"]),
      movement("movement-incline-press", "incline press", "press", "upper chest", ["shoulders", "triceps"], ["dumbbells"], [], ["chest", "push"]),
      movement("movement-push-up", "push-up", "press", "chest", ["triceps", "core"], [], [], ["chest", "push"])
    ]),
    programDay("program-day-pull-back", "Pull - back", "back", 2, [
      movement("movement-lat-pulldown", "lat pulldown", "vertical pull", "lats", ["biceps"], ["cable machine"], [], ["back", "pull"]),
      movement("movement-seated-cable-row", "seated cable row", "horizontal pull", "mid back", ["lats", "biceps"], ["cable machine"], [], ["back", "pull"]),
      movement("movement-chest-supported-row", "chest-supported row", "horizontal pull", "upper back", ["lats"], ["dumbbells"], [], ["back", "pull"]),
      movement("movement-straight-arm-pulldown", "straight-arm pulldown", "pulldown", "lats", ["core"], ["cable machine"], [], ["back", "pull"])
    ]),
    programDay("program-day-push-shoulders", "Push - shoulders", "shoulders", 3, [
      movement("movement-db-shoulder-press", "dumbbell shoulder press", "press", "shoulders", ["triceps"], ["dumbbells"], [], ["shoulders", "push"]),
      movement("movement-lateral-raise", "lateral raise", "raise", "side delts", ["upper traps"], ["dumbbells", "cable machine"], [], ["shoulders", "push"]),
      movement("movement-rear-delt-fly", "rear delt fly", "fly", "rear delts", ["upper back"], ["dumbbells", "cable machine"], [], ["shoulders", "push"]),
      movement("movement-cable-face-pull", "cable face pull", "pull", "rear delts", ["upper back"], ["cable machine"], [], ["shoulders", "prehab"])
    ]),
    programDay("program-day-legs", "Legs", "legs", 4, [
      movement("movement-smith-squat", "Smith squat", "squat", "quads", ["glutes"], ["Smith machine", "plates"], [], ["legs"]),
      movement("movement-romanian-deadlift", "Romanian deadlift", "hinge", "hamstrings", ["glutes", "back"], ["barbell", "plates", "dumbbells"], [], ["legs", "hinge"]),
      movement("movement-leg-press", "leg press", "press", "quads", ["glutes"], ["plates"], [], ["legs"]),
      movement("movement-calf-raise", "calf raise", "raise", "calves", [], ["dumbbells", "Smith machine", "plates"], [], ["legs"])
    ])
  ]
};

export function getCurrentProgramDay(program: Program, completedSessions: CompletedProgramSession[]): ProgramProgression {
  const sorted = [...completedSessions]
    .filter((session) => session.programId === program.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastSession = sorted[0];

  if (!lastSession) {
    return { currentDay: program.days[0], nextDay: program.days[1] };
  }

  const lastDay = program.days.find((day) => day.id === lastSession.programDayId) ?? program.days[0];
  const currentIndex = (lastDay.sequenceIndex + 1) % program.days.length;
  const nextIndex = (currentIndex + 1) % program.days.length;

  return { currentDay: program.days[currentIndex], nextDay: program.days[nextIndex] };
}

export function recommendMovementsForProgramDay(
  day: ProgramDay,
  completedSessions: CompletedProgramSession[],
  options: ProgramRecommendationOptions
): MovementOption[] {
  const recentMovementIds = new Set(completedSessions.slice(-3).flatMap((session) => session.movementsCompleted));
  const cautionTags = new Set(options.activeCautionTags ?? DEFAULT_CAUTION_TAGS);
  const equipment = new Set(options.availableEquipment);
  const candidates = day.movementOptions.filter((movementOption) => hasRequiredEquipment(movementOption, equipment));
  const safer = candidates.filter((movementOption) => !movementOption.tags.some((tag) => cautionTags.has(tag)));
  const pool = safer.length >= day.prescription.movementCount ? safer : candidates;

  return [...pool]
    .sort((a, b) => movementRank(a, day, recentMovementIds, cautionTags) - movementRank(b, day, recentMovementIds, cautionTags))
    .slice(0, day.prescription.movementCount);
}

export function recordCompletedProgramSession(input: ProgramSessionInput, existingSessions: CompletedProgramSession[] = []): CompletedProgramSession {
  return {
    id: `program-session-${slug(input.programId)}-${slug(input.date)}-${existingSessions.length + 1}`,
    programId: input.programId,
    programDayId: input.programDayId,
    date: input.date,
    movementsCompleted: input.movementsCompleted ?? [],
    setsCompleted: input.setsCompleted ?? 0,
    notes: input.notes?.trim() ?? "",
    perceivedEffort: input.perceivedEffort
  };
}

export function completeProgramSession(memory: PillarMemory, input: ProgramSessionInput): CompleteProgramSessionResult {
  const program = memory.programs?.find((item) => item.id === input.programId);
  const programDay = program?.days.find((day) => day.id === input.programDayId);
  const existingSessions = memory.completedProgramSessions ?? [];
  const session = recordCompletedProgramSession(input, existingSessions);
  const completedProgramSessions = [...existingSessions, session];
  const practiceEntry = programSessionToPracticeEntry(session, program, programDay, memory.practiceEntries.length);
  const memoryWithCompletion: PillarMemory = {
    ...memory,
    practiceEntries: [...memory.practiceEntries, practiceEntry],
    completedProgramSessions
  };
  const developmentSignals = generateProgramDevelopmentSignals(memoryWithCompletion, input.date);
  const memoryWithSignals: PillarMemory = {
    ...memoryWithCompletion,
    developmentSignals: replaceProgramSignals(memory.developmentSignals ?? [], input.programId, developmentSignals)
  };

  return {
    memory: memoryWithSignals,
    session,
    practiceEntry,
    developmentSignals,
    progression: program ? getCurrentProgramDay(program, completedProgramSessions) : fallbackProgression()
  };
}

export function generateProgramDevelopmentSignals(
  memory: PillarMemory,
  today: string,
  options: ProgramRecommendationOptions = { availableEquipment: DEFAULT_EQUIPMENT }
): DevelopmentSignal[] {
  return (memory.programs ?? [])
    .filter((program) => program.status === "active")
    .map((program) => {
      const completed = memory.completedProgramSessions ?? [];
      const progression = getCurrentProgramDay(program, completed);
      const movements = recommendMovementsForProgramDay(progression.currentDay, completed, options);
      const prescription = progression.currentDay.prescription;

      return {
        id: `signal-program-${program.id}-${progression.currentDay.id}-${today}`,
        type: "continue_thread" as const,
        pillarId: program.pillarId,
        title: `Today's lift: ${progression.currentDay.name}, ${prescription.movementCount} movements, ${prescription.setsPerMovement} sets each`,
        description: `Continue ${program.name}: ${movements.map((movementOption) => movementOption.name).join(", ")}.`,
        topicIds: [],
        priority: 8,
        dueDate: today,
        protects: "Health"
      };
    });
}

function programDay(id: string, name: string, focus: string, sequenceIndex: number, movementOptions: MovementOption[]): ProgramDay {
  return {
    id,
    name,
    focus,
    sequenceIndex,
    prescription: {
      movementCount: 4,
      setsPerMovement: 3,
      repRange: "controlled working sets",
      notes: "Select movements that fit available equipment and current joint tolerance."
    },
    movementOptions
  };
}

function movement(
  id: string,
  name: string,
  movementPattern: string,
  primaryFocus: string,
  secondaryFocus: string[],
  equipment: string[],
  contraindications: string[],
  tags: string[]
): MovementOption {
  return { id, name, movementPattern, primaryFocus, secondaryFocus, equipment, contraindications, tags };
}

function programSessionToPracticeEntry(
  session: CompletedProgramSession,
  program: Program | undefined,
  programDay: ProgramDay | undefined,
  existingEntryCount: number
): PracticeEntry {
  const title = programDay ? `Completed ${programDay.name}.` : "Completed program session.";
  const movementText = session.movementsCompleted.length > 0 ? ` Movements: ${session.movementsCompleted.join(", ")}.` : "";
  const setsText = session.setsCompleted > 0 ? ` Sets completed: ${session.setsCompleted}.` : "";

  return {
    id: `practice-${slug(program?.pillarId ?? "program")}-${slug(session.date)}-${existingEntryCount + 1}`,
    pillarId: program?.pillarId ?? "pillar-health",
    date: session.date,
    title,
    notes: `${session.notes}${movementText}${setsText}`.trim(),
    topics: programDay ? [programDay.id] : [],
    intensity: session.perceivedEffort ?? "medium",
    confidence: session.movementsCompleted.length > 0 ? 7 : 5,
    familiarity: 5,
    source: "manual"
  };
}

function replaceProgramSignals(existingSignals: DevelopmentSignal[], programId: string, nextSignals: DevelopmentSignal[]): DevelopmentSignal[] {
  return [...existingSignals.filter((signal) => !signal.id.startsWith(`signal-program-${programId}-`)), ...nextSignals];
}

function fallbackProgression(): ProgramProgression {
  const currentDay = sampleWeightliftingProgram.days[0];
  const nextDay = sampleWeightliftingProgram.days[1] ?? currentDay;
  return { currentDay, nextDay };
}

function hasRequiredEquipment(movementOption: MovementOption, availableEquipment: Set<string>): boolean {
  return movementOption.equipment.length === 0 || movementOption.equipment.some((item) => availableEquipment.has(item));
}

function movementRank(movementOption: MovementOption, day: ProgramDay, recentMovementIds: Set<string>, cautionTags: Set<string>): number {
  let rank = 0;
  if (movementOption.primaryFocus !== day.focus && !movementOption.tags.includes(day.focus)) rank += 2;
  if (recentMovementIds.has(movementOption.id)) rank += 3;
  if (movementOption.tags.some((tag) => cautionTags.has(tag))) rank += 5;
  return rank;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
