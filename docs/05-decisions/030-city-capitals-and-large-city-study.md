# 030 — City capitals and a large-city diorama

## Accepted direction

The user requested one sample town/city diorama near the upper end of generated settlement size, with units present to establish scale. They want every town/city to have a capital building responsible for capture and ownership. Establish city proportions before expanding the continent. Preserve existing assets and the experimental branch separation.

## Implemented in the experiment

`/city-diorama.html` presents a 160-building candidate (including the capital), residential blocks, market frontages, workshops, civic square, depot yard, river-edge bridge, 144 static infantry scale figures and two jeeps. The capital is a prominent civic hall/clock-tower model. City/capital/depot/street presets preserve the fixed isometric angle. Density controls and repeatable benchmarks cover 128–1,024 buildings using shared instanced models.

## Provisional and unresolved

160 buildings is a working sample, not an accepted largest-city cap. A 160–256-building design budget is a recommendation pending art and hardware review. The model kit, block proportions, road widths and capital architecture remain subject to visual feedback.

The capital's capture role is accepted direction but is not implemented in this visual study. Capture duration, contest rules, garrison behavior, capital relocation/destruction and the relationship between multiple settlement capitals and one region's ownership remain unresolved. Existing server capture rules and saves are unchanged. Land owned remains the default victory measure; this direction does not introduce weighted objective scoring.

Nearby city spacing may reduce simultaneous detail, but renderer visibility and LOD must handle multiple settlements in overview views. A one-city rendering assumption is not a production constraint. Performance results for repeated models and static troops do not establish a live-combat or minimum-device guarantee.
