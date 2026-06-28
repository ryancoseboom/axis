import type { Facts, ScoredOpportunity, TimelineItem } from "./types";

export function buildTimeline(facts: Facts, protectedSession: ScoredOpportunity): TimelineItem[] {
  const fixedEvents: TimelineItem[] = facts.events
    .filter((event) => event.kind === "fixed")
    .map((event) => ({
      time: `${event.window.start}-${event.window.end}`,
      title: event.title,
      description: "Keep this clean. Do not let it consume the day.",
      protects: event.title === "Lunch" ? "Vitality" : "Professional Excellence",
      kind: "fixed" as const
    }));

  return [
    {
      time: "08:30-08:45",
      title: "Arrive",
      description: "Name the day. Open the work. Begin cleanly.",
      protects: "Attention",
      kind: "support" as const
    },
    {
      time: `${protectedSession.preferredWindow.start}-${protectedSession.preferredWindow.end}`,
      title: protectedSession.title,
      description: "Do this now.",
      protects: protectedSession.protects,
      kind: "protected" as const
    },
    ...fixedEvents,
    {
      time: "14:00-14:45",
      title: "Quiet product pass",
      description: "Tighten language. Remove uncertainty.",
      protects: "Professional Excellence",
      kind: "support" as const
    },
    {
      time: "17:15-17:45",
      title: "Recovery walk",
      description: "End with enough margin for tomorrow.",
      protects: "Recovery",
      kind: "support" as const
    }
  ].sort((a, b) => a.time.localeCompare(b.time));
}
