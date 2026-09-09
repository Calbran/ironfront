# 004 — Ironfront and continental terrain

Date: 2026-09-09. Status: accepted direction; implementation and tuning provisional.

The game is named **Ironfront**. The map should read as a continent rather than a small board: a detailed coastline, broad terrain features, many local territories, and administrative province names visible at wider scales.

Forests and plains are basic terrain. Impassable mountain territories remain outside national ownership and the land-conquest denominator. Passable connections must remain so mountain placement cannot make the majority objective unreachable. Key-zone scoring remains outside the default mode.

The proof implements this with deterministic raster geography and a finer territory graph, rendered as procedural terrain beneath ownership and military overlays. Existing campaign geometry is preserved; newly created campaigns use the new generator. See the [geography contract](../02-systems/continental-geography.md) for exact current behavior and limitations.
