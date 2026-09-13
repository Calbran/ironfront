# Tactical weapon ranges — 2026-09-11

The prior shared values were 26 model units for infantry and 38 for every vehicle or anti-tank unit. At 0.55 model units per metre, that made tank reach about 69 metres and also coupled tanks to portable anti-tank squads.

The shared owner now assigns explicit tactical profiles. Rifles are effective to 200 metres and can attempt degraded fire to 300; LMGs use 300/500 metres; early rocket launchers use 69/100 metres; tank cannon use 400/900 metres. Accuracy and damage decline continuously between effective and maximum range. Each profile also owns movement accuracy, soft/armor effectiveness, suppression, magazine and reload values. City vehicle spotting reaches tank maximum range, while city infantry and country infantry see roughly 327 metres. Buildings, terrain, forest and authorization still govern target acquisition.

Regression coverage checks the shared scale and role mapping, continuous falloff, zero fire beyond maximum range, LMG suppression, rocket effectiveness against armor, moving fire and deterministic persistence.

The longer sightline exposed excessive empty-cell scanning in the shared visibility index. It now walks only the spatial cells crossed by the shot and retains exact polygon intersection checks; a corner-crossing regression covers the traversal. The city adapter uses the same 24-unit visibility buckets as the country encounter.

Validation: all 321 tests passed with concurrency limited to two, plus typecheck and production build. Browser review loaded the connected ocean-port city battle with six enemies visible through the tank's direct sightlines, ran long-range combat without console errors, and reset it to Battle ready. The country encounter loaded, advanced from 600 to 583 seconds without runtime errors, and was left paused.

Infantry follow-up validation extended rifles to a 200-metre effective range. The weapon-profile follow-up adds maximum-range falloff and role-specific behavior; its validation is recorded in project state and the changelog.

Weapon-profile validation: all 32 focused profile, squad-fire, tactical-support, country-encounter, city-battle and shell tests pass. Typecheck and the production build pass. Browser review confirms three terrain-draped range bands and the live labels `Fire 200 m effective / 300 m max` for rifles, `69 m effective / 100 m max` for rocket teams and `400 m effective / 900 m max` for tanks.
