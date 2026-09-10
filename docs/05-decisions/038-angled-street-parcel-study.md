# 038 — Angled street parcel study

## Accepted direction

The user authorized an angled main street, short side streets, irregular corner plots and deliberate courtyard/yard space before terrain fitting.

## Implemented

A separate Angled streets option in the city diorama retains the crafted civic neighborhood and connects its rear street to six convex parcels. A diagonal boulevard and two seeded side-street positions produce triangular and trapezoid blocks. Buildings follow parcel edges at fixed model scale. Full attachment envelopes must fit inside the parcel, clear all streets and other lots, and leave frontage paths unobstructed. Unsuitable corner candidates are omitted instead of stretched. Building count is the fit result, displayed separately from the disabled regular city budget selector.

Inset polygon paving follows each parcel. Larger interiors have inset garden polygons with edging, benches and selected trees; narrow tips stay paved. The shared shallow urban kit, instancing and detail tiers are reused. Vary blocks shifts the cross streets and replans the geometry deterministically.

## Provisional and future

This is a bounded, flat street-first study, not a general street-network generator or terrain integration. It does not alter campaign authority, navigation, capture or city population. Street widths, setbacks, planting and density are art tuning awaiting review. Concave parcels, terrain grades, river corridors and world rollout remain future work.
