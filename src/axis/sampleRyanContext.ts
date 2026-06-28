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
      id: "pursuit-axis",
      name: "Axis",
      whyItMatters: "Build a reasoning engine that helps people spend today well."
    },
    {
      id: "pursuit-health",
      name: "Health",
      whyItMatters: "Keep energy stable enough for meaningful work and a steady evening."
    }
  ],
  missions: [
    {
      id: "mission-version-zero",
      pursuitId: "pursuit-axis",
      name: "Prove Version Zero",
      currentNeed: "Turn the philosophy into a working Today prototype without adding infrastructure."
    },
    {
      id: "mission-recovery",
      pursuitId: "pursuit-health",
      name: "Protect baseline energy",
      currentNeed: "Avoid letting focus work consume the recovery that makes tomorrow possible."
    }
  ],
  milestones: [
    {
      id: "milestone-engine-slice",
      missionId: "mission-version-zero",
      name: "Generate a complete ordinary Thursday",
      gravity: 10,
      evidence: "The project docs say Version Zero succeeds by proving the Thursday Test."
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
