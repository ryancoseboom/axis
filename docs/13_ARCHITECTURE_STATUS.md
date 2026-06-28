# Axis Architecture Status

**Project:** Axis  
**Document:** 13_ARCHITECTURE_STATUS.md  
**Status:** Living Document  
**Last Updated:** June 2026

---

# Purpose

This document tracks the current implementation status of every major subsystem in Axis.

Unlike the Product Roadmap, this document reflects reality.

It should be updated after every significant development milestone.

---

# Overall Progress

Estimated Version 1 Progress

**≈ 45%**

The architectural foundation is largely complete.

The remaining work focuses on identity, learning, and domain intelligence rather than infrastructure.

---

# Current Focus

**Current Milestone**

Knowledge Intelligence

Current objective:

- Knowledge Map authoring helpers
- Domain Model generation pipeline

---

# Architecture Overview

```
Identity
        │
        ▼
Domain Intelligence
        │
        ▼
Personal Development
        │
        ▼
Reasoning
        │
        ▼
Experience
        │
        ▼
Integrations
```

---

# Layer 1 — Identity

| System | Status | Progress |
|---------|--------|:--------:|
| Philosophy | ✅ Complete | 100% |
| Product Vision | ✅ Complete | 100% |
| Pillars | 🟢 Stable | 95% |
| Identity Engine | ⏳ Planned | 0% |
| Values Model | ⏳ Planned | 0% |
| Life Roles | ⏳ Planned | 0% |
| Long-Term Aspirations | ⏳ Planned | 0% |

---

# Layer 2 — Domain Intelligence

| System | Status | Progress |
|---------|--------|:--------:|
| Domain Models | 🚧 Designing | 15% |
| Knowledge Maps | 🟢 Stable | 90% |
| Knowledge States | 🟢 Stable | 90% |
| Relationship Engine | 🟢 Stable | 95% |
| Knowledge Queries | 🟢 Stable | 90% |
| Authoring Helpers | 🚧 Next | 0% |
| LLM Domain Generation | ⏳ Planned | 0% |

---

# Layer 3 — Personal Development

| System | Status | Progress |
|---------|--------|:--------:|
| Programs | 🟢 Stable | 90% |
| Program Completion | 🟢 Stable | 90% |
| Practice History | 🟢 Stable | 85% |
| Development Signals | 🟢 Stable | 90% |
| Memory Engine | ⏳ Planned | 15% |
| Learning Engine | ⏳ Planned | 5% |

---

# Layer 4 — Reasoning

| System | Status | Progress |
|---------|--------|:--------:|
| Decision Graph | 🟢 Stable | 95% |
| Explainability | 🟢 Stable | 95% |
| Confidence Engine | 🟢 Stable | 95% |
| Calendar Engine | 🟢 Stable | 90% |
| Today Generator | 🟢 Stable | 90% |
| Opportunity Selection | 🟢 Stable | 90% |

---

# Layer 5 — Experience

| System | Status | Progress |
|---------|--------|:--------:|
| UI Language | 🟢 Stable | 95% |
| Morning Flow | 🟢 Stable | 95% |
| Begin Transition | 🟢 Stable | 90% |
| Now Mode | 🟢 Stable | 90% |
| Adjust Flow | 🟢 Stable | 90% |
| Evening Experience | 🚧 Designing | 20% |
| Archive Experience | ⏳ Planned | 10% |

---

# Layer 6 — Integrations

| System | Status | Progress |
|---------|--------|:--------:|
| Calendar Adapter | 🟢 Ready | 90% |
| Google Calendar | ⏳ Planned | 10% |
| Apple Calendar | ⏳ Planned | 10% |
| HealthKit | ⏳ Planned | 0% |
| Apple Health | ⏳ Planned | 0% |
| Oura | ⏳ Planned | 0% |
| Garmin | ⏳ Planned | 0% |
| GitHub | ⏳ Planned | 0% |
| Gmail | ⏳ Planned | 0% |
| Notes | ⏳ Planned | 0% |

---

# Core Documents

| Document | Status |
|-----------|--------|
| 00_BOOK_OF_AXIS | ✅ Stable |
| 01_ENGINE_SPEC | ✅ Stable |
| 02_PRODUCT_ROADMAP | ✅ Stable |
| 03_OBJECT_MODEL | ✅ Stable |
| 04_UI_SYSTEM | ✅ Stable |
| 05_DECISIONS | ✅ Stable |
| 06_CODING_STANDARDS | ✅ Stable |
| 07_PROMPTS | ✅ Stable |
| 08_IDEAS_PARKING_LOT | Active |
| 09_EXPERIENCE_PRINCIPLES | ✅ Stable |
| 10_DECISION_GRAPH_SPEC | ✅ Stable |
| 11_CALENDAR_INTEGRATION_NOTES | Active |
| 12_DOMAIN_MODEL_SPEC | Draft |
| 13_ARCHITECTURE_STATUS | Living |

---

# Immediate Next Milestones

## 1

Knowledge Map Authoring Helpers

Status

Ready

---

## 2

Domain Model Generation Pipeline

Status

Next

---

## 3

Identity Engine

Status

Planning

---

## 4

Memory Engine

Status

Planning

---

## 5

Learning Engine

Status

Planning

---

## 6

Evening Experience

Status

Planning

---

# Current Technical Debt

None considered critical.

Known future cleanup:

- Refine Knowledge Map authoring ergonomics.
- Improve Domain Model validation.
- Expand Identity architecture.
- Continue simplifying reasoning interfaces.
- Remove temporary developer-only pathways as product UI replaces them.

---

# Current Definition of Success

Axis Version One is complete when:

✓ Identity meaningfully influences Today.

✓ Domain Models provide expert understanding of user-selected fields.

✓ Knowledge Maps evolve automatically through practice.

✓ Programs guide structured development.

✓ Development Signals combine Identity, Knowledge, Programs, and Calendar.

✓ Morning, Now, and Evening feel like one coherent experience.

✓ The app consistently passes the Thursday Test.

---

# Guiding Reminder

Whenever choosing between:

- adding features

or

- improving reasoning

prefer improving reasoning.

Axis is not trying to become a larger application.

Axis is trying to become a wiser one.