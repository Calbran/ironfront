# Starting zones and travel-time study

User approved defining starting-zone rules and generating a travel-time overlay. Implemented an isolated preview at `/pacing-preview.html`, using existing world generation, capital allocation for proposed zones, ground legality and cross-region routing. Infantry ETA integrates per-region unsuppressed speed. It is a movement-only estimate and excludes combat/consolidation delays; the route planner is not time-optimal.

Meridian first farmland candidate: nearest of six sampled settlements 22.3h; other routes 57.4, 86.6, 110.6, 75.2 and 90.8 hours. This fails proposed nearby opportunity targets. Do not generalize this single-site observation into validated balance.

Decision 031 distinguishes accepted home-base direction from provisional numerical targets and unimplemented placement/economy/fairness gates. The UI neither grants territory nor creates a persisted base. Two targeted tests pass (route integration and valid candidates/non-mutating audit), TypeScript and production build pass with the existing large-chunk warning. Browser generation and candidate selection show route labels and target failures correctly.
