# City vision
Implemented shared friendly LOS, separate player snapshots and hidden target rejection. Enemy models, markers, picking and counts use visibility. The raw simulation state remains internal for tests; all three API state responses use the filtered view. Added deterministic tests for range, shared observers, dead observers, building blocking, low walls, hidden commands and enemy route redaction.

Validation: 205 regression tests passed; typecheck and build passed. Browser confirmed the connected battle and visible-enemy count. The current staged starting positions put all six enemies within shared sight, so they remain visible initially; deterministic tests exercise loss of sight and occlusion.
