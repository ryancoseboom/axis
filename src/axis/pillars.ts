import { applyPracticeEntryToKnowledgeState, generateKnowledgeDevelopmentSignals } from "./knowledgeMaps";
import { generateProgramDevelopmentSignals } from "./programs";
import type {
  DevelopmentSignal,
  KnowledgeEdge,
  KnowledgeMap,
  KnowledgeNode,
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
    knowledgeMap: knowledgeMap("knowledge-map-bjj", "pillar-bjj", "BJJ Knowledge Map", [
      knowledgeNode("knowledge-bjj-closed-guard", "pillar-bjj", "Closed Guard", "Control position for posture breaking, attacks, and transitions.", ["topic-closed-guard"]),
      knowledgeNode("knowledge-bjj-arm-bar", "pillar-bjj", "Arm Bar", "Arm isolation and finishing mechanics.", ["topic-arm-bar"]),
      knowledgeNode("knowledge-bjj-triangle", "pillar-bjj", "Triangle", "Leg-based choke connected to guard attacks.", ["topic-triangle-choke"]),
      knowledgeNode("knowledge-bjj-omoplata", "pillar-bjj", "Omoplata", "Shoulder lock and sweeping threat from guard.", ["topic-omoplata"]),
      knowledgeNode("knowledge-bjj-guard-retention", "pillar-bjj", "Guard Retention", "Frames, hip movement, and recovery under passing pressure.", ["topic-guard-retention"]),
      knowledgeNode("knowledge-bjj-back-takes", "pillar-bjj", "Back Takes", "Routes to back control and finishing positions.", ["topic-back-takes"])
    ], [
      knowledgeEdge("knowledge-rel-closed-guard-arm-bar", "knowledge-bjj-closed-guard", "knowledge-bjj-arm-bar", "prerequisite", "Closed Guard creates reliable Arm Bar entries."),
      knowledgeEdge("knowledge-rel-arm-bar-triangle", "knowledge-bjj-arm-bar", "knowledge-bjj-triangle", "related_to", "Arm Bar and Triangle share posture-breaking mechanics."),
      knowledgeEdge("knowledge-rel-arm-bar-omoplata", "knowledge-bjj-arm-bar", "knowledge-bjj-omoplata", "alternative_to", "Omoplata follows common Arm Bar defenses."),
      knowledgeEdge("knowledge-rel-arm-bar-closed-guard", "knowledge-bjj-arm-bar", "knowledge-bjj-closed-guard", "reinforces", "Arm Bar practice reinforces Closed Guard control."),
      knowledgeEdge("knowledge-rel-arm-bar-review", "knowledge-bjj-arm-bar", "knowledge-bjj-arm-bar", "reviews", "Arm Bar finishing mechanics should be revisited after practice."),
      knowledgeEdge("knowledge-rel-guard-retention-back-takes", "knowledge-bjj-guard-retention", "knowledge-bjj-back-takes", "follow_up", "Retaining guard creates chances to recover angle and attack the back.")
    ])
  },
  pillar("pillar-axis", "Axis", "Build the reasoning engine and product philosophy.", 10, axisKnowledgeMap()),
  pillar("pillar-music", "Music", "Write, record, and deepen musical craft.", 8),
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

function knowledgeMap(id: string, pillarId: string, name: string, nodes: KnowledgeNode[], edges: KnowledgeEdge[]): KnowledgeMap {
  return { id, pillarId, name, nodes, edges };
}

function knowledgeNode(id: string, pillarId: string, name: string, description: string, sourceTopicIds: string[] = [], aliases: string[] = []): KnowledgeNode {
  return { id, pillarId, concept: { id: `concept-${id}`, name, description, sourceTopicIds, aliases } };
}

function knowledgeEdge(id: string, fromNodeId: string, toNodeId: string, type: KnowledgeEdge["type"], description: string): KnowledgeEdge {
  return { id, fromNodeId, toNodeId, type, description };
}

function emptyKnowledgeMap(pillarId: string, name: string): KnowledgeMap {
  return knowledgeMap(`knowledge-map-${slug(pillarId)}`, pillarId, `${name} Knowledge Map`, [], []);
}

function axisKnowledgeMap(): KnowledgeMap {
  return knowledgeMap("knowledge-map-axis", "pillar-axis", "Axis Knowledge Map", [
    knowledgeNode("knowledge-axis-decision-graph", "pillar-axis", "Decision Graph", "The deterministic graph that turns facts into explainable decisions.", [], ["decision graph"]),
    knowledgeNode("knowledge-axis-explainability", "pillar-axis", "Explainability", "Clear reasons and paths for every selected output.", [], ["explainability"]),
    knowledgeNode("knowledge-axis-confidence", "pillar-axis", "Confidence", "Calibrated trust in a generated plan.", [], ["confidence"]),
    knowledgeNode("knowledge-axis-calendar", "pillar-axis", "Calendar", "Provider-agnostic time and commitment context.", [], ["calendar"]),
    knowledgeNode("knowledge-axis-identity", "pillar-axis", "Identity", "The values and priorities protected by Axis.", [], ["identity"])
  ], [
    knowledgeEdge("knowledge-rel-decision-graph-explainability", "knowledge-axis-decision-graph", "knowledge-axis-explainability", "part_of", "Explainability exposes why the Decision Graph chose an output."),
    knowledgeEdge("knowledge-rel-confidence-explainability", "knowledge-axis-confidence", "knowledge-axis-explainability", "reinforces", "Confidence becomes more useful when the explanation is visible."),
    knowledgeEdge("knowledge-rel-calendar-decision-graph", "knowledge-axis-calendar", "knowledge-axis-decision-graph", "reinforces", "Calendar facts improve Decision Graph context fit."),
    knowledgeEdge("knowledge-rel-identity-decision-graph", "knowledge-axis-identity", "knowledge-axis-decision-graph", "prerequisite", "Identity gives the Decision Graph something to protect.")
  ]);
}

function healthKnowledgeMap(): KnowledgeMap {
  return knowledgeMap("knowledge-map-health", "pillar-health", "Weightlifting Knowledge Map", [
    knowledgeNode("knowledge-lift-pull", "pillar-health", "Pull", "Pulling patterns for back and arm development.", ["program-day-pull-biceps", "program-day-pull-back"], ["pull"]),
    knowledgeNode("knowledge-lift-push", "pillar-health", "Push", "Pressing patterns for chest and shoulder development.", ["program-day-push-chest", "program-day-push-shoulders"], ["push"]),
    knowledgeNode("knowledge-lift-chest", "pillar-health", "Chest", "Chest-focused pressing and fly work.", ["program-day-push-chest"], ["chest"]),
    knowledgeNode("knowledge-lift-back", "pillar-health", "Back", "Back-focused rowing and pulldown work.", ["program-day-pull-back"], ["back"]),
    knowledgeNode("knowledge-lift-biceps", "pillar-health", "Biceps", "Curling and elbow-flexion strength.", ["program-day-pull-biceps"], ["biceps"]),
    knowledgeNode("knowledge-lift-squat", "pillar-health", "Squat", "Knee-dominant lower-body strength.", ["program-day-legs"], ["squat", "smith squat"]),
    knowledgeNode("knowledge-lift-cable-row", "pillar-health", "Cable Row", "Horizontal pull for mid-back and lat development.", ["movement-seated-cable-row"], ["seated cable row", "cable row"])
  ], [
    knowledgeEdge("knowledge-rel-pull-biceps", "knowledge-lift-pull", "knowledge-lift-biceps", "part_of", "Biceps work is part of the Pull pattern."),
    knowledgeEdge("knowledge-rel-pull-back", "knowledge-lift-pull", "knowledge-lift-back", "part_of", "Back work is part of the Pull pattern."),
    knowledgeEdge("knowledge-rel-back-cable-row", "knowledge-lift-back", "knowledge-lift-cable-row", "follow_up", "Cable Row is a concrete follow-up for Back development."),
    knowledgeEdge("knowledge-rel-push-chest", "knowledge-lift-push", "knowledge-lift-chest", "part_of", "Chest work is part of the Push pattern."),
    knowledgeEdge("knowledge-rel-squat-push", "knowledge-lift-squat", "knowledge-lift-push", "contrasts_with", "Squat and Push stress different movement patterns.")
  ]);
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
