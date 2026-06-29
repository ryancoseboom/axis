import type { UserContext } from "./types";

export const sampleRyanContext: UserContext = {
  userName: "Ryan",
  dateLabel: "Thursday",
  themeSeed: "protect the work that makes the rest of the day feel honest",
  principles: [
    {
      id: "principle-self-respect",
      name: "Self-respect over throughput",
      statement: "A good day is one where action matches the person Ryan means to become."
    },
    {
      id: "principle-reality",
      name: "Reality wins",
      statement: "Plans should fit the actual day, not an imaginary one."
    }
  ],
  pursuits: [
    {
      id: "pursuit-porthos",
      name: "Porthos",
      whyItMatters: "Protect care, steadiness, and daily responsibility."
    },
    {
      id: "pursuit-music",
      name: "Music",
      whyItMatters: "Keep writing and production alive."
    },
    {
      id: "pursuit-bjj",
      name: "BJJ",
      whyItMatters: "Stay technical, composed, and honest in training."
    },
    {
      id: "pursuit-lifting",
      name: "Lifting",
      whyItMatters: "Keep strength, energy, and recovery steady."
    }
  ],
  missions: [
    {
      id: "mission-version-zero",
      pursuitId: "pursuit-music",
      name: "Protect the writing",
      currentNeed: "Write and produce the next Halou sketch."
    },
    {
      id: "mission-recovery",
      pursuitId: "pursuit-lifting",
      name: "Protect baseline energy",
      currentNeed: "Avoid letting focus work consume the recovery that makes tomorrow possible."
    }
  ],
  milestones: [
    {
      id: "milestone-engine-slice",
      missionId: "mission-version-zero",
      name: "Finish a clear Halou sketch",
      gravity: 10,
      evidence: "Music is one of the active user-facing Pillars."
    }
  ],
  systems: [
    {
      id: "system-deep-work",
      name: "Deep work before drift",
      protects: "The first real focus block of the day",
      currentState: "strained"
    },
    {
      id: "system-evening-recovery",
      name: "Evening recovery",
      protects: "A calm shutdown and enough margin to sleep well",
      currentState: "healthy"
    }
  ],
  events: [
    {
      id: "event-standup",
      title: "Team check-in",
      window: { start: "10:00", end: "10:30" },
      kind: "fixed"
    },
    {
      id: "event-lunch",
      title: "Lunch",
      window: { start: "12:30", end: "13:15" },
      kind: "fixed"
    },
    {
      id: "event-admin",
      title: "Admin and replies",
      window: { start: "16:00", end: "16:45" },
      kind: "flexible"
    }
  ],
  constraints: [
    {
      id: "constraint-afternoon-friction",
      description: "Afternoon context switching makes deep product reasoning more expensive."
    },
    {
      id: "constraint-no-infra",
      description: "Version Zero should stay local and deterministic."
    }
  ],
  resources: [
    {
      id: "resource-morning-focus",
      name: "Best focus window",
      energy: "high",
      focusWindow: { start: "08:45", end: "10:00" }
    },
    {
      id: "resource-afternoon-ops",
      name: "Operational energy",
      energy: "steady",
      focusWindow: { start: "14:00", end: "16:00" }
    }
  ]
};
