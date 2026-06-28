import { generateProgramDevelopmentSignals } from "./programs";
import type {
  DevelopmentSignal,
  Pillar,
  PillarMemory,
  PracticeEntry,
  PracticeIntensity,
  PracticeSource,
  PracticeTopic,
  ReviewSchedule,
  SkillRelationship
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
    domains: [
      {
        id: "domain-bjj-grappling",
        pillarId: "pillar-bjj",
        name: "Grappling",
        description: "Submission grappling technique, positions, and transitions.",
        topics: [
          topic("topic-arm-bar", "domain-bjj-grappling", "arm bar", "Arm isolation and finishing mechanics."),
          topic("topic-triangle-choke", "domain-bjj-grappling", "triangle choke", "Leg-based choke from guard and transitional attacks."),
          topic("topic-omoplata", "domain-bjj-grappling", "omoplata", "Shoulder lock and sweeping threat from guard."),
          topic("topic-closed-guard", "domain-bjj-grappling", "closed guard", "Control position for breaking posture and attacking."),
          topic("topic-guard-retention", "domain-bjj-grappling", "guard retention", "Keeping frames and hip position under pressure."),
          topic("topic-back-takes", "domain-bjj-grappling", "back takes", "Routes to back control and finishing positions."),
          topic("topic-escapes", "domain-bjj-grappling", "escapes", "Defensive movement from bad positions.")
        ],
        relationships: [
          relationship("rel-armbar-triangle", "topic-arm-bar", "topic-triangle-choke", "related_to", "Arm bars and triangle chokes share guard entries and posture-breaking mechanics."),
          relationship("rel-armbar-omoplata", "topic-arm-bar", "topic-omoplata", "related_to", "Omoplatas pair naturally with arm bar defenses and shoulder exposure."),
          relationship("rel-closed-guard-armbar", "topic-closed-guard", "topic-arm-bar", "prerequisite_for", "Closed guard control creates reliable arm bar entries."),
          relationship("rel-armbar-closed-guard", "topic-arm-bar", "topic-closed-guard", "reinforces", "Arm bar practice reinforces closed guard attacks."),
          relationship("rel-armbar-finishing", "topic-arm-bar", "topic-arm-bar", "review_later", "Arm bar finishing mechanics should be revisited after initial training."),
          relationship("rel-guard-retention-escapes", "topic-guard-retention", "topic-escapes", "related_to", "Retention and escapes share defensive timing and frames.")
        ]
      }
    ]
  },
  pillar("pillar-axis", "Axis", "Build the reasoning engine and product philosophy.", 10),
  pillar("pillar-music", "Music", "Write, record, and deepen musical craft.", 8),
  pillar("pillar-health", "Health", "Protect vitality, strength, and recovery.", 7),
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

export function generateDevelopmentSignals(memory: PillarMemory, today: string): DevelopmentSignal[] {
  const signals: DevelopmentSignal[] = [];
  const entries = [...memory.practiceEntries].sort((a, b) => b.date.localeCompare(a.date));

  for (const entry of entries.slice(0, 8)) {
    signals.push(...relatedTechniqueSignals(memory.pillars, entry));
    signals.push(...reviewSignals(memory.pillars, entry, today));
  }

  signals.push(...neglectedPillarSignals(memory.pillars, entries, today));
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

function relatedTechniqueSignals(pillars: Pillar[], entry: PracticeEntry): DevelopmentSignal[] {
  const pillarItem = findPillar(pillars, entry.pillarId);
  if (!pillarItem) return [];

  return relationshipsFor(pillarItem, entry.topics)
    .filter((item) => item.type === "related_to" || item.type === "follow_up" || item.type === "reinforces")
    .filter((item) => !entry.topics.includes(item.toTopicId) || item.type === "reinforces")
    .slice(0, 2)
    .map((item) => {
      const target = findTopic(pillarItem, item.toTopicId);
      return {
        id: `signal-related-${entry.id}-${item.toTopicId}`,
        type: item.type === "reinforces" ? "deepen_topic" : "related_technique",
        pillarId: pillarItem.id,
        title: item.type === "reinforces" ? `Deepen ${target?.name ?? "the thread"}` : `Train ${target?.name ?? "a related topic"}`,
        description: item.description,
        topicIds: [item.fromTopicId, item.toTopicId],
        priority: pillarItem.priority + 1,
        sourceEntryId: entry.id,
        protects: pillarItem.name
      } satisfies DevelopmentSignal;
    });
}

function reviewSignals(pillars: Pillar[], entry: PracticeEntry, today: string): DevelopmentSignal[] {
  const pillarItem = findPillar(pillars, entry.pillarId);
  if (!pillarItem) return [];

  return buildReviewSchedule(entry, today)
    .filter((schedule) => today >= schedule.firstReviewDate)
    .map((schedule) => {
      const topicItem = findTopic(pillarItem, schedule.topicId);
      const overdue = today > schedule.secondReviewDate;
      return {
        id: `${overdue ? "signal-overdue" : "signal-review"}-${entry.id}-${schedule.topicId}`,
        type: overdue ? "overdue_review" : "review",
        pillarId: pillarItem.id,
        title: overdue ? `Review overdue ${topicItem?.name ?? "practice"}` : `Review ${topicItem?.name ?? "practice"}`,
        description: overdue ? "This topic is past its second review window." : "This topic is ready for a short retention review.",
        topicIds: [schedule.topicId],
        priority: overdue ? pillarItem.priority + 3 : pillarItem.priority,
        dueDate: overdue ? schedule.secondReviewDate : schedule.firstReviewDate,
        sourceEntryId: entry.id,
        protects: pillarItem.name
      } satisfies DevelopmentSignal;
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

function pillar(id: string, name: string, description: string, priority: number): Pillar {
  return { id, name, description, priority, identityWeight: priority, status: "active", domains: [] };
}

function topic(id: string, domainId: string, name: string, description: string): PracticeTopic {
  return { id, domainId, name, description };
}

function relationship(id: string, fromTopicId: string, toTopicId: string, type: SkillRelationship["type"], description: string): SkillRelationship {
  return { id, fromTopicId, toTopicId, type, description };
}

function relationshipsFor(pillarItem: Pillar, topicIds: string[]): SkillRelationship[] {
  return pillarItem.domains.flatMap((domain) => domain.relationships).filter((item) => topicIds.includes(item.fromTopicId));
}

function findPillar(pillars: Pillar[], pillarId: string): Pillar | undefined {
  return pillars.find((pillarItem) => pillarItem.id === pillarId);
}

function findTopic(pillarItem: Pillar, topicId: string): PracticeTopic | undefined {
  return pillarItem.domains.flatMap((domain) => domain.topics).find((topicItem) => topicItem.id === topicId);
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
