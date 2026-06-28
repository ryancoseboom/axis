import { applyPracticeEntryToKnowledgeState, createKnowledgeMap, generateKnowledgeDevelopmentSignals } from "./knowledgeMaps";
import { generateProgramDevelopmentSignals } from "./programs";
import type {
  DevelopmentSignal,
  KnowledgeMap,
  KnowledgeState,
  Pillar,
  PillarMemory,
  PracticeEntry,
  PracticeIntensity,
  PracticeSource,
  ReviewSchedule
} from "./types";

export type PracticeEntryInput = {
  pillarId: string;
  date: string;
  title: string;
  notes?: string;
  topics: string[];
  intensity?: PracticeIntensity;
  confidence?: number;
  familiarity?: number;
  source?: PracticeSource;
};

export const samplePillars: Pillar[] = [
  {
    id: "pillar-bjj",
    name: "BJJ",
    description: "Develop skill, composure, and technical depth in Brazilian jiu-jitsu.",
    priority: 8,
    identityWeight: 8,
    status: "active",
    knowledgeMap: bjjKnowledgeMap()
  },
  pillar("pillar-axis", "Axis", "Build the reasoning engine and product philosophy.", 10, axisKnowledgeMap()),
  pillar("pillar-music", "Music", "Write, record, and deepen musical craft.", 8, musicKnowledgeMap()),
  pillar("pillar-health", "Health", "Protect vitality, strength, and recovery.", 7, healthKnowledgeMap()),
  pillar("pillar-porthos", "Porthos", "Care, relationship, and daily steadiness with Porthos.", 7)
];

export const samplePracticeEntries: PracticeEntry[] = [
  recordPracticeEntry({
    pillarId: "pillar-bjj",
    date: "2026-06-25",
    title: "Trained arm bars from closed guard.",
    notes: "Focused on posture break, hip angle, and finishing mechanics.",
    topics: ["topic-arm-bar", "topic-closed-guard"],
    intensity: "medium",
    confidence: 6,
    familiarity: 5
  })
];

export function recordPracticeEntry(input: PracticeEntryInput, existingEntries: PracticeEntry[] = []): PracticeEntry {
  return {
    id: `practice-${slug(input.pillarId)}-${slug(input.date)}-${existingEntries.length + 1}`,
    pillarId: input.pillarId,
    date: input.date,
    title: input.title.trim(),
    notes: input.notes?.trim() ?? "",
    topics: input.topics,
    intensity: input.intensity ?? "medium",
    confidence: input.confidence ?? 5,
    familiarity: input.familiarity ?? 5,
    source: input.source ?? "manual"
  };
}

export function recordPracticeEntryInMemory(memory: PillarMemory, input: PracticeEntryInput): PillarMemory {
  const entry = recordPracticeEntry(input, memory.practiceEntries);
  const memoryWithEntry: PillarMemory = {
    ...memory,
    practiceEntries: [...memory.practiceEntries, entry]
  };

  return {
    ...memoryWithEntry,
    knowledgeStates: applyPracticeEntryToKnowledgeState(memoryWithEntry, entry)
  };
}

export function generateDevelopmentSignals(memory: PillarMemory, today: string): DevelopmentSignal[] {
  const signals: DevelopmentSignal[] = [];
  const entries = [...memory.practiceEntries].sort((a, b) => b.date.localeCompare(a.date));
  const chronologicalEntries = [...memory.practiceEntries].sort((a, b) => a.date.localeCompare(b.date));
  const memoryWithKnowledge = {
    ...memory,
    knowledgeStates: memory.knowledgeStates ?? chronologicalEntries.reduce<KnowledgeState[]>((states, entry) => applyPracticeEntryToKnowledgeState({ ...memory, knowledgeStates: states }, entry), [])
  };

  signals.push(...neglectedPillarSignals(memory.pillars, entries, today));
  signals.push(...generateKnowledgeDevelopmentSignals(memoryWithKnowledge, today));
  signals.push(...generateProgramDevelopmentSignals(memory, today));

  return uniqueSignals(signals).sort((a, b) => b.priority - a.priority);
}

export function buildReviewSchedule(entry: PracticeEntry, today: string): ReviewSchedule[] {
  return entry.topics.map((topicId) => {
    const firstReviewDate = addDays(entry.date, 2);
    const secondReviewDate = addDays(entry.date, 14);
    return {
      entryId: entry.id,
      topicId,
      firstReviewDate,
      secondReviewDate,
      overdue: today > firstReviewDate
    };
  });
}

function neglectedPillarSignals(pillars: Pillar[], entries: PracticeEntry[], today: string): DevelopmentSignal[] {
  return pillars
    .filter((pillarItem) => pillarItem.status === "active")
    .filter((pillarItem) => !entries.some((entry) => entry.pillarId === pillarItem.id && daysBetween(entry.date, today) <= 7))
    .map((pillarItem) => ({
      id: `signal-neglected-${pillarItem.id}`,
      type: "balance_neglected_pillar" as const,
      pillarId: pillarItem.id,
      title: `Return to ${pillarItem.name}`,
      description: `${pillarItem.name} has not appeared in recent practice history.`,
      topicIds: [],
      priority: Math.max(4, pillarItem.priority - 2),
      protects: pillarItem.name
    }));
}

function pillar(id: string, name: string, description: string, priority: number, map = emptyKnowledgeMap(id, name)): Pillar {
  return { id, name, description, priority, identityWeight: priority, status: "active", knowledgeMap: map };
}

function emptyKnowledgeMap(pillarId: string, name: string): KnowledgeMap {
  return createKnowledgeMap({ pillarId, name: `${name} Knowledge Map`, concepts: [] });
}

function bjjKnowledgeMap(): KnowledgeMap {
  return createKnowledgeMap({
    pillarId: "pillar-bjj",
    name: "BJJ Knowledge Map",
    concepts: [
      { name: "Closed Guard", description: "Control position for posture breaking, attacks, and transitions.", sourceTopicIds: ["topic-closed-guard"] },
      { name: "Arm Bar", description: "Arm isolation and finishing mechanics.", sourceTopicIds: ["topic-arm-bar"] },
      { name: "Triangle", description: "Leg-based choke connected to guard attacks.", sourceTopicIds: ["topic-triangle-choke"], aliases: ["Triangle Choke"] },
      { name: "Omoplata", description: "Shoulder lock and sweeping threat from guard.", sourceTopicIds: ["topic-omoplata"] },
      { name: "Guard Retention", description: "Frames, hip movement, and recovery under passing pressure.", sourceTopicIds: ["topic-guard-retention"] },
      { name: "Back Takes", description: "Routes to back control and finishing positions.", sourceTopicIds: ["topic-back-takes"] }
    ],
    relationships: [
      ["Closed Guard", "prerequisite", "Arm Bar", "Closed Guard creates reliable Arm Bar entries."],
      ["Arm Bar", "related_to", "Triangle", "Arm Bar and Triangle share posture-breaking mechanics."],
      ["Arm Bar", "alternative_to", "Omoplata", "Omoplata follows common Arm Bar defenses."],
      ["Arm Bar", "reinforces", "Closed Guard", "Arm Bar practice reinforces Closed Guard control."],
      ["Arm Bar", "reviews", "Arm Bar", "Arm Bar finishing mechanics should be revisited after practice."],
      ["Guard Retention", "follow_up", "Back Takes", "Retaining guard creates chances to recover angle and attack the back."]
    ]
  });
}

function axisKnowledgeMap(): KnowledgeMap {
  return createKnowledgeMap({
    pillarId: "pillar-axis",
    name: "Axis Knowledge Map",
    concepts: [
      { name: "Decision Graph", description: "The deterministic graph that turns facts into explainable decisions.", aliases: ["decision graph"] },
      { name: "Explainability", description: "Clear reasons and paths for every selected output.", aliases: ["explainability"] },
      { name: "Confidence", description: "Calibrated trust in a generated plan.", aliases: ["confidence"] },
      { name: "Calendar", description: "Provider-agnostic time and commitment context.", aliases: ["calendar"] },
      { name: "Identity", description: "The values and priorities protected by Axis.", aliases: ["identity"] }
    ],
    relationships: [
      ["Decision Graph", "part_of", "Explainability", "Explainability exposes why the Decision Graph chose an output."],
      ["Confidence", "reinforces", "Explainability", "Confidence becomes more useful when the explanation is visible."],
      ["Calendar", "reinforces", "Decision Graph", "Calendar facts improve Decision Graph context fit."],
      ["Identity", "prerequisite", "Decision Graph", "Identity gives the Decision Graph something to protect."]
    ]
  });
}

function musicKnowledgeMap(): KnowledgeMap {
  return createKnowledgeMap({
    pillarId: "pillar-music",
    name: "Music Knowledge Map",
    concepts: [
      "Songwriting",
      "Recording",
      "Practice",
      "Arrangement"
    ],
    relationships: [
      ["Songwriting", "follow_up", "Arrangement"],
      ["Arrangement", "follow_up", "Recording"],
      ["Practice", "reinforces", "Recording"]
    ]
  });
}

function healthKnowledgeMap(): KnowledgeMap {
  return createKnowledgeMap({
    pillarId: "pillar-health",
    name: "Weightlifting Knowledge Map",
    concepts: [
      { name: "Pull", description: "Pulling patterns for back and arm development.", sourceTopicIds: ["program-day-pull-biceps", "program-day-pull-back"], aliases: ["pull"] },
      { name: "Push", description: "Pressing patterns for chest and shoulder development.", sourceTopicIds: ["program-day-push-chest", "program-day-push-shoulders"], aliases: ["push"] },
      { name: "Chest", description: "Chest-focused pressing and fly work.", sourceTopicIds: ["program-day-push-chest"], aliases: ["chest"] },
      { name: "Back", description: "Back-focused rowing and pulldown work.", sourceTopicIds: ["program-day-pull-back"], aliases: ["back"] },
      { name: "Biceps", description: "Curling and elbow-flexion strength.", sourceTopicIds: ["program-day-pull-biceps"], aliases: ["biceps"] },
      { name: "Squat", description: "Knee-dominant lower-body strength.", sourceTopicIds: ["program-day-legs"], aliases: ["squat", "smith squat"] },
      { name: "Cable Row", description: "Horizontal pull for mid-back and lat development.", sourceTopicIds: ["movement-seated-cable-row"], aliases: ["seated cable row", "cable row"] }
    ],
    relationships: [
      ["Pull", "part_of", "Biceps", "Biceps work is part of the Pull pattern."],
      ["Pull", "part_of", "Back", "Back work is part of the Pull pattern."],
      ["Back", "follow_up", "Cable Row", "Cable Row is a concrete follow-up for Back development."],
      ["Push", "part_of", "Chest", "Chest work is part of the Push pattern."],
      ["Squat", "contrasts_with", "Push", "Squat and Push stress different movement patterns."]
    ]
  });
}

function uniqueSignals(signals: DevelopmentSignal[]): DevelopmentSignal[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    if (seen.has(signal.id)) return false;
    seen.add(signal.id);
    return true;
  });
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  return Math.floor((endMs - startMs) / 86400000);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
