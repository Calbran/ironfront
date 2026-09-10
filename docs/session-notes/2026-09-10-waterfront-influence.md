# Local waterfront influence

Kept the accepted smoothed rivers while removing their displacement from the inland perimeter. The transition now changes block depth instead of making the opposite edge echo every bend. Northern street bounds are constrained outside the transition; foundation heights use an inverse corridor lookup.

Regression checks cover fixed inland points, full bank displacement, monotonic mapping and inverse round trips. The 84-case audit is recorded in `docs/prototypes/waterfront-influence-audit-2026-09-10.json`. Browser gallery captures remain in `.impeccable/review/city-seeds/`.
