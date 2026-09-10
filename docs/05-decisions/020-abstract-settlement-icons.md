# 020 — Abstract settlement iconography

## Accepted direction

The owner chose to return to abstract iconography after reviewing detailed city scenes. Settlement identity and map readability take priority over architectural detail.

## Implemented

Compact vector badges replace all authored city scenes at every detailed map zoom. Size ranks use a restrained 8–16 pixel symbol scale. Ports use anchors, industry uses factory symbols, fortified settlements use battlements, and ordinary settlements use dots or house symbols. The first settlement in an owned national-capital region receives a small star to identify the capital seat. Strategy overview still hides settlement details according to the existing zoom rules.

Selection, hover labels, ownership context, saved settlement coordinates, and authoritative garrison orders remain. The city-art loading and ambient animation path is removed, including airships, smoke, and trains. Terrain imagery and unit rendering are unchanged. Scenery clearings around settlements are compact rather than matching the former illustrated footprint.

Prior generated artwork and scene/planning modules are retained as unused source material, not deleted or loaded by the map. This decision supersedes the authored scene presentation in decision 019.

## Label hierarchy

The owner requested less on-screen text. Routine territory names are hidden except for the selected territory. Capital seats retain names; major city names appear from 400% zoom, town names from 800%. Smaller places use icons, with names available on hover/selection. Ordinary labels are budgeted by viewport area and spaced farther apart. Settlement selection suppresses duplicate territory labeling. Strategy nation labels and the broad province overview remain.

## Readability refinement

The owner found the smallest symbols invisible and size-only distinctions insufficient. All settlement badges now share a readable 24-pixel width. One to five filled tier slots distinguish hamlet, village, town, city, and metropolis; the main glyph identifies type and the star identifies a capital seat. Hover and the legend explain the tier scale. Labels use at least 14 logical screen pixels, device-aware raster resolution, and steady inverse camera scaling during zoom. Thin outlines and sans-serif province names replace the jagged small outlined serif text.
