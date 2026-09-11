import { Worker } from "node:worker_threads";
import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { planCombinedDistrict } from "../../../packages/game-core/src/combinedDistrict.ts";
import { createCityTactics } from "../../../packages/game-core/src/cityTactics.ts";
import { createCityBattle } from "../../../packages/game-core/src/cityBattle.ts";
export function cityBattleRoutes(app: FastifyInstance) {
  const sessions = new Map<
    string,
    { battle: ReturnType<typeof createCityBattle>; seen: number }
  >();
  const workers=new Set<Worker>();
  const plans=new Map<string,ReturnType<typeof planCombinedDistrict>>();
  let creating=0;
  async function plan(seed:number,profile:string):Promise<ReturnType<typeof planCombinedDistrict>> {
    const cacheKey=seed+':'+profile,cached=plans.get(cacheKey);if(cached)return cached;
    return new Promise((resolve,reject)=>{
      const worker=new Worker(new URL('./cityBattlePlan.mjs',import.meta.url),{workerData:{seed,profile}});workers.add(worker);
      const timeout=setTimeout(()=>{void worker.terminate();reject(new Error('City generation timed out'));},90000);
      worker.once('message',p=>{clearTimeout(timeout);if(plans.size>=4)plans.delete(plans.keys().next().value!);plans.set(cacheKey,p);resolve(p);});
      worker.once('error',e=>{clearTimeout(timeout);reject(e);});
      worker.once('exit',code=>{workers.delete(worker);clearTimeout(timeout);if(code!==0)reject(new Error('City generation stopped'));});
    });
  }
  const timer = setInterval(() => {
    for (const [key, s] of sessions) {
      if (Date.now() - s.seen > 20 * 60 * 1000) sessions.delete(key);
      else s.battle.tick(0.05);
    }
  }, 50);
  timer.unref();
  app.addHook("onClose", async () => {
    clearInterval(timer);
    sessions.clear();
    await Promise.all([...workers].map(w=>w.terminate()));
  });
  app.post("/api/city-battle", async (req, reply) => {
    const parsed = z
      .object({
        seed: z.number().int().min(0).max(4294967295),
        profile: z.enum(["normal", "tight-bend", "steep", "worldgen"]),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "Invalid city configuration" });
    if (sessions.size+creating >= 16 || creating>=2)
      return reply.code(503).send({ error: "City battle capacity reached" });
    const { seed, profile } = parsed.data,
      key = randomBytes(24).toString("hex");
    creating++;
    try {
      const battle=createCityBattle(createCityTactics(await plan(seed,profile),seed,profile));
      sessions.set(key,{battle,seen:Date.now()});return {key,state:battle.state()};
    } finally {creating--;}
  });
  const input = z.object({
    action: z.enum(["move", "attack", "stop", "run"]),
    ids: z.array(z.number().int()).max(16).default([]),
    x: z.number().finite().min(-1000).max(1000).optional(),
    z: z.number().finite().min(-1000).max(1000).optional(),
    target: z.number().int().optional(),
  });
  app.post(
    "/api/city-battle/command",
    { config: { rateLimit: { max: 900, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const key = req.headers.authorization?.replace(/^Bearer /, ""),
        s = key ? sessions.get(key) : undefined;
      if (!s)
        return reply
          .code(404)
          .send({ error: "Battle expired. Reload to stage another." });
      const parsed = input.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send({ error: "Invalid battle command" });
      const p = parsed.data;
      s.seen = Date.now();
      s.battle.command(p.ids, p.action, p.x, p.z, p.target);
      return s.battle.state();
    },
  );
  app.get(
    "/api/city-battle/state",
    { config: { rateLimit: { max: 900, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const key = req.headers.authorization?.replace(/^Bearer /, ""),
        s = key ? sessions.get(key) : undefined;
      if (!s)
        return reply
          .code(404)
          .send({ error: "Battle expired. Reload to stage another." });
      s.seen = Date.now();
      return s.battle.state();
    },
  );
  app.delete("/api/city-battle", async (req) => {
    sessions.delete(req.headers.authorization?.replace(/^Bearer /, "") ?? "");
    return { ok: true };
  });
}
