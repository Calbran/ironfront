import type { Squad } from "./tactics.ts";
export type FirePoint = { x: number; y: number };
export type FireObstacle = {
  id: string;
  polygon: FirePoint[];
  exposure: number;
};
export const FIRE_STEP = 1 / 40; // Campaign hours; independent of wall-clock polling.
export type FireMemory = { seed: number; rounds: number; reload: number };
const profiles = {
  infantry: { armor: 0.005, soft: 1, magazine: 8, reload: 3 },
  garrison: { armor: 0.005, soft: 1, magazine: 8, reload: 3 },
  motorized: { armor: 0.025, soft: 1.1, magazine: 12, reload: 4 },
  armor: { armor: 1, soft: 1.35, magazine: 1, reload: 3 },
  artillery: { armor: 0.45, soft: 1.5, magazine: 1, reload: 5 },
} as const;
export const weaponEffectiveness = (
  kind: Squad["kind"],
  target: Squad["kind"],
) => (target === "armor" ? profiles[kind].armor : profiles[kind].soft);
function hash(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++)
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}
function roll(m: FireMemory) {
  let x = m.seed || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  m.seed = x >>> 0;
  return m.seed / 4294967296;
}
/** Seed, magazine and reload state are saved with the squad, never with a viewer. */
export function fireVolley(
  s: Squad,
  d: Squad,
  distance: number,
  range: number,
  exposure: number,
  multiplier: number,
) {
  const m = (s.fireMemory ??= { seed: hash(s.id), rounds: 0, reload: 0 });
  if (m.reload > 0) {
    m.reload--;
    return { damage: 0, rawDamage: 0, suppression: 0, fired: false };
  }
  if (s.strength <= 0 || d.strength <= 0 || distance > range || exposure <= 0)
    return { damage: 0, rawDamage: 0, suppression: 0, fired: false };
  const p = profiles[s.kind],
    shooters = Math.max(
      1,
      Math.ceil(
        (s.unitCount ?? 6) * Math.min(1, s.strength / Math.max(1, s.capacity)),
      ),
    );
  const moving = !!s.localOrder?.path.length;
  const chance = Math.max(
    0.02,
    Math.min(
      0.95,
      0.8 *
        (1 - 0.55 * Math.min(1, distance / range)) *
        (moving ? 0.55 : 1) *
        (1 - 0.7 * s.suppression) *
        exposure,
    ),
  );
  let hits = 0;
  for (let i = 0; i < shooters; i++) if (roll(m) < chance) hits++;
  m.rounds++;
  if (m.rounds >= p.magazine) {
    m.rounds = 0;
    m.reload = p.reload;
  }
  const effectiveness = d.kind === "armor" ? p.armor : p.soft;
  // Compensation keeps the existing campaign-scale firepower near its former baseline.
  const perHit =
    ((s.strength * 0.42 * FIRE_STEP) / (shooters * 0.6)) *
    (1 + p.reload / p.magazine);
  return {
    rawDamage: hits * perHit * multiplier,
    damage: hits * perHit * effectiveness * multiplier,
    suppression:
      ((shooters * perHit * 0.6) / 65) *
      (d.kind === "armor" && p.armor < 0.1 ? 0.05 : 1),
    fired: true,
  };
}
function intersects(a: FirePoint, b: FirePoint, poly: FirePoint[]) {
  const contains = (p: FirePoint) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const x = poly[i],
        y = poly[j];
      if (
        x.y > p.y !== y.y > p.y &&
        p.x < ((y.x - x.x) * (p.y - x.y)) / (y.y - x.y) + x.x
      )
        inside = !inside;
    }
    return inside;
  };
  if (contains(a) || contains(b)) return true;
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i],
      d = poly[(i + 1) % poly.length],
      rx = b.x - a.x,
      ry = b.y - a.y,
      sx = d.x - c.x,
      sy = d.y - c.y,
      det = rx * sy - ry * sx;
    if (Math.abs(det) < 1e-10) continue;
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / det,
      u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / det;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}
/** Rebuilt per exchange; queries inspect nearby buckets, never sort all enemies. */
export class FireIndex {
  private cells = new Map<string, Squad[]>();
  private ids = new Map<string, Squad>();
  constructor(
    units: Squad[],
    private size: number,
  ) {
    for (const s of units) {
      this.ids.set(s.id, s);
      const key = this.key(s);
      const cell = this.cells.get(key) ?? [];
      cell.push(s);
      this.cells.set(key, cell);
    }
  }
  private key(p: FirePoint) {
    return `${Math.floor(p.x / this.size)},${Math.floor(p.y / this.size)}`;
  }
  target(s: Squad, range: number, exposure: (a: Squad, b: Squad) => number) {
    const valid = (d: Squad | undefined) =>
      d &&
      d.owner !== s.owner &&
      d.strength > 0 &&
      Math.hypot(d.x - s.x, d.y - s.y) <= range &&
      exposure(s, d) > 0;
    const ordered = this.ids.get(s.localOrder?.attackTarget ?? "");
    if (valid(ordered)) return ordered;
    const retained = this.ids.get(s.target ?? "");
    if (valid(retained)) return retained;
    let best: Squad | undefined,
      dist = Infinity;
    for (
      let x = Math.floor((s.x - range) / this.size);
      x <= Math.floor((s.x + range) / this.size);
      x++
    )
      for (
        let y = Math.floor((s.y - range) / this.size);
        y <= Math.floor((s.y + range) / this.size);
        y++
      )
        for (const d of this.cells.get(`${x},${y}`) ?? []) {
          if (d.owner === s.owner || d.strength <= 0) continue;
          const n = Math.hypot(d.x - s.x, d.y - s.y);
          if (
            n <= range &&
            (n < dist || (n === dist && d.id < (best?.id ?? ""))) &&
            exposure(s, d) > 0
          ) {
            best = d;
            dist = n;
          }
        }
    return best;
  }
}
/** Exact endpoint caching: movement cannot reuse an obsolete clear shot around a corner. */
export class FireVisibility {
  private cache = new Map<
    string,
    { ax: number; ay: number; bx: number; by: number; value: number }
  >();
  private cells = new Map<string, FireObstacle[]>();
  constructor(
    obstacles: FireObstacle[],
    private size = 100,
  ) {
    for (const o of obstacles) {
      if (!o.polygon.length) continue;
      const xs = o.polygon.map((p) => p.x),
        ys = o.polygon.map((p) => p.y);
      for (
        let x = Math.floor(Math.min(...xs) / size);
        x <= Math.floor(Math.max(...xs) / size);
        x++
      )
        for (
          let y = Math.floor(Math.min(...ys) / size);
          y <= Math.floor(Math.max(...ys) / size);
          y++
        ) {
          const key = `${x},${y}`,
            cell = this.cells.get(key) ?? [];
          cell.push(o);
          this.cells.set(key, cell);
        }
    }
  }
  exposure(a: Squad, b: Squad) {
    const key = `${a.id}:${b.id}`,
      old = this.cache.get(key);
    if (
      old &&
      old.ax === a.x &&
      old.ay === a.y &&
      old.bx === b.x &&
      old.by === b.y
    )
      return old.value;
    let value = 1;
    const seen = new Set<FireObstacle>();
    for (
      let x = Math.floor(Math.min(a.x, b.x) / this.size);
      x <= Math.floor(Math.max(a.x, b.x) / this.size);
      x++
    )
      for (
        let y = Math.floor(Math.min(a.y, b.y) / this.size);
        y <= Math.floor(Math.max(a.y, b.y) / this.size);
        y++
      )
        for (const o of this.cells.get(`${x},${y}`) ?? []) {
          if (seen.has(o)) continue;
          seen.add(o);
          if (intersects(a, b, o.polygon)) value = Math.min(value, o.exposure);
        }
    if (this.cache.size > 4096) this.cache.clear();
    this.cache.set(key, { ax: a.x, ay: a.y, bx: b.x, by: b.y, value });
    return value;
  }
}
