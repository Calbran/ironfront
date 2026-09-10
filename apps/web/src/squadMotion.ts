import type { Squad } from "../../../packages/game-core/src/tactics";
import { vehicleProfile } from "../../../packages/game-core/src/vehicleTypes";
import { stepVehicle, type VehiclePose } from "./vehicleMotion";
type Point = { x: number; y: number };
const hash = (id: string) =>
  [...id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** Follow confirmed snapshots continuously; never restart from a server's previous tick. */
export class SquadMotion {
  private centers = new Map<string, Point & { region: number }>();
  private soldiers = new Map<string, Point>();
  private vehicles = new Map<string, VehiclePose>();
  private revision = -1;
  private received = 0;
  private frame = 0;
  private cadence = 3000;

  update(
    squads: Squad[],
    revision: number,
    now: number,
    scale: number,
    reduced = false,
    resync = false,
    detailSquads?: ReadonlySet<string>,
  ) {
    // A suspended tab or stale connection has no animation history to replay.
    const snap =
      resync ||
      (this.frame > 0 && now - this.frame > 1500) ||
      (this.revision >= 0 &&
        revision !== this.revision &&
        now - this.received > 6500);
    const dt = this.frame ? Math.min(100, Math.max(0, now - this.frame)) : 33;
    this.frame = now;
    if (revision !== this.revision) {
      if (this.revision >= 0)
        this.cadence = Math.max(1000, Math.min(5000, now - this.received));
      this.received = now;
      this.revision = revision;
    }
    const fresh = now - this.received < 6500;
    const poses = new Map<string, VehiclePose[]>();
    const centers = new Map<string, Point>();
    const members = new Map<string, Point[]>();
    const live = new Set<string>(),
      liveMembers = new Set<string>();
    const all: (Point & { region: number; id: string; relocated: boolean })[] =
      [];
    for (const s of [...squads].sort((a, b) => a.id.localeCompare(b.id))) {
      if (s.strength <= 0) continue;
      live.add(s.id);
      let p = this.centers.get(s.id);
      const relocated = snap || !p || (p.region !== s.region && !s.independent);
      if (relocated) {
        p = { x: s.x, y: s.y, region: s.region };
        this.centers.set(s.id, p);
      }
      const center = p!;
      center.region = s.region;
      const blend = reduced
        ? 1
        : 1 - Math.exp(-dt / Math.max(2800, this.cadence * 1.25));
      center.x += (s.x - center.x) * blend;
      center.y += (s.y - center.y) * blend;
      centers.set(s.id, center);
      const count =
        detailSquads && !detailSquads.has(s.id)
          ? 0
          : (s.unitCount ??
            Math.max(1, Math.min(5, Math.ceil(s.strength / 6))));
      const group: Point[] = [];
      for (let i = 0; i < count; i++) {
        const id = `${s.id}:${i}`,
          angle = i * 2.3999632297 + (hash(s.id) % 628) / 100;
        liveMembers.add(id);
        // World-space formation with a minimum readable spacing at continent zoom.
        const spacing = Math.max(3.2, 3.2 / scale);
        const radius = Math.sqrt(i + 0.5) * spacing;
        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius;
        // Relax desired slots, not last frame's rendered positions. Feeding
        // collision corrections back into the next frame causes idle shuffling.
        const target = { x, y, region: s.region, id, relocated };
        group.push(target);
        all.push(target);
      }
      members.set(s.id, group);
    }
    // Screen-space avoidance keeps representative icons readable even when zoomed out.
    const gap = 5.4 / scale;
    for (let pass = 0; pass < 8; pass++) {
      const buckets = new Map<string, number[]>();
      all.forEach((p, i) => {
        const cx = Math.floor(p.x / gap),
          cy = Math.floor(p.y / gap);
        for (let x = cx - 1; x <= cx + 1; x++)
          for (let y = cy - 1; y <= cy + 1; y++) {
            for (const j of buckets.get(`${p.region}:${x}:${y}`) ?? []) {
              const q = all[j],
                dx = p.x - q.x,
                dy = p.y - q.y,
                distance = Math.hypot(dx, dy);
              if (distance >= gap) continue;
              const angle = (i + j * 17) * 2.3999632297;
              const ux = distance > 1e-6 ? dx / distance : Math.cos(angle),
                uy = distance > 1e-6 ? dy / distance : Math.sin(angle);
              const push = (gap - distance) * 0.5;
              p.x += ux * push;
              p.y += uy * push;
              q.x -= ux * push;
              q.y -= uy * push;
            }
          }
        const key = `${p.region}:${Math.floor(p.x / gap)}:${Math.floor(p.y / gap)}`;
        const bucket = buckets.get(key) ?? [];
        bucket.push(i);
        buckets.set(key, bucket);
      });
    }
    // Follow the separated formation slowly; no time-driven idle or walking noise.
    for (const target of all) {
      let dot = this.soldiers.get(target.id);
      if (!dot || target.relocated || reduced) {
        dot = { x: target.x, y: target.y };
        this.soldiers.set(target.id, dot);
      } else {
        const follow = 1 - Math.exp(-dt / 900);
        dot.x += (target.x - dot.x) * follow;
        dot.y += (target.y - dot.y) * follow;
      }
      const squadId = target.id.slice(0, target.id.lastIndexOf(":"));
      const squad = squads.find((s) => s.id === squadId)!;
      const profile = vehicleProfile(squad);
      if (profile) {
        let pose = this.vehicles.get(target.id);
        if (!pose || target.relocated || reduced) {
          const heading = pose?.heading ?? -Math.PI / 2;
          pose = {
            x: target.x,
            y: target.y,
            heading,
            turretHeading: pose?.turretHeading ?? heading,
          };
          this.vehicles.set(target.id, pose);
        } else {
          const enemy = squads.find((s) => s.id === squad.target);
          stepVehicle(
            pose,
            target,
            profile,
            dt / 1000,
            0.94 + (hash(target.id) % 13) / 100,
            enemy,
          );
        }
        dot.x = pose.x;
        dot.y = pose.y;
        const group = poses.get(squadId) ?? [];
        group.push({ ...pose });
        poses.set(squadId, group);
      }
      target.x = dot.x;
      target.y = dot.y;
    }
    for (const [id, group] of members)
      members.set(
        id,
        group.map(({ x, y }) => ({ x, y })),
      );
    for (const id of this.centers.keys())
      if (!live.has(id)) this.centers.delete(id);
    for (const id of this.soldiers.keys())
      if (!liveMembers.has(id)) this.soldiers.delete(id);
    for (const id of this.vehicles.keys())
      if (!liveMembers.has(id)) this.vehicles.delete(id);
    return { centers, members, poses, fresh };
  }
}
