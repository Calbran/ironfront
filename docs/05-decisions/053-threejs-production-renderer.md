# 053 — Three.js production renderer

Status: accepted and implemented, 2026-09-12.

Three.js owns the complete active game presentation: campaign, country traversal and tactical combat. The production campaign entry is `/`. The lobby preview and authenticated campaign map both use Three.js.

Pixi is retired. `/legacy.html` loads it only for historical comparison and recovery of old campaign saves. It is not a fallback, development target or parity requirement. New gameplay presentation, controls, effects and performance work must be implemented through the Three.js production path and shared owners listed in `docs/03-technical/shared-system-standards.md`.

The React campaign shell, API, persistence and game-core simulation remain renderer-independent. Retiring Pixi does not authorize client-side simulation or a rewrite of campaign authority. Existing experimental Three.js modules may be promoted or reorganized as they become production owners; documentation must describe current ownership rather than preserve an obsolete experimental label.

The campaign is one continuous, persistent battlefield. Opposing forces detect, maneuver and fight directly in the campaign world; players never launch a separate battle or leave the campaign for an encounter screen. `/country-slice.html` is an isolated test harness used to prove systems before they are integrated into the campaign.

The active renderer still has unfinished work. Missing campaign overlays, detailed terrain streaming, cover integration, LOD and long-session performance are production backlog. They are to be solved in Three.js.
