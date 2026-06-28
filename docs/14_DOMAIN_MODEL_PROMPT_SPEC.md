# Domain Model Prompt Specification

**Project:** Axis
**Document:** 14_DOMAIN_MODEL_PROMPT_SPEC.md
**Status:** Draft 1
**Last Updated:** June 2026

---

# Purpose

This document defines the contract between Axis and a Large Language Model (LLM) for generating Domain Models.

The LLM is used only as an author of Domain Models.

It is never part of the runtime reasoning engine.

---

# Guiding Principle

The LLM generates knowledge.

Axis validates, normalizes, versions, and stores that knowledge.

The Decision Graph reasons only over validated Domain Models.

LLM
↓
Draft Domain Model
↓
Validation
↓
Canonical JSON
↓
Reasoning Engine

---

# Responsibilities

The LLM may:

- Generate concepts
- Generate relationships
- Suggest categories
- Suggest progression paths
- Suggest review relationships
- Generate terminology

The LLM must not:

- Produce daily recommendations
- Score the user
- Infer personal preferences
- Modify user history
- Invent runtime state

---

# Required Output

Every generated Domain Model should include:

- Metadata
- Concepts
- Categories
- Relationships
- Optional Programs
- Optional Review Paths

The output must conform to the canonical Axis JSON schema.

---

# Allowed Relationship Types

Only these relationship types are valid:

- related_to
- prerequisite
- part_of
- reinforces
- alternative_to
- follow_up
- review_with
- contrasts_with
- progresses_to

No custom relationship names.

---

# Validation Rules

Axis validates every generated model.

Checks include:

- Unique concept IDs
- Unique concept names
- Valid relationship endpoints
- No duplicate edges
- Allowed relationship types only
- No circular prerequisite chains unless explicitly permitted

Invalid content is rejected or normalized before storage.

---

# Prompt Structure

Every generation prompt should include:

1. Domain name
2. Intended learner level
3. Desired breadth
4. Required relationship vocabulary
5. Output schema
6. Determinism requirements

Example:

Generate a deterministic Domain Model for Brazilian Jiu-Jitsu suitable for an intermediate practitioner. Use only the approved relationship types and output valid JSON matching the Axis schema.

---

# Versioning

Each generated model stores:

- version
- generatedDate
- generatorVersion
- promptVersion
- createdBy

User customizations are stored separately and should survive regeneration whenever possible.

---

# Regeneration

Axis may regenerate a Domain Model when:

- The user requests it.
- The schema evolves.
- A newer prompt version exists.

Regeneration must never overwrite user-specific practice history or knowledge states.

---

# Future

Future versions may support:

- Multiple LLM providers
- Human-reviewed models
- Community models
- Professional domain packs

Regardless of origin, every model must compile into the same canonical internal representation.

---

# North Star

The LLM is a knowledge author.

Axis is the reasoning engine.

That separation must remain clear throughout the architecture.
