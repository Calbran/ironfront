# 048 — Varied city parcels and steampunk kit

## Accepted direction

Replace the inherited dock beside the town hall with developed city blocks. Vary street bearings and block sizes, retain a legible civic square, and restore full camera rotation. Expand the procedural kit using the user's Victorian/steampunk references while keeping geometry and draw calls bounded.

## Implemented in the visual study

Full-city plans omit the authored canal, factories and dock reservation. Their civic lot count is explicit rather than assuming every study retains 27 lots. Shared seeded junction offsets introduce gentle street angles without gaps; occasional diagonal streets split outer blocks. The old dock terrace is flattened into the civic ground level, while the northern river fitting retains its height profile. The square varies between planted monument, fountain and more open terrace arrangements. The town hall stays central and its paths remain clear.

Left drag rotates around the city without an azimuth limit; right/middle drag pans, scrolling zooms. Elevation is bounded above ground. Named views reset the camera to a useful angle.

The kit adds 19 models: four towers (copper, clock, iron-braced, stepped crown); five frontage buildings (mansard, gabled, arcade, copper cupola, balcony); three industrial/workshop models; two derelict cars; kiosk, street clock, hydrant, bollard and boiler accents. Buildings use existing envelope families and seeded district selection. Street props use final road bearings, avoid entrances/intersections/buildings, and are capped at 18 cars and 60 accents per full city.

Meshes and materials are shared and instanced by variant/material. Low-detail geometry drops small trim and windows; tiny street details disappear in the distant tier. Props have no animations or dynamic lights. The library's models remain rectangular; polygonal wedge footprints are not yet implemented.

## Limits

These are visual assets, not authoritative cover, vehicle obstructions or construction mechanics. Block proportions and art placement remain provisional. Models have not been validated as damaged/destructible building states. Performance measurements are local, not a guarantee for every laptop.

## Street surfaces and keyboard navigation

Carriageways now use a shared fine-grain dark surface and arc-length-spaced dashed center markings. Sidewalks and alleys retain paving; junctions and bridges omit lane markings. WASD pans relative to the current camera direction, with zoom-adjusted speed and normalized diagonal motion. Typing controls and browser shortcut modifiers are excluded; losing focus clears held movement keys.
