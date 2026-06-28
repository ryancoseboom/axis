import type {
  ConceptRelationship,
  DevelopmentSignal,
  KnowledgeEdge,
  KnowledgeMap,
  KnowledgeNode,
  KnowledgeNodeStatus,
  KnowledgeState,
  Pillar,
  PillarMemory,
  PracticeEntry
} from "./types";

export type KnowledgeQueryResult = {
  node: KnowledgeNode;
  relationship?: KnowledgeEdge;
};

const REVIEW_DELAY_DAYS = 2;
const NEGLECTED_AFTER_DAYS = 14;

const NEXT_RELATIONSHIPS: ConceptRelationship[] = ["follow_up", "prerequisite"];
const RELATED_RELATIONSHIPS: ConceptRelationship[] = [
  "related_to",
  "reinforces",
  "reviews",
  "part_of",
  "alternative_to",
  "follow_up",
  "contrasts_with"
];

export function relatedConcepts(knowledgeMap: KnowledgeMap, nodeId: string): KnowledgeQueryResult[] {
  return connectedConcepts(knowledgeMap, nodeId, RELATED_RELATIONSHIPS);
}

export function nextConcepts(knowledgeMap: KnowledgeMap, nodeId: string): KnowledgeQueryResult[] {
  return connectedConcepts(knowledgeMap, nodeId, NEXT_RELATIONSHIPS);
}

export function prerequisiteConcepts(knowledgeMap: KnowledgeMap, nodeId: string): KnowledgeQueryResult[] {
  return knowledgeMap.edges
    .filter((edge) => edge.type === "prerequisite" && edge.toNodeId === nodeId)
    .map((edge) => resultFor(knowledgeMap, edge.fromNodeId, edge))
    .filter((item): item is KnowledgeQueryResult => Boolean(item));
}

export function reviewConcepts(knowledgeMap: KnowledgeMap, states: KnowledgeState[], today: string): KnowledgeNode[] {
  const nodesById = new Map(knowledgeMap.nodes.map((node) => [node.id, node]));

  return states
    .filter((state) => nodesById.has(state.nodeId))
    .filter((state) => state.status === "needs_review" || Boolean(state.reviewAfterDate && today >= state.reviewAfterDate))
    .map((state) => nodesById.get(state.nodeId))
    .filter((node): node is KnowledgeNode => Boolean(node));
}

export function neglectedConcepts(knowledgeMap: KnowledgeMap, states: KnowledgeState[], today: string): KnowledgeNode[] {
  const statesByNode = new Map(states.map((state) => [state.nodeId, state]));

  return knowledgeMap.nodes.filter((node) => {
    const state = statesByNode.get(node.id);
    if (!state) return true;
    if (!state.lastPracticedDate) return state.status === "never_seen" || state.status === "introduced";
    return daysBetween(state.lastPracticedDate, today) > NEGLECTED_AFTER_DAYS;
  });
}

export function applyPracticeEntryToKnowledgeState(memory: PillarMemory, entry: PracticeEntry): KnowledgeState[] {
  const pillar = memory.pillars.find((item) => item.id === entry.pillarId);
  if (!pillar) return memory.knowledgeStates ?? [];

  const knowledgeMap = pillar.knowledgeMap;
  const statesByNode = new Map((memory.knowledgeStates ?? []).map((state) => [state.nodeId, state]));
  const practicedNodes = nodesForPracticeEntry(knowledgeMap, entry);

  for (const node of practicedNodes) {
    statesByNode.set(node.id, nextState(statesByNode.get(node.id), node.id, "practiced", entry.date, entry.id, addDays(entry.date, REVIEW_DELAY_DAYS)));

    for (const edge of knowledgeMap.edges.filter((item) => item.fromNodeId === node.id)) {
      const relatedStatus = statusForRelationship(edge.type);
      const existing = statesByNode.get(edge.toNodeId);
      statesByNode.set(edge.toNodeId, nextState(existing, edge.toNodeId, relatedStatus, entry.date, entry.id, reviewDateForRelationship(edge, entry.date)));
    }
  }

  return [...statesByNode.values()].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
}

export function generateKnowledgeDevelopmentSignals(memory: PillarMemory, today: string): DevelopmentSignal[] {
  const states = memory.knowledgeStates ?? [];
  const recentEntries = [...memory.practiceEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const signals: DevelopmentSignal[] = [];

  for (const pillar of memory.pillars.filter((item) => item.status === "active")) {
    const knowledgeMap = pillar.knowledgeMap;
    const hasKnowledgeEvidence = states.some((state) => knowledgeMap.nodes.some((node) => node.id === state.nodeId));
    const pillarEntries = recentEntries.filter((item) => item.pillarId === pillar.id);

    for (const entry of pillarEntries) {
      for (const node of nodesForPracticeEntry(knowledgeMap, entry)) {
        signals.push(...relatedConceptSignals(pillar, knowledgeMap, node, entry));
        signals.push(...nextConceptSignals(pillar, knowledgeMap, node, entry));
      }
    }

    signals.push(...reviewConceptSignals(pillar, knowledgeMap, states, today));
    if (hasKnowledgeEvidence || pillarEntries.length > 0) {
      signals.push(...neglectedConceptSignals(pillar, knowledgeMap, states, today));
    }
  }

  return uniqueSignals(signals).sort((a, b) => b.priority - a.priority);
}

export function nodesForPracticeEntry(knowledgeMap: KnowledgeMap, entry: PracticeEntry): KnowledgeNode[] {
  const topicIds = new Set(entry.topics);

  return knowledgeMap.nodes.filter((node) => {
    const sourceTopicIds = node.concept.sourceTopicIds ?? [];
    const aliases = [node.concept.name, ...(node.concept.aliases ?? [])].map(normalize);
    return sourceTopicIds.some((topicId) => topicIds.has(topicId)) || entry.topics.some((topic) => aliases.includes(normalize(topic)));
  });
}

function connectedConcepts(knowledgeMap: KnowledgeMap, nodeId: string, types: ConceptRelationship[]): KnowledgeQueryResult[] {
  const results = knowledgeMap.edges
    .filter((edge) => edge.fromNodeId === nodeId && types.includes(edge.type))
    .map((edge) => resultFor(knowledgeMap, edge.toNodeId, edge))
    .filter((item): item is KnowledgeQueryResult => Boolean(item));

  return uniqueByNode(results);
}

function resultFor(knowledgeMap: KnowledgeMap, nodeId: string, relationship: KnowledgeEdge): KnowledgeQueryResult | undefined {
  const node = knowledgeMap.nodes.find((item) => item.id === nodeId);
  return node ? { node, relationship } : undefined;
}

function relatedConceptSignals(pillar: Pillar, knowledgeMap: KnowledgeMap, node: KnowledgeNode, entry: PracticeEntry): DevelopmentSignal[] {
  return relatedConcepts(knowledgeMap, node.id)
    .filter((item) => item.relationship?.type !== "reviews")
    .slice(0, 2)
    .map((item) => ({
      id: `signal-knowledge-related-${entry.id}-${item.node.id}`,
      type: item.relationship?.type === "reinforces" ? "deepen_topic" : "related_technique",
      pillarId: pillar.id,
      title: item.relationship?.type === "reinforces" ? `Deepen ${item.node.concept.name}` : `Train ${item.node.concept.name}`,
      description: item.relationship?.description ?? `${item.node.concept.name} is related to ${node.concept.name}.`,
      topicIds: [node.id, item.node.id],
      priority: pillar.priority,
      sourceEntryId: entry.id,
      protects: pillar.name
    }));
}

function nextConceptSignals(pillar: Pillar, knowledgeMap: KnowledgeMap, node: KnowledgeNode, entry: PracticeEntry): DevelopmentSignal[] {
  return nextConcepts(knowledgeMap, node.id).slice(0, 1).map((item) => ({
    id: `signal-knowledge-next-${entry.id}-${item.node.id}`,
    type: "continue_thread",
    pillarId: pillar.id,
    title: `Next: ${item.node.concept.name}`,
    description: item.relationship?.description ?? `${item.node.concept.name} follows ${node.concept.name}.`,
    topicIds: [node.id, item.node.id],
    priority: pillar.priority + 1,
    sourceEntryId: entry.id,
    protects: pillar.name
  }));
}

function reviewConceptSignals(pillar: Pillar, knowledgeMap: KnowledgeMap, states: KnowledgeState[], today: string): DevelopmentSignal[] {
  return reviewConcepts(knowledgeMap, states, today).map((node) => {
    const state = states.find((item) => item.nodeId === node.id);
    const overdue = Boolean(state?.reviewAfterDate && today > state.reviewAfterDate);

    return {
      id: `${overdue ? "signal-knowledge-overdue" : "signal-knowledge-review"}-${pillar.id}-${node.id}`,
      type: overdue ? "overdue_review" : "review",
      pillarId: pillar.id,
      title: overdue ? `Review overdue ${node.concept.name}` : `Review ${node.concept.name}`,
      description: overdue ? `${node.concept.name} is past its Knowledge Map review window.` : `${node.concept.name} is ready for a Knowledge Map review.`,
      topicIds: [node.id],
      priority: overdue ? pillar.priority + 3 : pillar.priority,
      dueDate: state?.reviewAfterDate,
      sourceEntryId: state?.lastSourceEntryId,
      protects: pillar.name
    } satisfies DevelopmentSignal;
  });
}

function neglectedConceptSignals(pillar: Pillar, knowledgeMap: KnowledgeMap, states: KnowledgeState[], today: string): DevelopmentSignal[] {
  return neglectedConcepts(knowledgeMap, states, today)
    .slice(0, 2)
    .map((node) => ({
      id: `signal-knowledge-neglected-${pillar.id}-${node.id}`,
      type: "deepen_topic" as const,
      pillarId: pillar.id,
      title: `Revisit ${node.concept.name}`,
      description: `${node.concept.name} has little recent Knowledge Map evidence.`,
      topicIds: [node.id],
      priority: Math.max(3, pillar.priority - 3),
      protects: pillar.name
    }));
}

function nextState(
  existing: KnowledgeState | undefined,
  nodeId: string,
  status: KnowledgeNodeStatus,
  date: string,
  sourceEntryId: string,
  reviewAfterDate?: string
): KnowledgeState {
  return {
    ...existing,
    nodeId,
    status: strongestStatus(existing?.status, status),
    introducedDate: existing?.introducedDate ?? date,
    lastPracticedDate: status === "practiced" ? latestDate(existing?.lastPracticedDate, date) : existing?.lastPracticedDate,
    reviewAfterDate: latestDate(existing?.reviewAfterDate, reviewAfterDate),
    lastSourceEntryId: sourceEntryId
  };
}

function statusForRelationship(type: ConceptRelationship): KnowledgeNodeStatus {
  if (type === "reinforces" || type === "reviews") return "developing";
  return "introduced";
}

function reviewDateForRelationship(edge: KnowledgeEdge, date: string): string | undefined {
  return edge.type === "reviews" || edge.type === "reinforces" ? addDays(date, REVIEW_DELAY_DAYS) : undefined;
}

function strongestStatus(current: KnowledgeNodeStatus | undefined, next: KnowledgeNodeStatus): KnowledgeNodeStatus {
  const rank: Record<KnowledgeNodeStatus, number> = {
    never_seen: 0,
    introduced: 1,
    developing: 2,
    needs_review: 3,
    practiced: 4,
    confident: 5
  };

  if (!current) return next;
  return rank[next] >= rank[current] ? next : current;
}

function uniqueByNode(results: KnowledgeQueryResult[]): KnowledgeQueryResult[] {
  const seen = new Set<string>();
  return results.filter((item) => {
    if (seen.has(item.node.id)) return false;
    seen.add(item.node.id);
    return true;
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

function latestDate(current: string | undefined, next: string | undefined): string | undefined {
  if (!current) return next;
  if (!next) return current;
  return next > current ? next : current;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
