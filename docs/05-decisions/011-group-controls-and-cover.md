# 011 — Group controls and cover

Date: 2026-09-09

## Accepted direction

The owner requested drag selection of multiple units, contextual right-click cover orders, WASD camera panning, Escape deselection, selection-specific context panels, and smaller standard soldiers.

## Implemented

- Mouse left-drag boxes friendly armies; Shift-drag adds to the group. Multiple representative squads belonging to one army select that army once. Right/middle drag and touch drag pan. Strategic overview has no visible units to box-select.
- Right-click applies orders to each selected army through existing authenticated commands. Failures are reported per army, successful orders remain; this is not an atomic group transaction.
- Right-click a friendly settlement at detail zoom, or a fort marker, for a contextual Take cover / Move-or-hold menu. Cover orders persist, route through friendly land if necessary, then move squads to the site. New movement/hold/recovery orders clear the cover assignment.
- Living squads near their assigned site gain a provisional 1.3 defensive divisor against ground fire, in addition to existing terrain/fort/entrenchment. They hold the site instead of chasing out-of-range enemies. Cover disappears if the site is lost. Enemy cover orders are private.
- WASD pans while not editing form fields; Escape cancels the menu and selection and closes the panel. The panel shows region details, one army's controls, or a selected group summary.
- Infantry/garrison glyph radius reduced from 1.4 to 0.8 at the existing reference scale. Vehicle/artillery sizes and forgiving selection targets remain.

## Limits

Selection commands armies through their representative squads; independent squad commands are not introduced. Settlement cover means defensive positions around a settlement, not simulated interiors or building occupancy. Sandbag/trench objects, placement, capacity, destructibility, and dedicated cover animations remain unimplemented. Movement remains region-based for long journeys. Smaller glyphs change visual scale, not simulation precision. Cover balance is provisional.
