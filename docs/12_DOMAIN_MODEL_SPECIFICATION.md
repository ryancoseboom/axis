# Axis Domain Model Specification

**Project:** Axis  
**Document:** 12_DOMAIN_MODEL_SPEC.md  
**Status:** Draft 1  
**Last Updated:** June 2026

---

# Purpose

Axis cannot intelligently guide development without understanding the domain in which the user is developing.

A **Domain Model** represents expert knowledge about a subject.

Examples:

- Brazilian Jiu-Jitsu
- Weightlifting
- Songwriting
- Photography
- Wine
- Programming
- Languages
- Cooking

The Domain Model is **not** the user's progress.

It is the world's knowledge of the subject.

---

# Fundamental Principle

Axis maintains two separate knowledge systems.

## Domain Knowledge

**"What exists."**

Example:

```
Closed Guard
    ↓
Arm Bar
    ↓
Triangle Choke
    ↓
Omoplata
    ↓
Back Take
```

This graph exists regardless of the user.

---

## User Knowledge

**"What this person currently knows."**

Example:

```
Arm Bar          → Practiced
Triangle Choke   → Suggested
Omoplata         → Unknown
Back Takes       → Developing
```

User Knowledge is an overlay on top of the Domain Model.

---

# Why This Exists

Axis should never require users to manually author hundreds or thousands of concepts and relationships.

Instead:

```
User chooses domain

↓

Axis generates expert model

↓

User develops within that model
```

---

# Core Philosophy

Axis reasons deterministically.

Large Language Models do not.

Therefore:

**LLMs never participate directly in daily reasoning.**

Instead:

```
LLM

↓

Generates Domain Model

↓

Axis validates

↓

Stores canonical JSON

↓

Decision Graph reasons deterministically
```

This separation is fundamental.

---

# Architecture

```
Identity
        ↓
Pillar
        ↓
Domain Model
        ↓
Knowledge Map
        ↓
Programs
        ↓
Practice History
        ↓
Development Signals
        ↓
Decision Graph
        ↓
Today
```

---

# Responsibilities

A Domain Model defines:

- Concepts
- Relationships
- Categories
- Progression
- Prerequisites
- Review paths
- Terminology
- Optional metadata

A Domain Model **never** stores user history.

---

# Concepts

Each concept represents one piece of domain knowledge.

## Brazilian Jiu-Jitsu

- Closed Guard
- Arm Bar
- Triangle Choke
- Omoplata
- Back Take
- Guard Retention
- Frames
- Inside Position

---

## Weightlifting

- Push
- Pull
- Legs
- Cable Row
- Bench Press
- Romanian Deadlift
- Progressive Overload

---

## Music

- Verse
- Chorus
- Arrangement
- Harmony
- Countermelody
- Mix
- Master

---

# Relationship Types

Supported deterministic relationships:

- related_to
- prerequisite
- part_of
- reinforces
- alternative_to
- follow_up
- review_with
- contrasts_with
- progresses_to

No arbitrary relationship types.

---

# Categories

Concepts may belong to categories.

Example:

```
Submission
Position
Escape
Passing
Grip
Movement
Guard
```

Categories improve reasoning and recommendation.

---

# Programs

Programs and Domain Models are different.

Programs answer:

> What should come next?

Domain Models answer:

> What is related?

Example:

```
Program

Day 1

↓

Pull

↓

Cable Row

↓

Curl
```

The Program controls sequence.

The Domain Model controls understanding.

---

# User Knowledge

User Knowledge overlays the Domain Model.

Each concept exists in one lightweight state.

Possible states:

- never_seen
- introduced
- practiced
- developing
- confident
- needs_review

No numeric scoring.

---

# Practice Updates

When a PracticeEntry is recorded:

Example:

```
Practiced:

Arm Bar
```

Axis updates:

```
Arm Bar
    ↓
Practiced

Triangle
    ↓
Suggested

Closed Guard
    ↓
Reinforced

Review
    ↓
Scheduled
```

No LLM reasoning is required.

---

# Development Signals

Signals originate from:

- Programs
- Knowledge Maps
- Calendar
- Identity

Examples:

- Continue Pull Program
- Review Arm Bar
- Learn Triangle Choke
- Revisit Harmony
- Balance neglected Music pillar

Signals become inputs to the Decision Graph.

---

# Domain Model Generation

Initially:

Axis uses an LLM.

Prompt:

> Generate a deterministic Domain Model for Brazilian Jiu-Jitsu.

The output is:

- validated
- normalized
- versioned
- stored

The LLM is no longer involved after generation.

---

# Canonical Storage

Domain Models are stored as JSON.

```
domains/

bjj.json

weightlifting.json

music.json

wine.json

python.json
```

These become the canonical source of truth.

---

# Editing

Users may:

- rename concepts
- add concepts
- remove concepts
- modify relationships
- disable concepts

The resulting model remains deterministic.

---

# Versioning

Each Domain Model stores:

- version
- generatedDate
- generatorVersion
- createdBy
- customizations

Future regeneration should preserve user customizations whenever possible.

---

# Future Vision

Eventually Axis may support:

- Community Domain Models
- Professional Domain Models
- Organization-specific models
- Private Domain Models
- Marketplace distribution

Every Domain Model compiles into the same deterministic internal representation.

The reasoning engine never depends on where the model originated.

---

# Non-Goals

A Domain Model is **not**:

- Chat history
- Vector embeddings
- Live LLM conversations
- Retrieval-augmented generation
- Task lists
- Habit trackers
- Productivity workflows

Its sole purpose is to provide a stable, expert understanding of a domain so Axis can reason consistently.

---

# Future Integration Pipeline

```
User creates Pillar
        ↓
Selects Domain
        ↓
LLM generates Domain Model
        ↓
Axis validates model
        ↓
Canonical JSON stored
        ↓
Knowledge Map created
        ↓
Programs optionally generated
        ↓
Practice updates User Knowledge
        ↓
Development Signals generated
        ↓
Decision Graph computes Today
```

---

# North Star

Axis should eventually understand a domain well enough that users feel they are developing alongside an expert mentor—not because the system improvises advice, but because it reasons consistently over a rich, deterministic model of that field.