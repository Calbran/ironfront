# 029 — Grand scale and globally spaced settlements

Status: implemented; scale direction accepted by the user, exact density and travel balance provisional.

The preview at port 5173 is served from D:/ironfront. The Documents/ChatGPT/Ironfront folder is a partial secondary copy. Earlier settlement changes made there were not reaching the running application. Verify the active server source before changing or validating this project.

New geography uses 28,800 × 19,200 world units for four nations, with the same 96 territories and underlying terrain raster. City radii and docks use fixed physical dimensions. Settlement budgets use unexpanded suitable-land area, so four times the displayed land area does not generate four times the cities. Major centers place first, then towns and rural settlements. Borders do not create settlement quotas.

Measured four-nation examples retain sparse global settlement totals and substantial gaps beyond city artwork. Major centers place first, followed by towns and rural settlements; ordinary starting-territory selection is unchanged.

Existing saved geography is retained. New previews/campaigns use version 7. Travel speeds remain unchanged, so longer routes take longer; campaign pacing has not been balance-tested.

Validation: all 119 tests pass; TypeScript checking and the production build pass. Verified the live preview at http://127.0.0.1:5173/ with Boreal and Map-e05fa536 at 244% zoom; the footer reports 28,800 × 19,200. Existing campaigns retain their saved maps.
