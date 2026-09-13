# Local squad support — first pass

Accepted direction: units should help nearby engaged allies and react as squads while players are offline. Explicit orders still take priority. Implementation tuning below is provisional.

`packages/game-core/src/tacticalSupport.ts` owns the policy. Country encounters and city battles adapt their real line-of-sight, weapon ranges and collision queries into it. Country stores support memory with squad state; its deterministic encounter steps run the same policy during online and offline advancement.

- A contact must be within 60 world units and visible to a living member of the reacting squad. Nearby allies within 45 units must have that enemy within their own clear firing range; an engaged member of the same squad also qualifies.
- The squad shares the contact. Members already able to shoot stay; others try short, clear approaches for a firing angle. Individual range and line of sight still gate damage. This does not grant shots through walls or require synchronized firing.
- Support is limited to 32 units from its initial anchor. Each approach is at most 10 units. Blocked approaches are skipped; there is no expensive long-distance path search, flanking planner or map-wide pursuit.
- Two groups may decide per simulation update, with staggered 1.5–1.9 second reconsideration. Hold and unfinished explicit routes take priority. New commands clear support ownership and its anchor. Local cover reactions retain autonomy ownership.
- Losing the visible contact cancels support routes on the next decision. Dead members never move. Airships do not participate in this first pass.

`countryEncounterRoster.ts` is the common authority/presentation roster. It retains the original friendly force and stages four enemy pockets along the bridge-to-outpost corridor: bridge rifles, outpost AT/tank, mixed reserves, and a mixed roadblock. There are eight enemy infantry squads (three with an AT specialist) and three enemy tanks. Each infantry squad has six independently simulated members. Models, markers, audio and effects consume the shared roster and tactical presenter.

`Restage encounter` deliberately replaces an active review scenario with fresh troops. `Restart encounter` remains available after victory/defeat. Both start paused and focus the friendly rifle squad. This is a test scenario, not balanced campaign opposition.

Remaining work: tactical fog/knowledge is not unified across the campaign; this policy uses actual LOS for its decisions but does not implement a new UI visibility system. Large-scale spatial indexing, broader flanking/path planning, morale retreats and role-specific target doctrine remain separate work.
