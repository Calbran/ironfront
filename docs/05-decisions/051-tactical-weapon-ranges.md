# 051 — Tactical weapon ranges

Status: implemented provisional balance, 2026-09-11.

The city and country tactical scenes use 0.55 model units per metre, matching the current real-map adaptation scale. Their shared direct-fire profiles are:

| Role | Effective | Maximum | Purpose |
| --- | ---: | ---: | --- |
| Rifle | 200 m | 300 m | Dependable general fire with sharply declining long-range accuracy. |
| Light machine gun | 300 m | 500 m | Sustained suppression, poor moving fire and a longer reload. |
| Early rocket launcher | 69 m | 100 m | Close anti-armor ambush weapon with a slow single-shot cycle. |
| Tank cannon | 400 m | 900 m | Long direct fire whose accuracy and damage decline beyond 400 m. |

Historical 75 mm tank-gun training and doctrine considered targets at substantially longer ranges: U.S. manuals trained range estimation through 1,500 yards and described 75 mm armor-piercing effectiveness against most tanks to about 1,000 yards. The tank therefore retains strong fire through 400 metres and degraded attempts to 900 metres. Urban geometry usually shortens those lines naturally.

U.S. Army rifle doctrine states that individual personnel targets can rarely be detected and effectively engaged beyond 300 metres under battlefield conditions. Rifles therefore retain their 200-metre effective range and receive a 300-metre maximum. Accuracy stays useful through the effective band, then declines continuously to 12 percent of the close-range multiplier at maximum range; damage also declines to 55 percent. Source: [FM 23-8, U.S. Rifle, 7.62-MM, M14 and M14E2](https://rdl.train.army.mil/catalog-ws/view/100.ATSC/710C9E3A-308E-49A1-A22E-CECA92C3F89A-1274548901937/fm23-8/fm23_8.pdf).

`packages/game-core/src/cityCombatRules.ts` owns range, base accuracy, moving accuracy, soft/armor effectiveness, suppression, magazine and reload data for every tactical role. `squadFire.ts` consumes the selected profile. City and country adapters map units to those roles. Direct fire still requires authorized vision and exposure. Selected country units draw strong amber effective-range rings and faint amber maximum-range rings.

These values remain subject to encounter balance review. Accuracy falloff, optics, ammunition types and crew quality are not modeled yet.
