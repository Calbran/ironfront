# 014 — Map-centered command HUD

Date: 2026-09-09

## Accepted direction

Use the mockup's information hierarchy with simple graphics: resources across the top, the map in the center, and selection information/actions along the bottom. Readability and functional controls take priority over detailed artwork.

## Implemented

Industry, fuel and manpower remain visible beside campaign time and session access. A collapsible bottom dock replaces the left sidebar. Its persistent force strip selects and focuses living friendly squads; Shift adds to selection. Nation, Command and Dispatches tabs preserve their existing functions. Command information places squad membership, health/morale, movement controls and group support beside each other on desktop. Phones stack controls first and scroll the dock independently.

The canvas uses the remaining space between the header and dock. Fit/focus no longer offset for a left sidebar. Dark charcoal panels, ivory labels and restrained brass selection borders improve contrast without generated artwork. Existing simulation and command authority are unchanged.

## Verification

Isolated browser checks cover resource placement, map/dock non-overlap, force selection, Hold submission, tab changes, session access and collapse/reopen at desktop, tablet and phone widths. Movement browser coverage uses the updated centered camera layout. Resource values and meters are live state, not decorative placeholders.

## Owner correction — compact selection only

The owner rejected scrolling sections, the large dock, and the persistent “Your forces” list. These supersede the initial implementation above. The dock is now a 94px desktop / 138px phone selection strip with name, health/morale, current status, Move/Hold and Details. No roster is rendered. Nation information, reports, regional development and squad settings open in separate dialogs with explicit Previous/Next pages for longer collections; sections do not scroll.

Selection/deselection must not move the camera. The dock overlays a fixed-size map instead of resizing the renderer when opened or closed. Only deliberate camera actions (pan, zoom, Fit, Show on map) reposition the view. Browser regression checks compare the exact camera transform, scale and viewport dimensions before and after real unit selection, Escape deselection and panel collapse/reopen.
