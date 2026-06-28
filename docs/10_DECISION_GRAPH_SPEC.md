# 10_DECISION_GRAPH_SPEC.md

## Purpose

The Decision Graph is the intellectual core of Axis.

Axis does not begin by generating a schedule. It begins by reasoning.

**Today is not the product. Today is the daily expression of the
Decision Graph.**

Every recommendation should be traceable through a chain of decisions
that explains *why* it exists.

------------------------------------------------------------------------

# Design Principles

-   Every recommendation must be explainable.
-   Every recommendation should protect identity rather than maximize
    productivity.
-   Decisions emerge from relationships, not isolated rules.
-   The graph is the engine; the UI is merely a view of the engine.
-   Learning modifies the graph, not the presentation.

------------------------------------------------------------------------

# High-Level Flow

    Inputs
        ↓
    Decision Graph
        ↓
    Candidate Decisions
        ↓
    Selected Today
        ↓
    Morning / Now / Evening UI

The Today engine is a consumer of the graph, not its replacement.

------------------------------------------------------------------------

# Node Types

## Identity

Long-lived aspects of the person the user is trying to become.

Examples:

-   Creative Identity
-   Professional Excellence
-   Vitality
-   Relationships
-   Recovery
-   Curiosity

Identity nodes change slowly.

------------------------------------------------------------------------

## Principles

Persistent beliefs that guide behavior.

Examples:

-   Protect deep work before shallow work.
-   Finish fewer, more meaningful things.
-   Leave margin for tomorrow.

------------------------------------------------------------------------

## Constraints

External realities.

Examples:

-   Calendar events
-   Deadlines
-   Commitments
-   Available focus window
-   Energy level
-   Location
-   Required collaborators

Constraints influence decisions but do not define identity.

------------------------------------------------------------------------

## Opportunities

Time-sensitive moments where action has unusually high leverage.

Examples:

-   Strong morning focus
-   Waiting on feedback
-   Unexpected free hour

------------------------------------------------------------------------

## Decisions

Concrete recommendations produced by the graph.

Examples:

-   Protect 08:45--10:00
-   Delay email
-   Move meeting preparation later
-   Schedule recovery walk

Each decision stores:

-   confidence
-   supporting nodes
-   competing alternatives
-   explanation

------------------------------------------------------------------------

## Outputs

The graph produces:

-   Theme
-   NOW
-   NEXT
-   Timeline
-   Protected Session
-   Confidence
-   Explanations

Outputs never exist without supporting decisions.

------------------------------------------------------------------------

# Edge Types

Examples include:

-   protects
-   supports
-   enables
-   conflicts_with
-   depends_on
-   satisfies
-   derived_from
-   strengthens
-   weakens

Edges are first-class reasoning elements.

------------------------------------------------------------------------

# Decision Selection

The engine evaluates candidate decisions according to:

1.  Identity alignment
2.  Principle alignment
3.  Constraint satisfaction
4.  Opportunity leverage
5.  Risk of drift
6.  Recovery impact
7.  Overall confidence

Highest-value compatible decisions become Today.

------------------------------------------------------------------------

# Confidence

Confidence is computed, not guessed.

Contributors may include:

-   Identity alignment
-   Calendar certainty
-   Historical success
-   Conflicting commitments
-   Available uninterrupted time
-   Information completeness

The confidence score should always be explainable.

------------------------------------------------------------------------

# Explanation Generation

Every recommendation must answer:

> Why is this here?

Example:

> Protect this creative session because it aligns strongly with your
> Creative Identity, occupies your best uninterrupted focus window, and
> delaying it would increase drift later today.

The explanation is generated from graph structure, not written
independently.

------------------------------------------------------------------------

# Learning

Evening reflection does not rewrite Today.

It updates the graph.

Possible updates:

-   strengthen successful patterns
-   weaken ineffective assumptions
-   adjust identity weights
-   refine confidence calculations
-   discover recurring constraints

The graph becomes more accurate over time while preserving the user's
long-term values.

------------------------------------------------------------------------

# UI Relationship

Morning reveals the graph's conclusions.

Begin commits to one branch.

Now hides the graph and protects attention.

Evening inspects outcomes and updates reasoning.

The user should rarely need to inspect the graph directly, but it must
always exist beneath the experience.

------------------------------------------------------------------------

# Guiding Questions

Every architectural change should answer:

1.  Does this improve reasoning?
2.  Is every recommendation traceable?
3.  Does it strengthen trust?
4.  Does it help Today emerge naturally?
5.  Does it make an ordinary Thursday better?

If not, reconsider the change.

------------------------------------------------------------------------

# Final Principle

Axis is not a scheduling engine with explanations attached.

Axis is a reasoning engine whose daily decisions naturally become Today.
