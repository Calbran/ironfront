# Tank steering and off-road routing

Removed the city vehicle road/plaza whitelist; physical obstacles, planted civic beds, water, bounds and slope checks remain. Shared vehicle routing simplifies lattice steps and rounds corners only when each sampled curve segment clears the existing vehicle radius. The country sector applies this to complete tank routes, including off-road portions. Gentle heading corrections occur during movement; sharper changes retain bounded tread pivots. New routes use this behavior without rewriting saved queues.

Validation: all 290 tests passed with bounded concurrency. Typecheck and build passed. Focused checks cover off-road destinations, protected city obstacles, safe corner smoothing, simultaneous steering and translation, polling cadence independence, and persisted sector routes. Browser confirmed the updated sector loads. Visual driving feel and the 0.25-radian steering threshold/six-unit corner cut remain provisional.
