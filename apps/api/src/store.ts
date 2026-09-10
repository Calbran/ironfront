import {
  advanceTactics,
  ensureTactics,
} from "../../../packages/game-core/src/tactics.ts";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import {
  advance,
  upgradeWorld,
  type World,
} from "../../../packages/game-core/src/index.ts";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export class Store {
  db: DatabaseSync;
  constructor(file: string) {
    if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS worlds(id TEXT PRIMARY KEY, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, world TEXT NOT NULL, owner INTEGER NOT NULL, host INTEGER NOT NULL);",
    );
  }
  create(w: World, token: string) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("INSERT INTO worlds VALUES(?,?)")
        .run(w.id, JSON.stringify(w));
      this.addSession(token, w.id, 0, true);
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  addSession(token: string, world: string, owner: number, host = false) {
    this.db
      .prepare("INSERT INTO sessions VALUES(?,?,?,?)")
      .run(hash(token), world, owner, host ? 1 : 0);
  }
  session(token: string) {
    return this.db
      .prepare("SELECT world,owner,host FROM sessions WHERE token=?")
      .get(hash(token)) as
      { world: string; owner: number; host: number } | undefined;
  }
  get(id: string) {
    const r = this.db.prepare("SELECT state FROM worlds WHERE id=?").get(id) as
      { state: string } | undefined;
    return r ? upgradeWorld(JSON.parse(r.state) as World) : undefined;
  }
  mutate<T>(id: string, fn: (w: World) => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const w = this.get(id);
      if (!w) throw Error("Campaign not found. Check the invite code.");
      const out = fn(w);
      this.db
        .prepare("UPDATE worlds SET state=? WHERE id=?")
        .run(JSON.stringify(w), id);
      this.db.exec("COMMIT");
      return out;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  ids() {
    return (
      this.db.prepare("SELECT id FROM worlds").all() as { id: string }[]
    ).map((r) => r.id);
  }
  tick(id: string, now = Date.now(), force = false) {
    return this.mutate(id, (w) => {
      if (w.winner !== null) return false;
      const tactics = ensureTactics(w);
      if (force) {
        advance(w, 1);
        tactics.lastWallAt = now;
        w.nextTickAt = now + w.tickMs;
        return true;
      }
      const previous =
        tactics.lastWallAt || Math.max(0, w.nextTickAt - w.tickMs);
      const elapsed = Math.max(0, Math.min(w.tickMs, now - previous));
      if (!force && elapsed < Math.min(1000, w.tickMs / 12)) return false;
      advanceTactics(w, elapsed / w.tickMs);
      tactics.lastWallAt = now;
      if (!force && now < w.nextTickAt) return false;
      advance(w, 0);
      w.nextTickAt = now + w.tickMs;
      return true;
    });
  }
  resume(now = Date.now()) {
    for (const id of this.ids())
      this.mutate(id, (w) => {
        w.nextTickAt = now + w.tickMs;
        ensureTactics(w).lastWallAt = now;
      });
  }
  close() {
    this.db.close();
  }
}
