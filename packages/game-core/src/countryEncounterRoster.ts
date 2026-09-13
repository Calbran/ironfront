/** Scenario roster is shared by authority and presentation; IDs are save-stable. */
export const countryEncounterRoster: {
  id: number;
  kind: "infantry" | "tank" | "airship";
  name: string;
  enemy: boolean;
  antiTank?: boolean;
  pocket: number;
}[] = [
  { id: 1, kind: "infantry", name: "1st Rifles", enemy: false, pocket: 0 },
  {
    id: 2,
    kind: "infantry",
    name: "AT squad",
    enemy: false,
    antiTank: true,
    pocket: 0,
  },
  { id: 3, kind: "tank", name: "Landship", enemy: false, pocket: 0 },
  { id: 4, kind: "airship", name: "Scout airship", enemy: false, pocket: 0 },
  { id: 5, kind: "infantry", name: "Bridge rifles", enemy: true, pocket: 0 },
  { id: 6, kind: "infantry", name: "Bridge support", enemy: true, pocket: 0 },
  {
    id: 7,
    kind: "infantry",
    name: "Outpost AT",
    enemy: true,
    antiTank: true,
    pocket: 1,
  },
  { id: 8, kind: "tank", name: "Outpost tank", enemy: true, pocket: 1 },
  { id: 9, kind: "infantry", name: "Reserve rifles", enemy: true, pocket: 2 },
  {
    id: 10,
    kind: "infantry",
    name: "Reserve AT",
    enemy: true,
    antiTank: true,
    pocket: 2,
  },
  { id: 11, kind: "tank", name: "Reserve tank", enemy: true, pocket: 2 },
  {
    id: 12,
    kind: "infantry",
    name: "Roadblock rifles",
    enemy: true,
    pocket: 3,
  },
  {
    id: 13,
    kind: "infantry",
    name: "Roadblock support",
    enemy: true,
    pocket: 3,
  },
  { id: 14, kind: "tank", name: "Roadblock tank", enemy: true, pocket: 3 },
  {
    id: 15,
    kind: "infantry",
    name: "Roadblock AT",
    enemy: true,
    antiTank: true,
    pocket: 3,
  },
] satisfies {
  id: number;
  kind: "infantry" | "tank" | "airship";
  name: string;
  enemy: boolean;
  antiTank?: boolean;
  pocket: number;
}[];
