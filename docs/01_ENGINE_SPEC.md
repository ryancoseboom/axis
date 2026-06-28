# Axis Engine Specification

## Core Function

``` ts
generateToday(user)
```

Purpose: Generate the best version of Today.

Pipeline: 1. Gather Facts 2. Build Context 3. Generate Opportunities 4.
Score Opportunities 5. Choose Protected Session 6. Build Timeline 7.
Explain Reasoning 8. Observe 9. Adapt 10. Reflect 11. Learn

Protected Session Question:

> If today ended right now, what would the user most wish they had done?

Scoring Dimensions

-   selfRespect
-   missionProgress
-   systemProtection
-   milestoneGravity
-   driftReduction
-   energyFit
-   contextFit
-   opportunityCost
