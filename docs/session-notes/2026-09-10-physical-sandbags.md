# Physical sandbags and group pacing
Moved sandbag placement/removal to battle commands and snapshots. Dynamic tactical buckets and fire visibility rebuild on changes. Infantry uses sandbags as collision and directional cover; tank pathfinding permits built sandbags and tank hull contact removes them. Other build items remain visual prototypes. Existing infantry routes stop if newly obstructed. Group speed caps include firing penalties and tank acceleration/turning. Individual move orders detach from groups.
Focused tests verify collision, cover, removal by crushing, firing speed penalties, equal mixed-unit speeds and tank pivot waits. Browser confirmed authoritative sandbag placement in the courtyard. Typecheck and build passed.

Final regression suite: 227 passed.
