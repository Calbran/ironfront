# Combined river and terrain study

Added a selectable combined river-relative coordinate system and 2D hill profile. Quays, roads, bridge approaches and subdivided developed surfaces follow the same bend. Building instances retain rigid geometry and receive transformed poses; rejected candidates fail bank, street, overlap, relief or entrance checks. Level foundation heights come from transformed footprint samples. Corrected seed regeneration to retain combined mode, and transformed smoke sources with their buildings.

Validation covers four deterministic seeds, fitted/rejected accounting, rigid envelope separation, entrance clearance and supported foundation samples. Browser flow exercises mode switching, seed changes, waterfront close view, winter/dusk and phone layout. Captures: .impeccable/review/combined-district. Reviewed the close waterfront image. This remains a controlled corridor model, with arbitrary world terrain and new street-routing decisions still ahead.
