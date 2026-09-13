import { Worker } from "node:worker_threads";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { Store, hash } from "./store";
import {
  advanceEncounter,
  countryPlayerState,
  countryVisibility,
  encounterSight,
  startEncounter,
  encounterFinished,
} from "../../../packages/game-core/src/countryEncounter";
import {
  upgradeSliceCity,
  advanceSlice,
  commandSlice,
  createSliceNavigation,
  createSliceState,
  type SlicePlan,
  type SliceState,
} from "../../../packages/game-core/src/countrySlice";
export class CountrySliceStore {
  constructor(
    private store: Store,
    private advance: (s: SliceState, now: number) => void = advanceSlice,
  ) {
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS country_slices(token TEXT PRIMARY KEY,state TEXT NOT NULL)",
    );
  }
  create(key: string, now: number) {
    return this.createState(key, createSliceState(now));
  }
  createState(key: string, state: SliceState) {
    this.store.db
      .prepare("INSERT INTO country_slices VALUES(?,?)")
      .run(hash(key), JSON.stringify(state));
    return state;
  }
  mutate(key: string, now: number, fn?: (s: SliceState) => void) {
    const db = this.store.db;
    db.exec("BEGIN IMMEDIATE");
    try {
      const row = db
        .prepare("SELECT state FROM country_slices WHERE token=?")
        .get(hash(key)) as { state: string } | undefined;
      if (!row) throw Error("Slice session not found");
      const state = JSON.parse(row.state) as SliceState;
      this.advance(state, now);
      fn?.(state);
      db.prepare("UPDATE country_slices SET state=? WHERE token=?").run(
        JSON.stringify(state),
        hash(key),
      );
      db.exec("COMMIT");
      return state;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}
export function countrySliceRoutes(app: FastifyInstance, store: Store) {
  let sight: ReturnType<typeof encounterSight> | undefined;
  let visibility: ReturnType<typeof countryVisibility> | undefined;
  let activePlan: SlicePlan | undefined;
  const saves = new CountrySliceStore(store, (s, now) => {
    if (s.encounter && sight)
      advanceEncounter(s, now, sight, activePlan, nav, visibility);
    else if (!s.encounter) advanceSlice(s, now, activePlan);
  });
  let pending: Promise<SlicePlan> | undefined,
    worker: Worker | undefined,
    nav: ReturnType<typeof createSliceNavigation> | undefined;
  const plan = () =>
    (pending ??= new Promise<SlicePlan>((resolve, reject) => {
      worker = new Worker(new URL("./countrySlicePlan.mjs", import.meta.url));
      const timer = setTimeout(() => {
        void worker?.terminate();
        reject(Error("Sector generation timed out"));
      }, 120000);
      worker.once("message", (p) => {
        clearTimeout(timer);
        nav = createSliceNavigation(p);
        activePlan = p;
        sight = encounterSight(p);
        visibility = countryVisibility(p, sight);
        resolve(p);
      });
      worker.once("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      worker.once("exit", (code) => {
        clearTimeout(timer);
        if (code) reject(Error("Sector generation stopped"));
      });
    }).catch((e) => {
      pending = undefined;
      throw e;
    }));
  app.addHook("onClose", async () => {
    await worker?.terminate();
  });
  const auth = (header: string | undefined) => {
    if (!header?.startsWith("Bearer ") || header.length > 200)
      throw Error("Slice session required");
    return header.slice(7);
  };
  app.post("/api/country-slice", async () => {
    await plan();
    const count = store.db
      .prepare("SELECT COUNT(*) AS n FROM country_slices")
      .get() as { n: number };
    if (count.n >= 64) throw Error("Review session capacity reached");
    const key = randomBytes(24).toString("hex");
    return {
      key,
      state: countryPlayerState(saves.create(key, Date.now()), visibility!),
    };
  });
  app.get("/api/country-slice/plan", async (req) => {
    saves.mutate(auth(req.headers.authorization), Date.now());
    const p = await plan();
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
  });
  app.get("/api/country-slice/state", async (req) => {
    const key = auth(req.headers.authorization);
    await plan();
    const state = saves.mutate(key, Date.now());
    if (state.version === 9) return countryPlayerState(state, visibility!);
    await plan();
    return countryPlayerState(
      saves.mutate(key, Date.now(), (s) => upgradeSliceCity(s, nav!)),
      visibility!,
    );
  });
  const input = z
    .object({
      action: z.enum([
        "move",
        "hold",
        "cover",
        "run",
        "pace",
        "encounter",
        "restage",
        "lighting",
      ]),
      ids: z.array(z.number().int()).max(4).default([]),
      x: z.number().finite().min(0).max(3000).optional(),
      z: z.number().finite().min(0).max(1800).optional(),
      append: z.boolean().default(false),
      facing: z.number().finite().min(-Math.PI).max(Math.PI).optional(),
      pace: z.union([z.literal(1), z.literal(20)]).optional(),
      lighting: z.enum(["cycle", "day", "night"]).optional(),
      running: z.boolean().optional(),
    })
    .strict();
  app.post("/api/country-slice/preview", async (req) => {
    const data = input.parse(req.body),
      key = auth(req.headers.authorization);
    const state = structuredClone(saves.mutate(key, Date.now())),
      p = await plan();
    try {
      if (data.action !== "move" && data.action !== "cover")
        throw Error("Preview a movement order");
      upgradeSliceCity(state, nav!);
      commandSlice(
        p,
        nav!,
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
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "No safe route",
        units: [],
      };
    }
  });
  app.post("/api/country-slice/command", async (req) => {
    const data = input.parse(req.body),
      key = auth(req.headers.authorization);
    saves.mutate(key, Date.now());
    const p = await plan();
    const state = saves.mutate(key, Date.now(), (s) => {
      upgradeSliceCity(s, nav!);
      if (data.action === "restage") {
        s.encounter = undefined;
        startEncounter(s, p, nav!);
      } else if (data.action === "encounter") {
        if (s.encounter && !encounterFinished(s))
          throw Error("Encounter already deployed");
        startEncounter(s, p, nav!);
      } else if (
        encounterFinished(s) &&
        data.action !== "pace" &&
        data.action !== "lighting"
      ) {
        throw Error(
          "Encounter finished. Restart encounter to command a new force.",
        );
      } else if (data.action === "run") {
        if (data.running === undefined) throw Error("Running state required");
        s.running = data.running;
        s.revision++;
      } else if (data.action === "pace") {
        if (!data.pace) throw Error("Pace required");
        s.pace = data.pace;
        s.revision++;
      } else if (data.action === "lighting") {
        if (!data.lighting) throw Error("Lighting mode required");
        s.lighting = data.lighting;
        s.revision++;
      } else
        commandSlice(
          p,
          nav!,
          s,
          data.ids,
          data.action,
          data.x === undefined || data.z === undefined
            ? undefined
            : { x: data.x, z: data.z },
          data.append,
          data.facing,
        );
    });
    return countryPlayerState(state, visibility!);
  });
}
