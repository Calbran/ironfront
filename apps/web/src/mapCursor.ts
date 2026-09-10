const cursor = (shape: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke="#142e38" stroke-width="4">${shape}</g><g fill="none" stroke="#eaf5df" stroke-width="1.5">${shape}</g></svg>`)}") 16 16, crosshair`;
export const REGION_CURSOR = cursor(
  '<path d="M16 4L28 16L16 28L4 16Z"/><path d="M12 16h8m-4-4v8"/>',
);
export const UNIT_CURSOR = cursor(
  '<path d="M5 11V5h6m10 0h6v6M5 21v6h6m10 0h6v-6"/><path d="M11 11l10 10m0-10L11 21"/>',
);
export const ATTACK_CURSOR = cursor(
  '<circle cx="16" cy="16" r="8"/><path d="M16 2v9m0 10v9M2 16h9m10 0h9M13 13l6 6m0-6l-6 6"/>',
);
