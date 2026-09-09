import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import staticFiles from "@fastify/static";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  command,
  createWorld,
  report,
} from "../../../packages/game-core/src/index.ts";
import { Store } from "./store.ts";
const identity = z.object({
  name: z.string().trim().min(2).max(26),
  faction: z.enum(["iron", "crown", "aether"]),
});
const order = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("build"),
    region: z.number().int().nonnegative(),
    building: z.enum(["factory", "refinery", "depot", "fort"]),
  }),
  z.object({
    type: z.literal("order"),
    army: z.number().int().nonnegative(),
    order: z.enum(["hold", "advance", "redeploy", "reserve", "recover"]),
    target: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("sector"),
    army: z.number().int().nonnegative(),
    regions: z.array(z.number().int().nonnegative()).min(1).max(3),
  }),
  z.object({
    type: z.literal("policy"),
    army: z.number().int().nonnegative(),
    risk: z.enum(["cautious", "balanced", "aggressive"]),
    fallback: z.number().int().nonnegative().nullable(),
  }),
  z.object({
    type: z.literal("air"),
    army: z.number().int().nonnegative(),
    enabled: z.boolean(),
  }),
]);
export async function makeServer(store: Store) {
  const app = Fastify({ logger: false, bodyLimit: 8192 });
  await app.register(rateLimit, { max: 180, timeWindow: "1 minute" });
  app.setErrorHandler((error, req, reply) => {
    const e = error as Error & { statusCode?: number };
    reply.code(e.statusCode || 400).send({
      error:
        e instanceof z.ZodError
          ? "Check the form values and try again."
          : e.message,
    });
  });
  const auth = (header: string | undefined) => {
    const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
    const s = token ? store.session(token) : undefined;
    if (!s)
      throw Object.assign(
        Error(
          "Session not found. Restore your saved session key or join a campaign.",
        ),
        { statusCode: 401 },
      );
    return s;
  };
  app.get("/api/health", async () => ({ ok: true }));
  app.post("/api/campaigns", async (req) => {
    const body = identity
      .extend({
        seats: z.number().int().min(2).max(8),
        seed: z
          .string()
          .trim()
          .min(1)
          .max(32)
          .regex(/^[a-zA-Z0-9 -]+$/),
        pace: z.enum(["test", "normal"]),
      })
      .parse(req.body);
    const id = randomBytes(4).toString("hex").toUpperCase(),
      token = randomBytes(32).toString("hex");
    const w = createWorld(
      id,
      body.seed,
      body.seats,
      body.pace === "test" ? 10000 : 3600000,
    );
    Object.assign(w.nations[0], {
      name: body.name,
      faction: body.faction,
      bot: false,
    });
    store.create(w, token);
    return { token };
  });
  app.post("/api/join", async (req) => {
    const body = identity
        .extend({ code: z.string().trim().length(8) })
        .parse(req.body),
      token = randomBytes(32).toString("hex");
    store.mutate(body.code.toUpperCase(), (w) => {
      if (w.winner !== null) throw Error("This campaign has already ended.");
      const n = w.nations.find(
        (n) => n.bot && w.regions.some((r) => r.owner === n.id),
      );
      if (!n) throw Error("This campaign has no open nations.");
      Object.assign(n, { name: body.name, faction: body.faction, bot: false });
      for (const a of w.armies.filter((a) => a.owner === n.id)) {
        a.order = "hold";
        a.target = null;
        a.route = [];
        a.progress = 0;
        a.status = "Holding sector";
      }
      store.addSession(token, w.id, n.id);
      report(w, `${n.name} joined the campaign.`);
    });
    return { token };
  });
  app.get("/api/world", async (req) => {
    const s = auth(req.headers.authorization);
    return { world: store.get(s.world), owner: s.owner, host: !!s.host };
  });
  app.post("/api/command", async (req) => {
    const s = auth(req.headers.authorization),
      c = order.parse(req.body);
    store.mutate(s.world, (w) => command(w, s.owner, c));
    return { ok: true };
  });
  app.post("/api/advance", async (req) => {
    const s = auth(req.headers.authorization);
    if (!s.host) throw Error("Only the host can advance the test clock.");
    const w = store.get(s.world)!;
    if (w.tickMs !== 10000)
      throw Error("Manual advancement is only available in test campaigns.");
    store.tick(s.world, Date.now(), true);
    return { ok: true };
  });
  const root = resolve("dist");
  if (existsSync(root)) {
    await app.register(staticFiles, { root });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api/"))
        return reply.code(404).send({ error: "Route not found." });
      return reply.sendFile("index.html");
    });
  }
  return app;
}
