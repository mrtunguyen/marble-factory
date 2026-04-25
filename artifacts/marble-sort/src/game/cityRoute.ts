export interface CityNode {
  id: number;      // unique city id (matches levelId)
  name: string;    // display name
  levelId: number;
  x: number;       // position on the 540×900 map canvas
  y: number;
}

// Five cities winding bottom→top on the map canvas (540×900).
// Coordinates are tuned to feel like a road-trip route.
export const CITY_ROUTE: CityNode[] = [
  { id: 1, name: "Trickle Town",   levelId: 1, x: 130, y: 760 },
  { id: 2, name: "Mystery Mesa",   levelId: 2, x: 370, y: 620 },
  { id: 3, name: "Counter Cliffs", levelId: 3, x: 160, y: 480 },
  { id: 4, name: "Lock Ridge",     levelId: 4, x: 390, y: 330 },
  { id: 5, name: "Summit Sort",    levelId: 5, x: 220, y: 180 },
];
