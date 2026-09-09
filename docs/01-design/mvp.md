# Proof and MVP

## First proof

Generate → create/join campaign → choose faction → inspect regions → queue a building → issue a persistent army objective → resolve travel/combat → capture land → reconnect and read dispatches.

4–8 players is the initial playtest target; the proof accepts 2–8 seats. Empty seats use a deliberately simple automated opponent and can be claimed. One army per nation bounds the first experiment. The proof includes infantry/artillery/armor composition, a fuel-consuming air-support toggle, four buildings, and area victory.

## Full MVP after the proof

Account recovery, private/public lobbies, ready/start lifecycle, balanced starts, multiple armies and recruitment, fuller logistics/retreat, real aircraft basing and missions, construction queues, research, durable since-last-visit reports, reliable hosted database, and measured month-scale pacing.

## Explicit exclusions from this slice

Diplomacy, alliances, fog, naval combat, detailed tactical battles, custom faction art, research, recruitment UI, actual air vehicles/airfields, push/email notifications, matchmaking, account recovery, PostgreSQL migration, advanced anti-cheat, and deployment on the home PC. The local proof is not public-launch ready.

## Acceptance

Two independent browser identities can join the same campaign and only command their own nation. Orders and construction persist across a server restart. Simulation continues without browsers. Duplicate scheduler calls cannot double-apply an hour. Areas sum to the continent, terrain stays connected, and no economic resource goes negative. Commands are rejected once the campaign ends.
