# Distant city unit markers

Added DOM/SVG unit badges to the local diorama trial, visible through buildings and independent of scene draw calls. Fade uses projected world scale instead of camera distance alone, so both orthographic planning and perspective street modes behave consistently. A bounded slot search separates the five trial units with leader lines back to projected positions. Selection is cyan/gold; click selects, Shift-click adds, double-click focuses. Offscreen and behind-camera units are hidden. Overlay cleanup occurs on trial disposal/regeneration.

Browser reviewed full-city seed 732: five readable overview badges, tank selection reflected in gold, Street View focuses the tank and hides close-range badges. Two pure regression tests cover projection/fade/culling and collision-free badge slots. Typecheck passes. This does not implement campaign fog-of-war or aggregate markers for large armies; those require integration with campaign visibility rules.
