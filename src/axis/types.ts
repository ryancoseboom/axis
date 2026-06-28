export type EnergyLevel = "low" | "steady" | "high";

export type DayWindow = {
  start: string;
  end: string;
};


export type TimeBlock = DayWindow;

export type CommitmentKind = "meeting" | "call" | "appointment" | "travel" | "personal" | "unknown";

export type CommitmentFlexibility = "fixed" | "movable" | "tentative";

export type CommitmentEnergyCost = "low" | "medium" | "high";

export type CommitmentSource = "manual" | "calendar" | "inferred";

export type ExternalCommitment = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: CommitmentKind;
  flexibility: CommitmentFlexibility;
  energyCost: CommitmentEnergyCost;
  source: CommitmentSource;
};

export type AvailabilityWindow = {
  id: string;
  start: string;
  end: string;
  durationMinutes: number;
  focusSuitable: boolean;
  partOfDay: "morning" | "afternoon";
  source: "derived" | "manual" | "calendar";
  reason: string;
};

export type CalendarContext = {
  commitments: ExternalCommitment[];
  availabilityWindows: AvailabilityWindow[];
  dayStart: string;
  dayEnd: string;
  recoveryStartsAt: string;
};


export type PillarStatus = "active" | "inactive";

export type PracticeIntensity = "low" | "medium" | "high";

export type PracticeSource = "manual" | "inferred" | "future integration";

export type SkillRelationshipType =
  | "related_to"
  | "prerequisite_for"
  | "reinforces"
  | "contrasts_with"
  | "follow_up"
  | "review_later";

export type PracticeTopic = {
  id: string;
  name: string;
  description: string;
  domainId: string;
};

export type SkillRelationship = {
  id: string;
  fromTopicId: string;
  toTopicId: string;
  type: SkillRelationshipType;
  description: string;
};

export type PracticeDomain = {
  id: string;
  pillarId: string;
  name: string;
  description: string;
  topics: PracticeTopic[];
  relationships: SkillRelationship[];
};

export type Pillar = {
  id: string;
  name: string;
  description: string;
  priority: number;
  identityWeight: number;
  domains: PracticeDomain[];
  status: PillarStatus;
};

export type PracticeEntry = {
  id: string;
  pillarId: string;
  date: string;
  title: string;
  notes: string;
  topics: string[];
  intensity: PracticeIntensity;
  confidence: number;
  familiarity: number;
  source: PracticeSource;
};


export type ProgramStatus = "active" | "inactive";

export type ProgramCycleType = "repeating";

export type ProgramPrescription = {
  movementCount: number;
  setsPerMovement: number;
  repRange?: string;
  notes?: string;
};

export type MovementOption = {
  id: string;
  name: string;
  movementPattern: string;
  primaryFocus: string;
  secondaryFocus: string[];
  equipment: string[];
  contraindications: string[];
  tags: string[];
};

export type ProgramDay = {
  id: string;
  name: string;
  focus: string;
  sequenceIndex: number;
  prescription: ProgramPrescription;
  movementOptions: MovementOption[];
};

export type ProgramCycle = {
  id: string;
  type: ProgramCycleType;
  days: ProgramDay[];
};

export type Program = {
  id: string;
  pillarId: string;
  name: string;
  description: string;
  cycleType: ProgramCycleType;
  days: ProgramDay[];
  status: ProgramStatus;
};

export type CompletedProgramSession = {
  id: string;
  programId: string;
  programDayId: string;
  date: string;
  movementsCompleted: string[];
  setsCompleted: number;
  notes: string;
  perceivedEffort?: PracticeIntensity;
};

export type ReviewSchedule = {
  entryId: string;
  topicId: string;
  firstReviewDate: string;
  secondReviewDate: string;
  overdue: boolean;
};

export type DevelopmentSignalType =
  | "related_technique"
  | "review"
  | "overdue_review"
  | "continue_thread"
  | "balance_neglected_pillar"
  | "deepen_topic";

export type DevelopmentSignal = {
  id: string;
  type: DevelopmentSignalType;
  pillarId: string;
  title: string;
  description: string;
  topicIds: string[];
  priority: number;
  dueDate?: string;
  sourceEntryId?: string;
  protects: string;
};

export type PillarMemory = {
  pillars: Pillar[];
  practiceEntries: PracticeEntry[];
  programs?: Program[];
  completedProgramSessions?: CompletedProgramSession[];
  developmentSignals?: DevelopmentSignal[];
};

export type Principle = {
  id: string;
  name: string;
  statement: string;
};

export type Pursuit = {
  id: string;
  name: string;
  whyItMatters: string;
};

export type Mission = {
  id: string;
  pursuitId: string;
  name: string;
  currentNeed: string;
};

export type Milestone = {
  id: string;
  missionId: string;
  name: string;
  gravity: number;
  evidence: string;
};

export type System = {
  id: string;
  name: string;
  protects: string;
  currentState: "healthy" | "strained" | "neglected";
};

export type Event = {
  id: string;
  title: string;
  window: DayWindow;
  kind: "fixed" | "flexible";
};

export type Constraint = {
  id: string;
  description: string;
};

export type Resource = {
  id: string;
  name: string;
  energy: EnergyLevel;
  focusWindow: DayWindow;
};

export type UserContext = {
  userName: string;
  dateLabel: string;
  themeSeed: string;
  principles: Principle[];
  pursuits: Pursuit[];
  missions: Mission[];
  milestones: Milestone[];
  systems: System[];
  events: Event[];
  constraints: Constraint[];
  resources: Resource[];
  calendarContext?: CalendarContext;
  pillarMemory?: PillarMemory;
};

export type Facts = {
  principles: Principle[];
  pursuits: Pursuit[];
  missions: Mission[];
  milestones: Milestone[];
  systems: System[];
  events: Event[];
  constraints: Constraint[];
  resources: Resource[];
  calendarContext?: CalendarContext;
  pillarMemory?: PillarMemory;
};

export type Opportunity = {
  id: string;
  title: string;
  pursuitId: string;
  missionId: string;
  durationMinutes: number;
  preferredWindow: DayWindow;
  evidence: string[];
  protects: string;
  protectsSystemId?: string;
  milestoneId?: string;
  energyRequired: EnergyLevel;
  developmentSignalId?: string;
  priority?: number;
};

export type ScoreBreakdown = {
  selfRespect: number;
  missionProgress: number;
  systemProtection: number;
  milestoneGravity: number;
  driftReduction: number;
  energyFit: number;
  contextFit: number;
  opportunityCost: number;
};

export type ScoredOpportunity = Opportunity & {
  score: ScoreBreakdown;
  totalScore: number;
  reasoning: string[];
};

export type TimelineItem = {
  time: string;
  title: string;
  description: string;
  protects: string;
  kind: "fixed" | "protected" | "support";
};

export type DecisionNodeType = "identity" | "principle" | "constraint" | "opportunity" | "decision" | "output";

export type DecisionEdgeType =
  | "protects"
  | "supports"
  | "enables"
  | "conflicts_with"
  | "depends_on"
  | "satisfies"
  | "derived_from"
  | "strengthens"
  | "weakens";

export type DecisionNode = {
  id: string;
  type: DecisionNodeType;
  title: string;
  explanation: string;
  importance: number;
  relatedObjectIds: string[];
  protects?: string;
  confidenceContribution?: number;
};

export type DecisionEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: DecisionEdgeType;
  explanation: string;
  weight: number;
};

export type DecisionGraph = {
  nodes: DecisionNode[];
  edges: DecisionEdge[];
};

export type CandidateDecisionKind = "theme" | "protect_session" | "next" | "timeline_support";

export type DecisionScore = {
  identityAlignment: number;
  principleAlignment: number;
  constraintSatisfaction: number;
  opportunityLeverage: number;
  driftRiskReduction: number;
  recoveryImpact: number;
  confidence: number;
};

export type ConfidenceFactorId =
  | "identityAlignment"
  | "focusWindowFit"
  | "versionZeroRelevance"
  | "conflictLevel"
  | "driftRisk"
  | "constraintCertainty"
  | "recoverySupport";

export type ConfidenceDirection = "positive" | "negative";

export type ConfidenceFactor = {
  id: ConfidenceFactorId;
  label: string;
  score: number;
  weight: number;
  direction: ConfidenceDirection;
  explanation: string;
};

export type ConfidenceResult = {
  score: number;
  factors: ConfidenceFactor[];
};

export type CandidateDecision = {
  id: string;
  kind: CandidateDecisionKind;
  title: string;
  explanation: string;
  window?: DayWindow;
  durationMinutes?: number;
  protects: string;
  opportunityId?: string;
  pursuitId?: string;
  missionId?: string;
  milestoneId?: string;
  supportingNodeIds: string[];
  competingDecisionIds: string[];
  score: DecisionScore;
  confidence: ConfidenceResult;
};

export type SelectedTodayDecisions = {
  theme: CandidateDecision;
  now: CandidateDecision;
  next: CandidateDecision;
  timeline: CandidateDecision[];
  protectedSession: CandidateDecision;
};

export type ReasonType = DecisionNodeType | "evidence" | "risk";

export type Reason = {
  id: string;
  type: ReasonType;
  title: string;
  explanation: string;
  importance: number;
  relatedObjectIds: string[];
  protects?: string;
  confidenceContribution?: number;
};

export type ReasonLink = {
  fromReasonId: string;
  toReasonId: string;
  label: string;
};

export type ReasonGraph = {
  reasons: Reason[];
  links: ReasonLink[];
};

export type ReasonedOutput = {
  id: string;
  label: string;
  reasonIds: string[];
};

export type TodayReasonedOutputs = {
  theme: ReasonedOutput;
  now: ReasonedOutput;
  next: ReasonedOutput;
  protectedSession: ReasonedOutput;
  confidence: ReasonedOutput;
};

export type TodayOutputReference =
  | { type: "theme" }
  | { type: "now" }
  | { type: "next" }
  | { type: "protectedSession" }
  | { type: "confidence" }
  | { type: "timelineItem"; decisionId: string };

export type ConfidenceContributor = ConfidenceFactor;

export type GraphPathStep = {
  fromNodeId: string;
  toNodeId: string;
  edgeType: DecisionEdgeType;
  explanation: string;
};

export type ExplainabilityResult = {
  output: TodayOutputReference;
  conciseExplanation: string;
  supportingNodes: DecisionNode[];
  confidenceContributors: ConfidenceContributor[];
  graphPath: GraphPathStep[];
  debug?: {
    targetNodeId: string;
    selectedDecisionId?: string;
    supportingNodeIds: string[];
  };
};

export type TodayGenerationOptions = {
  preferredDecisionId?: string;
};

export type GeneratedToday = {
  theme: string;
  primaryPursuit: Pursuit;
  protectedSession: ScoredOpportunity;
  timeline: TimelineItem[];
  reasoning: string[];
  confidence: number;
  confidenceByOutput: {
    today: ConfidenceResult;
    now: ConfidenceResult;
    next: ConfidenceResult;
    protectedSession: ConfidenceResult;
    timeline: Record<string, ConfidenceResult>;
  };
  decisionGraph: DecisionGraph;
  candidateDecisions: CandidateDecision[];
  selectedDecisions: SelectedTodayDecisions;
  reasonGraph: ReasonGraph;
  reasonedOutputs: TodayReasonedOutputs;
};
