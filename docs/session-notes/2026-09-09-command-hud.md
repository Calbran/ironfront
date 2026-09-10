# Command HUD — 2026-09-09

Owner requested the mockup's layout without its detailed graphics. Moved resources into the header; replaced the left panel with a collapsible bottom dock and persistent squad strip. Desktop information uses columns; phone movement controls appear before the roster. Retained existing commands, nation/development/dispatch information and session access. Removed sidebar camera offset and reserved actual canvas space above the dock. No simulation changes.

Verified at 1440, 900 and 390px with an isolated browser campaign: resource placement, dock/canvas bounds, selection/Hold, tabs, session and collapse/reopen. Reviewed desktop and phone screenshots and corrected low-contrast roster labels. Screenshots: `.impeccable/review/hud-1440.png` and `hud-390.png`.

Final checks: typecheck and production build pass. HUD browser checks pass at 1440/900/390px; updated movement browser checks pass at 1440/390px for cross-region orders, waypoints, Hold, pointer placement and whole-group commands. Multiple-selection readiness meters show labeled averages. Existing bundle-size advisory remains.

### Compact correction and camera regression

Owner requested no scrolling sections, a much shorter dock, and no full force roster. Replaced the original dock content with `CommandDock`: current selection plus Move/Hold/Details, with paginated secondary information. Desktop height fell from 310px to 94px; phone from 42vh to 138px. The map now fills a fixed viewport behind the overlay, so changing selection does not resize/reposition it.

Typecheck/build and the new compact-HUD browser flow pass. Actual squad clicks, Escape deselection and panel collapse/reopen preserve camera x/y/scale and canvas dimensions at desktop, tablet and phone sizes. Checked no section scrolling, no force list, Hold command and secondary pages; reviewed `.impeccable/review/compact-hud-1440.png`. Previous full-dock browser scripts describe the superseded interface.
