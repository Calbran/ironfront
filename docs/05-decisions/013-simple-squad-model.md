# 013 — Simple squad model

Date: 2026-09-09

## Accepted owner direction

- The squad is the commandable unit. Its assigned soldiers or vehicles stay with it; players do not manage individuals or reassign crew/passengers.
- Multiple squads may be selected together to receive collective orders. A group is a command convenience, not a mandatory mixed army composition.
- Mobile squads remain in their vehicles and perform the support role appropriate to their type. There are no embarking, dismounting or transport-management states.
- Squads have their own health and can be ordered independently. No individual-soldier micromanagement is required.

This supersedes the proposed motorized-infantry transport/dismount hierarchy. Jeep/Humvee was an analogy, not an approved asset or mandatory transport mechanic.

## Defined roles

Infantry squads: assigned foot soldiers. Mobile support squads: mounted light fighting vehicles. Armor squads: armored direct-fire units. Artillery squads: long-range support and suppression. Groups can combine these without changing membership.

## Current implementation and remaining work

Existing persistent squad IDs, strength/capacity, fixed role, independent local orders and shared squad commands provide the first part of this model. The squad panel now uses explicit role names/descriptions and normalized health rather than unlabeled strength numbers. Mobile vehicle rendering already stays mounted; no dismount system is added.

The legacy parent Army still provides campaign travel, logistics and aggregate composition; its orders can supersede local squad orders. Removing that mandatory parent relationship and its mixed-army management remains a separate migration, not something the UI wording completes. Squad strength is aggregate health; individual per-vehicle damage and fixed visible unit rosters are not implemented. Do not present either as shipped.

## Starting roster implemented

Owner specified two infantry squads of about six soldiers and one mobile infantry squad of two vehicles per nation. New campaigns now instantiate exactly that roster at each capital. Each underlying campaign formation has one squad, with explicit 6/6/2 assigned unit counts and its own 100-point health. These counts drive representative rendering and remain stable as squad health changes. No extra tanks/artillery are spawned. Existing campaigns retain their forces and orders rather than collapsing active units. The internal campaign-formation compatibility layer remains, now one-to-one for new starting squads.

## Vehicle facing profiles — 2026-09-09

Owner requested wheels that steer through arcs, tracks that pivot before advancing, omnidirectional spider-like walkers with independently rotating upper bodies, and fixed-body walkers that must face travel. Implemented reusable `wheeled`, `tracked`, `walker-turret`, and `walker-fixed` presentation profiles. Current mobile squads default to wheels; armor defaults to tracks. An optional persisted squad `vehicleProfile` supports future unit definitions and old saves use defaults. Walkers are supported profiles and placeholder silhouettes, not newly recruitable units.

Each rendered vehicle keeps its own body and upper-body heading, with a small deterministic turn-rate variation. Body noses, wheels/tracks/legs and turret barrels communicate facing. No idle wander is added. This is presentation over authoritative squad snapshots: server paths, weapon range, damage, and travel time remain unchanged. Physical turning costs, per-vehicle pathfinding and gait simulation are not implemented; tuning is provisional.
