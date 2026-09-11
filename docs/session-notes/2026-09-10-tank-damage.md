# City tank damage
Corrected campaign-scaled shell payload and zero-damage on-target explosions. City shells use fixed 120 base damage, infantry multiplier 1.35, splash falloff and cover occlusion. Failed accuracy rolls scatter. Per user follow-up, aligned stationary tanks within 12 units directly hit stationary targets; a test verifies first-shell infantry death. Five-second reload unchanged. Typecheck, build and focused tests pass. Browser refresh attempt timed out.

Validation complete: 212 regression tests passed. The final close-range exception also passed the first-shell lethality test, typecheck and build. Browser subsequently confirmed the battle is ready after reload. Restored visible-enemy count wording after concurrent camera UI changes.
