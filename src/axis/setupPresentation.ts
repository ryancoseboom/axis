import { buildUserContextFromSetup, type BuildUserContextFromSetupOptions, type SetupState } from "./setup";
import type { KnowledgeNodeStatus, Pillar, UserContext } from "./types";

export type KnowledgeStateSummaryGroup = {
  status: KnowledgeNodeStatus;
  label: string;
  concepts: string[];
  totalCount: number;
};

export type PillarKnowledgeReview = {
  pillarName: string;
  domainName: string;
  currentLevel?: string;
  credential?: string;
  groups: KnowledgeStateSummaryGroup[];
};

const DISPLAYED_STATES: KnowledgeNodeStatus[] = ["confident", "practiced", "developing", "introduced", "needs_review"];
const DEFAULT_LIMIT = 3;

export function buildSetupKnowledgeReview(setup: SetupState, options: BuildUserContextFromSetupOptions & { limitPerState?: number } = {}): PillarKnowledgeReview[] {
  const context = buildUserContextFromSetup(setup, options);
  return buildKnowledgeStateSummary(context, setup, options.limitPerState);
}

export function buildKnowledgeStateSummary(context: UserContext, setup?: SetupState, limitPerState = DEFAULT_LIMIT): PillarKnowledgeReview[] {
  const pillars = context.pillarMemory?.pillars ?? [];
  const states = context.pillarMemory?.knowledgeStates ?? [];

  return pillars.map((pillar) => {
    const setupPillar = setup?.pillars.find((item) => normalize(item.name) === normalize(pillar.name));
    const statesForPillar = states.filter((state) => pillar.knowledgeMap.nodes.some((node) => node.id === state.nodeId));

    return {
      pillarName: pillar.name,
      domainName: setupPillar?.domainProfile?.domainName ?? domainNameFromPillar(pillar),
      currentLevel: setupPillar?.domainProfile?.currentLevel,
      credential: setupPillar?.domainProfile?.credentials?.[0],
      groups: DISPLAYED_STATES.map((status) => groupForStatus(pillar, statesForPillar, status, limitPerState)).filter((group) => group.totalCount > 0)
    };
  });
}

function groupForStatus(pillar: Pillar, states: NonNullable<UserContext["pillarMemory"]>["knowledgeStates"], status: KnowledgeNodeStatus, limit: number): KnowledgeStateSummaryGroup {
  const concepts = (states ?? [])
    .filter((state) => state.status === status)
    .map((state) => pillar.knowledgeMap.nodes.find((node) => node.id === state.nodeId)?.concept.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));

  return {
    status,
    label: labelForStatus(status),
    concepts: concepts.slice(0, limit),
    totalCount: concepts.length
  };
}

function labelForStatus(status: KnowledgeNodeStatus): string {
  const labels: Record<KnowledgeNodeStatus, string> = {
    never_seen: "Not yet seen",
    introduced: "Introduced",
    practiced: "Practiced",
    developing: "Developing",
    confident: "Confident",
    needs_review: "Needs review"
  };

  return labels[status];
}

function domainNameFromPillar(pillar: Pillar): string {
  return pillar.knowledgeMap.name.replace(/\s+Knowledge Map$/, "");
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
