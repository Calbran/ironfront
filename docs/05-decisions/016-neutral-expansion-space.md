# 016 — More territories and neutral expansion space

Date: 2026-09-09

## Accepted correction

The owner clarified that grand scale means more territories overall and room for nations to expand before their borders meet. Keeping 32 territories while only enlarging them was the wrong interpretation. This supersedes the territory-count restriction in decision 015.

## Implemented

Version-5 new maps use 24 territories per nation: 48/96/192 for two/four/eight nations. The larger physical dimensions and broad seeded growth variation remain. Every territory receives a short initial growth phase to reduce tiny slivers before variable-speed expansion shapes the surrounding land. Existing connected-contour and mountain-pass rules remain.

Starting ownership is planned for all nations before mutation. Each gets a connected four-region cluster. The planner prefers distant viable clusters with two neutral regions between their borders; it may use one neutral region when the terrain cannot fit the wider buffer. It never silently permits touching national borders. A bounded deterministic search rejects an unplaceable map rather than starting nations on top of each other.

This changes starting density and expansion opportunities, not the campaign timer. Equal region counts do not imply equal starting land area or resources. Economy, travel pace and map fairness remain provisional. Saved campaigns retain their existing geography and ownership; use a new campaign for the extra territories and spacing.

## Verification

Tests cover four connected starting regions per nation, neutral expansion land and two intervening neutral regions in nine two/four/eight-nation fixtures. An additional 20-seed spot check found no touching starts. Geographic regression coverage retains size variation, sliver protection, land connectivity and consistent total area. Desktop/phone browser checks cover new territory counts and preview/campaign agreement.
