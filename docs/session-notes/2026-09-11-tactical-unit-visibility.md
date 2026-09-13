# Tactical unit visibility — 2026-09-11

The shared city/country marker projection previously coupled model removal to full badge opacity. Ground geometry disappeared at about three screen pixels per world unit, roughly 214 camera units away under the standard 50-degree, 600-pixel-high perspective.

Badges still fade in from six to three pixels per world unit. Model removal is now independent and occurs at 1.25 pixels per world unit, about 515 camera units away. Ground models therefore remain visible beneath fully opaque badges for a longer overlap instead of disappearing as soon as the badge finishes fading in. Airships use one tenth of the ground threshold and retain ten times the distance.

The city battle and country encounter both consume `cityUnitMarkers.ts`; neither adapter owns a separate threshold.
