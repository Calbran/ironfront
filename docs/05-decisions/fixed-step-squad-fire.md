# Fixed-step authoritative squad fire

Date: 2026-09-10
Status: Accepted architecture; provisional balance

The user approved efficient server-side damage for many simultaneous battles. Squads remain authoritative combat entities. Resolve seeded hit samples at fixed campaign-time steps, retain valid targets, query nearby enemies, cache static obstruction checks, and apply each exchange's damage simultaneously. Tank and artillery impacts are saved scheduled events, not physical bullets. Viewing a battle must not change its outcome.

Implemented in the campaign tactical resolver. See [the system and benchmark notes](../02-systems/squad-fire-model.md). The step duration, damage coefficients, armor effectiveness, reloads, and blast radii remain provisional. Connecting the separate 3D city preview and its building geometry is still outstanding.
