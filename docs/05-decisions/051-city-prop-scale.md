# City prop scale

## Accepted direction

Use the existing city infantry as the common reference and correct oversized furniture, particularly benches and the town-hall boundary. Do not enlarge soldiers to compensate for oversized props.

## Implemented

Shared scene-space dimensions in `cityPropScale.ts` set seating and civic wall/pillar sizes, with per-item placement scales for street equipment. Rendered civic widths also drive navigation obstacles. The full audit is in [city prop scale](../06-art/city-prop-scale.md). Buildings and landscape are reviewed by their function; furniture proportions are measured against the 0.55-scale infantry rig.

## Provisional

Exact dimensions remain visual tuning. This does not establish real-world units for campaign distances or complete decorative-prop collision. Existing incomplete hull/prop collision and faction balance are outside this pass.
