# 056 — Use the scale-test continent in production campaigns

Date: 2026-09-12. Status: accepted direction; initial implementation.

The user requested the massive full map from the scale tests after identifying that the first alpha only expanded the isolated country slice. New campaigns use the actual Meridian continent and the same physical separation as the pacing study. Local buildings, soldiers, roads, bridge widths and weapons retain their physical size. The country remains one persistent battlefield; there are no launched encounters or detached battle outcomes.

Generation/version dispatch preserves earlier alpha worlds. A new full-map command must not reinterpret old coordinates or erase earlier keys. The browser retains earlier command keys when starting another campaign.

Provisional implementation: coarse world terrain and settlement pads, seeded town/POI plans outside the detailed headquarters city, bounded forest residency, a fixed initial roster and existing occupation/supply rules. Geography scale is not evidence of a validated unit ceiling or a completed continental economy. Further terrain, strategic AI, recruitment and scheduling work remain explicit in the integration record.
