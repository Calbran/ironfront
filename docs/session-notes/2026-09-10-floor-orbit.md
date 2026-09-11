# Floor orbit clarification

The requested exclusion was building surfaces, not floor anchoring. Middle-drag now uses the existing terrain height-field picker, which does not raycast roofs or walls. A missed floor intersection falls back to the current view focus. Right-drag terrain orders are unchanged. Updated control help to describe this behavior.
