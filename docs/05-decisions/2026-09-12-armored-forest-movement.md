# Armored movement through forests

Accepted 2026-09-12: tanks may move through forests, but woodland density slows them instead of making every tree a collider.

In the playable country sector, forestVehicleMovement.ts samples the same broad woodland field and clearing noise that places visible trees. Tank speed ranges from 72% at a sparse woodland edge to 35% in dense woodland. Developed-site clearings remain unrestricted and road corridors retain 90% speed. Infantry and air movement are unchanged. Two-unit integration spans prevent long offline updates from crossing a forest at the speed sampled outside it.

At campaign scale, armor squads move at 40% local speed in forest regions. A fueled mobile army still crosses friendly plains in two hours, but forest traversal takes four hours; highlands remain six. Forests already reduce armor combat effectiveness and improve friendly defense.

These values are provisional. Individual trunks remain cosmetic for movement, and the route planner does not yet prefer roads using travel time; orders remain valid through woodland and the speed effect is applied during execution.
