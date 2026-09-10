# 008 — Countries, territorial capitals, and visible battles

Date: 2026-09-09

## Accepted owner direction

- A territory can contain multiple cities, with city count related to territory size.
- One city is the capital of its territory. A territorial capital is distinct from the national capital.
- The generated world should read as a continent of countries, rather than a landmass divided into generic zones.
- Squads should appear as small individual dots/icons moving through the landscape, giving the map an aerial view of soldiers.
- Active battles should visibly show movement and firing/bullets while the underlying engagement can last much longer than an ordinary RTS fight. Active engagements should be easy to find.

## Historical implementation boundary

This section described the state when this decision was written. Persistent squads and engagements were implemented later, and independently owned settlements with physical capture are now defined by [decision 022](022-settlement-capture.md). A territorial-capital designation remains unimplemented. Nation.capital still names a territory.

## Historical proposals

Use country -> territory -> city as the geographic hierarchy. Generate settlement suitability and travel corridors before growing administrative territories; establish a territorial capital and group smaller settlements around its reachable hinterland. Compose coherent countries from those territories, with borders influenced by terrain and transport rather than equal geometric partitions. Country identity and current wartime ownership should remain distinct.

Larger habitable territories can support more cities; raw area alone should not put cities in impassable mountains. Exact density is provisional. Secondary cities can support production, supply, and local resistance. Taking a territorial capital should be strategically important, but whether it transfers legal ownership immediately or requires consolidation remains unresolved. Enemy forces should not disappear merely because a capital changes hands.

Keep political borders, occupied cities, contested ground, and actual battle locations visually distinct. An active frontline must be based on opposing forces/engagements rather than assuming all ownership boundaries are fighting.

For an initial presentation model, command armies with standing orders and represent their detachments as moving squad clusters. Server-owned routes and persistent engagement records drive animation; the browser interpolates positions and draws representative bursts of fire. Bullets are visual effects unless a later rule explicitly makes them authoritative projectiles. No firing should be shown for idle armies or merely adjacent nations. Retreat, ceasefire, destruction, and stale/disconnected state must stop or visibly pause the corresponding effects.

The later implementation selected independently positioned, server-simulated squads. Decision 022 supersedes this record's unresolved city-capture discussion.
