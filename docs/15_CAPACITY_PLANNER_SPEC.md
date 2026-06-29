# Capacity Planner Specification

**Project:** Axis
**Document:** 15_CAPACITY_PLANNER_SPEC.md
**Status:** Draft 1
**Last Updated:** June 2026

---

# Purpose

Axis should not only determine the best use of **today**.

It should determine the best use of a person's finite capacity across the coming week, month, and year.

The Capacity Planner is responsible for shaping time so that meaningful progress can occur across all active Pillars without sacrificing recovery or creating unnecessary conflict.

It does **not** generate a calendar.

It reasons about capacity.

---

# Guiding Principle

Today is the execution surface.

The Week is the optimization surface.

Axis should optimize the shape of a week so that individual days naturally become easier to execute.

---

# Architecture

Identity
↓
Pillars
↓
Domain Models
↓
Programs & Routines
↓
Capacity Planner
↓
Decision Graph
↓
Week
↓
Today
↓
Now

---

# Responsibilities

The Capacity Planner should:

- Understand fixed commitments
- Understand flexible commitments
- Protect recurring programs
- Preserve momentum across Pillars
- Allocate deep work
- Respect recovery
- Minimize unnecessary context switching
- Detect overload before it happens
- Surface tradeoffs rather than silently making them

---

# Time Horizons

The planner reasons across:

- Year
- Quarter
- Month
- Week
- Today
- Now

The Week is the primary optimization window.

---

# Capacity Model

Each activity has characteristics:

- Duration
- Frequency
- Flexibility
- Recovery cost
- Cognitive load
- Physical load
- Preparation time
- Travel time
- Momentum value

---

# Commitment Types

## Fixed

Cannot move.

Examples:
- Meetings
- Flights
- Medical appointments

## Flexible

Can shift.

Examples:
- Office hours
- Deep work
- Errands

## User Scheduled

Chosen intentionally.

Examples:
- BJJ
- Guitar lesson
- Date night

---

# Programs

Programs define recurring systems.

Examples:

Weightlifting
- Pull
- Push
- Pull
- Push
- Legs

BJJ
- Technique
- Rolling
- Open Mat

Music
- Writing
- Production
- Mixing

Programs define cadence.

Capacity Planner determines placement.

---

# Momentum

Each Pillar has a minimum rhythm needed to avoid stagnation.

Example:

- BJJ: 2–3 sessions/week
- Lifting: 4–5 sessions/week
- Music: 3 creative sessions/week
- Porthos: daily work

Protect momentum before maximizing volume.

---

# Recovery

Recovery is productive time.

Model:

- Sleep
- Physical fatigue
- Mental fatigue
- Consecutive hard days
- Deload periods

---

# Tradeoffs

Axis should explain recommendations.

Example:

"This week works better if you work 7–3 on Tuesday and Thursday. That preserves two BJJ classes, keeps your lifting cycle on schedule, and creates one uninterrupted music session."

---

# Inputs

Future inputs:

- Calendar
- Programs
- Practice History
- Identity
- Pillars
- Domain Models
- Travel
- Recovery patterns

---

# Outputs

Possible outputs:

- Weekly shape
- Suggested office schedule
- Training cadence
- Creative blocks
- Recovery windows
- Logistics adjustments

These become inputs to the Decision Graph.

---

# Non-Goals

The Capacity Planner is not:

- A calendar replacement
- A task manager
- A scheduler
- A habit tracker

It optimizes capacity, not occupancy.

---

# Version One

Version One succeeds if Axis can:

- Reason over a week's commitments.
- Distinguish fixed and flexible obligations.
- Recommend a better weekly shape.
- Preserve momentum across Pillars.
- Respect recovery.
- Improve Today because the week has been optimized.

---

# North Star

Axis should help users stop asking:

"What can I fit into today?"

and instead ask:

"How should this week be shaped so today's best choice becomes obvious?"
