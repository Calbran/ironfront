# Density and camera correction

User reported coarse polygons and insufficient zoom-out in a screenshot, then confirmed the new dense map was laggy and requested substantially fewer territories and a more authentic map.

Implemented default96territories/eight provinces,72–192territories across2–8players; visible restrained overview borders; shared border smoothing; exact legacy polygon fills;35–600%camera range. Static geography bounds and rings are cached; wheel input transforms existing geometry, with detail rebuilt after180ms idle. Existing saves are retained and identified as earlier layouts in the information panel.

All21tests/typecheck/build pass. Default browser fixture:96territories,22mountains,eight provinces,14visualrivers. Camera regression passes anchoring, drag/selection separation, polling persistence and Fit. At1968×1450,100wheel events on192territories produced16.7ms median frame interval,17.1ms95th percentile,17.7ms maximum locally. These measurements are not a guarantee for every GPU or browser.

Fresh independent review of the rejected screenshot and revised desktop/phone views returned ship for density/boundary/camera scope. River paths remain angular; natural cartographic authenticity remains a direction to improve, not a validated user acceptance claim. Largest-player phone overview is denser than the default. DESIGN.md and sidecar were updated through the documenter.
