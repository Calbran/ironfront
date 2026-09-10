# Smoothed city river bends

The worldgen city adapter now rounds the source drainage polyline before fitting buildings and rendering the corridor. Three corner-cutting passes preserve endpoints and keep samples inside the source convex hull. Original reach coordinates remain available for provenance. Binary lookup keeps repeated surface sampling inexpensive.

Validation checks corner-angle reduction, endpoint preservation, monotonic corridor progress and determinism, plus existing source fidelity and geometry checks. Gallery browser captures remain under `.impeccable/review/city-seeds/`; the expanded audit is stored as `docs/prototypes/smoothed-river-audit-2026-09-10.json`.
