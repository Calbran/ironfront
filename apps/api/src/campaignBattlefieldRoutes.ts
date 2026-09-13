import { Worker } from "node:worker_threads";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { Store, hash } from "./store";
import {
  advanceCampaign,
  buildCampaignSandbags,
  campaignRuntime,
  createCampaignState,
  type CampaignState,
} from "../../../packages/game-core/src/campaignBattlefield";
import {
  commandSlice,
  type SlicePlan,
} from "../../../packages/game-core/src/countrySlice";
import { countryPlayerState } from "../../../packages/game-core/src/countryEncounter";

export function restoreCampaignPlan(p: SlicePlan) {
  p.surface.heights = new Float32Array(p.surface.heights);
  p.surface.land = new Uint8Array(p.surface.land);
  p.surface.biomes = new Uint8Array(p.surface.biomes);
  p.surface.mountainWeight = new Float32Array(p.surface.mountainWeight);
  return p;
}
export function serializeCampaignPlan(p: SlicePlan) {
  return {
    ...p,
    surface: {
      ...p.surface,
      heights: Array.from(p.surface.heights),
      land: Array.from(p.surface.land),
      biomes: Array.from(p.surface.biomes),
      mountainWeight: Array.from(p.surface.mountainWeight),
    },
  };
}

/** Separate versioned saves preserve the earlier campaign proof and test harnesses. */
export class CampaignBattlefieldStore {
  constructor(private store: Store) {
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS campaign_battlefields(token TEXT PRIMARY KEY,state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS campaign_geography(version INTEGER PRIMARY KEY,plan TEXT NOT NULL)",
    );
  }
  ids() {
    return (
      this.store.db
        .prepare("SELECT token FROM campaign_battlefields")
        .all() as { token: string }[]
    ).map((r) => r.token);
  }
  create(key: string, state: CampaignState) {
    this.store.db
      .prepare("INSERT INTO campaign_battlefields VALUES(?,?)")
      .run(hash(key), JSON.stringify(state));
    return state;
  }
  read(id: string) {
    const row = this.store.db
      .prepare("SELECT state FROM campaign_battlefields WHERE token=?")
      .get(id) as { state: string } | undefined;
    if (!row)
      throw Object.assign(
        Error(
          "Campaign session not found. Restore your saved key or start a new campaign.",
        ),
        { statusCode: 401 },
      );
    return JSON.parse(row.state) as CampaignState;
  }
  mutate(id: string, fn: (state: CampaignState) => void) {
    const db = this.store.db;
    db.exec("BEGIN IMMEDIATE");
    try {
      const state = this.read(id);
      fn(state);
      db.prepare("UPDATE campaign_battlefields SET state=? WHERE token=?").run(
        JSON.stringify(state),
        id,
      );
      db.exec("COMMIT");
      return state;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}

export function campaignBattlefieldRoutes(app: FastifyInstance, store: Store) {
  const saves = new CampaignBattlefieldStore(store);
  const pending = new Map<number, Promise<SlicePlan>>(),
    workers = new Set<Worker>();
  const plan = (version = 3): Promise<SlicePlan> => {
    const cached = pending.get(version);
    if (cached) return cached;
    const work = (async () => {
      const row = store.db
        .prepare("SELECT plan FROM campaign_geography WHERE version=?")
        .get(version) as { plan: string } | undefined;
      if (row) return restoreCampaignPlan(JSON.parse(row.plan));
      const p = await new Promise<SlicePlan>((resolve, reject) => {
        const active = new Worker(
          new URL("./campaignBattlefieldPlan.mjs", import.meta.url),
          { workerData: { version } },
        );
        workers.add(active);
        active.once("exit", () => workers.delete(active));
        const timer = setTimeout(() => {
          void active.terminate();
          reject(Error("Campaign generation timed out"));
        }, 120000);
        active.once("message", (p) => {
          clearTimeout(timer);
          resolve(p);
        });
        active.once("error", (e) => {
          clearTimeout(timer);
          reject(e);
        });
        active.once("exit", (code) => {
          clearTimeout(timer);
          if (code) reject(Error("Campaign generation stopped"));
        });
      });
      store.db
        .prepare("INSERT OR IGNORE INTO campaign_geography VALUES(?,?)")
        .run(version, JSON.stringify(serializeCampaignPlan(p)));
      return p;
    })().catch((e) => {
      pending.delete(version);
      throw e;
    });
    pending.set(version, work);
    return work;
  };
  const savedPlan = (id: string) =>
    plan(saves.read(id).campaign.mapVersion ?? 1);
  const runtimes = new Map<
    string,
    { signature: string; runtime: ReturnType<typeof campaignRuntime> }
  >();
  function runtime(id: string, p: SlicePlan, s: CampaignState) {
    const signature = JSON.stringify(s.sandbags ?? []),
      cached = runtimes.get(id);
    if (cached?.signature === signature) return cached.runtime;
    const runtime = campaignRuntime(p, s);
    runtimes.set(id, { signature, runtime });
    return runtime;
  }
  function advance(id: string, p: SlicePlan, s: CampaignState) {
    const r = runtime(id, p, s);
    advanceCampaign(s, Date.now(), r.plan, r.nav, r.sight, r.vision);
  }
  const auth = (header?: string) => {
    if (!header?.match(/^Bearer [a-f0-9]{48}$/))
      throw Object.assign(Error("Campaign session required"), {
        statusCode: 401,
      });
    const id = hash(header.slice(7));
    saves.read(id);
    return id;
  };
  const view = (id: string, p: SlicePlan, s: CampaignState) =>
    countryPlayerState(s, runtime(id, p, s).vision) as CampaignState;
  let ticking = false,
    closed = false;
  const timer = setInterval(async () => {
    if (ticking || closed || !saves.ids().length) return;
    ticking = true;
    try {
      for (const id of saves.ids()) {
        const p = await savedPlan(id);
        if (closed) break;
        saves.mutate(id, (s) => advance(id, p, s));
      }
    } catch (e) {
      app.log.error({ err: e }, "Campaign simulation update failed");
    } finally {
      ticking = false;
    }
  }, 250);
  timer.unref();
  app.addHook("onClose", async () => {
    closed = true;
    clearInterval(timer);
    await Promise.all([...workers].map((w) => w.terminate()));
  });
  app.post("/api/battlefield", async () => {
    // Keep this local alpha bounded until the multi-world simulation benchmark lands.
    if (saves.ids().length >= 8)
      throw Error(
        "This alpha server already has eight campaigns. Restore an existing session.",
      );
    const p = await plan();
    if (saves.ids().length >= 8) throw Error("Campaign capacity reached.");
    const key = randomBytes(24).toString("hex"),
      s = saves.create(key, createCampaignState(p, Date.now()));
    return { key, state: view(hash(key), p, s) };
  });
  app.get("/api/battlefield/plan", async (req) => {
    const id = auth(req.headers.authorization);
    return serializeCampaignPlan(await savedPlan(id));
  });
  app.get("/api/battlefield/state", async (req) => {
    const id = auth(req.headers.authorization),
      p = await savedPlan(id);
    const s = saves.mutate(id, (s) => advance(id, p, s));
    return view(id, p, s);
  });
  const input = z
    .object({
      action: z.enum(["move", "hold", "cover", "build", "lighting"]),
      ids: z.array(z.number().int()).max(16).default([]),
      x: z.number().finite().min(0).max(1000000).optional(),
      z: z.number().finite().min(0).max(1000000).optional(),
      facing: z.number().finite().min(-Math.PI).max(Math.PI).optional(),
      append: z.boolean().default(false),
      lighting: z.enum(["day", "cycle", "night"]).optional(),
    })
    .strict();
  app.post("/api/battlefield/preview", async (req) => {
    const id = auth(req.headers.authorization),
      data = input.parse(req.body),
      p = await savedPlan(id);
    if ((data.x ?? 0) > p.width || (data.z ?? 0) > p.depth)
      throw Error("Destination is outside the country");
    const state = saves.read(id),
      r = runtime(id, p, state);
    try {
      if (data.action !== "move" && data.action !== "cover")
        throw Error("Preview a movement order");
      commandSlice(
        r.plan,
        r.nav,
        state,
        data.ids,
        data.action,
        data.x === undefined || data.z === undefined
          ? undefined
          : { x: data.x, z: data.z },
        data.append,
        data.facing,
      );
      return {
        valid: true,
        units: state.units
          .filter((u) => data.ids.includes(u.id))
          .map((u) => ({
            id: u.id,
            path: u.path,
            members: u.members?.map((m) => ({ id: m.id, path: m.path })),
          })),
      };
    } catch (e) {
      return { valid: false, error: (e as Error).message, units: [] };
    }
  });
  app.post("/api/battlefield/command", async (req) => {
    const id = auth(req.headers.authorization),
      data = input.parse(req.body),
      p = await savedPlan(id);
    if ((data.x ?? 0) > p.width || (data.z ?? 0) > p.depth)
      throw Error("Destination is outside the country");
    const state = saves.mutate(id, (s) => {
      advance(id, p, s);
      if (s.battlefield!.remainder > 2)
        throw Error(
          "The server is catching up saved orders. Try again shortly.",
        );
      const r = runtime(id, p, s);
      if (data.action === "lighting") {
        if (!data.lighting) throw Error("Choose lighting");
        s.lighting = data.lighting;
        s.revision++;
        return;
      }
      const target =
        data.x === undefined || data.z === undefined
          ? undefined
          : { x: data.x, z: data.z };
      if (data.action === "build") {
        if (!target) throw Error("Choose a construction position");
        buildCampaignSandbags(s, r.plan, r.nav, target, data.facing ?? 0);
        const updated = runtime(id, p, s);
        for (const unit of s.units.flatMap((u) => u.members ?? [u]))
          if (unit.path.length) {
            try {
              unit.path = updated.nav.route(unit, unit.path.at(-1)!, unit.kind);
              unit.guide = [...unit.path];
            } catch {
              unit.path = [];
              unit.guide = [];
            }
          }
      } else
        commandSlice(
          r.plan,
          r.nav,
          s,
          data.ids,
          data.action,
          target,
          data.append,
          data.facing,
        );
    });
    return view(id, p, state);
  });
}
