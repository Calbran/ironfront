# 028 — Eight-direction port-town artwork

Status: accepted, 2026-09-10.

## Decision

Port presentation uses one 4 × 2 genuine-alpha atlas containing separately authored views of the same industrial harbor town. The generated bitmap's actual frame order is S, SE, E, NE / N, NW, W, SW, so code maps logical N, NE, E, SE, S, SW, W, NW directions to verified frame indexes rather than trusting prompt order. The renderer samples open water around the settlement across several radii and nearby angles; the layout dock is a fallback only. A bounded residual rotation of at most 22.5 degrees follows the local shoreline curve without visibly spinning an oblique illustration through a large angle.

This decision is presentation-only. Port availability remains an outcome of ordinary settlement placement and the existing shoreline/dock qualification. It does not require one port per nation or alter starting territories.

## Consequences

Ports read correctly on any side of a coastline and reuse a nearby authored perspective. Existing campaigns receive the art on refresh wherever a settlement already qualifies as a port. The eight-view atlas costs more texture memory than one rotatable sprite but avoids obviously incorrect building perspective and lighting.


### 2026-09-10 — Harbor shoreline attachment

Port artwork and its badge now anchor to the nearest rendered coastline edge around the validated dock. Internal territory borders are excluded. A short approach joins the saved settlement location to the compact harbor; gameplay locations remain unchanged. The coastline normal selects the view, with corrected diagonal atlas mapping N/NE/E/SE/S/SW/W/NW = 4/7/2/3/0/1/6/5. All eight orientations were visually checked against shoreline fixtures. Settlement tests, typecheck and build pass. Existing campaigns update on refresh.
