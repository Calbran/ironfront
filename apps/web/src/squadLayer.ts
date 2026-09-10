import { inInfantryViewport, infantryDetail } from "./infantryVisibility";
import type { InfantryInstance } from "./infantryLayer";
import { visualScale } from "../../../packages/game-core/src/visualScale";
import { gunfire } from "./gunfire";
import { Rectangle, Graphics, type Container, type Ticker } from "pixi.js";
import { ATTACK_CURSOR, UNIT_CURSOR } from "./mapCursor";
import { vehicleProfile } from "../../../packages/game-core/src/vehicleTypes";
import { drawVehicle } from "./vehicleGraphics";
import { SquadMotion } from "./squadMotion";
import type { World } from "../../../packages/game-core/src/index";

/** Positions and firing targets come only from the authoritative tactical snapshot. */
export function squadLayer(
  scene: Container,
  ticker: Ticker,
  current: () => World,
  zoom: () => number,
  interaction: {
    host?: HTMLElement;
    resyncKey?: () => number;
    strategy?: () => boolean;
    positions?: (positions: Map<string, { x: number; y: number }>) => void;
    select: (army: number) => void;
    selectSquad?: (id: string, additive: boolean) => void;
    selectedSquads?: () => string[];
    hoverTarget?: (id: string | null) => void;
    hover: (army: number | null) => void;
    dragged: () => boolean;
    selected: () => number[];
  },
) {
  const graphics = new Graphics();
  graphics.eventMode = "none";
  scene.addChild(graphics);
  const motion = new SquadMotion();
  const targets = new Map<string, Graphics>();
  let hoverArmy: number | null = null;
  let hoveredSquad: string | null = null;
  let lastFrame = 0;
  let resyncKey = interaction.resyncKey?.() ?? 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let infantry:
    ReturnType<typeof import("./infantryLayer").infantryLayer> | undefined;
  let loading = false,
    disposed = false;
  let previousPositions = new Map<string, { x: number; y: number }>();
  const headings = new Map<string, { x: number; y: number; angle: number }>();
  const draw = () => {
    if (document.hidden) return;
    const now = performance.now();
    if (now - lastFrame < 33) return;
    lastFrame = now;
    const w = current(),
      t = w.tactics;
    graphics.clear();
    for (const target of targets.values()) target.visible = false;
    if (!t) return;
    const scale = scene.scale.x || 1;
    const detail = Math.max(0, Math.min(1, (zoom() - 2) / 0.6));
    // Physical unit glyphs share the same world scale as scenery, independent of viewport.
    const unitScale = visualScale(w).unitGlyphScale;
    const viewport = {
      x: scene.x,
      y: scene.y,
      scale,
      width: interaction.host?.clientWidth ?? innerWidth,
      height: interaction.host?.clientHeight ?? innerHeight,
    };
    const visibleSquads = new Set(
      t.squads
        .filter(
          (s) =>
            s.strength > 0 &&
            (inInfantryViewport(s, viewport, 160) ||
              (previousPositions.has(s.id) &&
                inInfantryViewport(
                  previousPositions.get(s.id)!,
                  viewport,
                  160,
                ))),
        )
        .map((s) => s.id),
    );
    const showModels = infantryDetail(
      zoom(),
      (4.2 / unitScale) * scale,
      interaction.strategy?.(),
    );
    if (showModels && interaction.host && !infantry && !loading) {
      loading = true;
      import("./infantryLayer")
        .then(({ infantryLayer }) => {
          if (!disposed) infantry = infantryLayer(interaction.host!);
        })
        .catch(() => {
          if (interaction.host)
            interaction.host.dataset.infantryState = "fallback";
        });
    }
    const modelUnits: InfantryInstance[] = [];
    const nextResync = interaction.resyncKey?.() ?? 0;
    const {
      centers: positions,
      members,
      poses,
      fresh: connected,
    } = motion.update(
      t.squads,
      t.revision,
      now,
      unitScale,
      reduced,
      nextResync !== resyncKey,
      detail > 0 && !interaction.strategy?.()
        ? visibleSquads
        : new Set<string>(),
    );
    previousPositions = positions;
    resyncKey = nextResync;
    interaction.positions?.(positions);
    const fresh = connected && w.winner === null;
    if (interaction.strategy?.()) {
      infantry?.hide();
      return;
    }
    for (const battle of t.engagements.filter((e) => e.status === "active")) {
      const r = w.regions[battle.region];
      const units = t.squads.filter(
        (s) => s.region === r.id && s.action === "firing",
      );
      if (!units.length) continue;
      const x = units.reduce((sum, s) => sum + s.x, 0) / units.length,
        y = units.reduce((sum, s) => sum + s.y, 0) / units.length;
      graphics
        .circle(x, y, (8 + (reduced ? 0 : Math.sin(now / 450))) / scale)
        .stroke({
          color: "#edac68",
          width: 1.4 / scale,
          alpha: fresh ? 0.7 : 0.3,
        });
    }
    // Orders remain readable before individual soldiers fade into view.
    for (const s of t.squads) {
      if (s.strength <= 0 || !visibleSquads.has(s.id)) continue;
      const p = positions.get(s.id)!;
      const attackTarget = t.squads.find(
        (d) => d.id === s.localOrder?.attackTarget,
      );
      if (
        attackTarget &&
        (interaction.selectedSquads?.().includes(s.id) ||
          (s.army !== null && interaction.selected().includes(s.army)))
      ) {
        const q = positions.get(attackTarget.id)!;
        graphics
          .moveTo(p.x, p.y)
          .lineTo(q.x, q.y)
          .stroke({ color: "#ef9276", width: 1.5 / scale, alpha: 0.8 });
        graphics
          .circle(q.x, q.y, 13 / scale)
          .stroke({ color: "#ef9276", width: 2 / scale });
        graphics
          .moveTo(q.x - 17 / scale, q.y)
          .lineTo(q.x + 17 / scale, q.y)
          .moveTo(q.x, q.y - 17 / scale)
          .lineTo(q.x, q.y + 17 / scale)
          .stroke({ color: "#ef9276", width: 1 / scale });
      }
      if (
        (interaction.selectedSquads?.().includes(s.id) ||
          (!interaction.selectedSquads?.().length &&
            s.army !== null &&
            interaction.selected().includes(s.army))) &&
        s.localOrder?.path.length
      ) {
        graphics.moveTo(p.x, p.y);
        for (const point of s.localOrder.path)
          graphics.lineTo(point.x, point.y);
        graphics.stroke({ color: "#f2dfad", width: 1.5 / scale, alpha: 0.9 });
        for (const point of s.localOrder.waypoints)
          graphics
            .circle(point.x, point.y, 4 / scale)
            .stroke({ color: "#f2dfad", width: 1.5 / scale });
      }
    }

    const live = new Set(t.squads.map((s) => s.id));
    for (const [id, target] of targets)
      if (!live.has(id)) {
        target.destroy();
        targets.delete(id);
      }

    for (const s of t.squads) {
      if (s.strength <= 0 || !visibleSquads.has(s.id)) continue;
      const p = positions.get(s.id)!;
      if (s.army !== null || s.owner !== w.vision?.owner) {
        const army = s.army;
        let target = targets.get(s.id);
        if (!target) {
          target = new Graphics();
          target.eventMode = "static";
          target.cursor = UNIT_CURSOR;
          target.on("pointerover", () => {
            hoveredSquad = s.id;
            hoverArmy = army;
            interaction.hover(army);
            interaction.hoverTarget?.(s.id);
          });
          target.on("pointerout", () => {
            hoveredSquad = null;
            interaction.hoverTarget?.(null);
            hoverArmy = null;
            interaction.hover(null);
          });
          target.on("pointertap", (event) => {
            event.stopPropagation();
            if (event.button !== 0) return;
            if (!interaction.dragged()) {
              if (
                s.owner === current().vision?.owner &&
                interaction.selectSquad
              )
                interaction.selectSquad(s.id, event.shiftKey);
              else if (army !== null) interaction.select(army);
            }
          });
          scene.addChild(target);
          targets.set(s.id, target);
        }
        target.cursor =
          s.owner !== w.vision?.owner &&
          (interaction.selectedSquads?.().length ||
            interaction.selected().length)
            ? ATTACK_CURSOR
            : UNIT_CURSOR;
        target.visible = true;
        target.position.set(p.x, p.y);
        const dots = members.get(s.id) ?? [];
        const radius = Math.max(
          7 / unitScale,
          ...dots.map(
            (dot) => Math.hypot(dot.x - p.x, dot.y - p.y) + 2 / unitScale,
          ),
        );
        const top = Math.min(p.y, ...dots.map((dot) => dot.y)) - 10 / scale;
        const barX = dots.length
          ? dots.reduce((sum, dot) => sum + dot.x, 0) / dots.length - p.x
          : 0;
        target.clear();
        if (zoom() >= 2.6) {
          const health = Math.max(0, Math.min(1, s.strength / s.capacity));
          const color =
            s.owner === null
              ? "#c4b491"
              : s.owner === current().vision?.owner
                ? "#75e5ec"
                : "#fa907e";
          target
            .roundRect(
              barX - 14 / scale,
              top - p.y,
              28 / scale,
              5 / scale,
              1 / scale,
            )
            .fill("#172c2f")
            .stroke({ color, width: 0.8 / scale });
          target
            .rect(
              barX - 13 / scale,
              top - p.y + 1 / scale,
              (26 * health) / scale,
              3 / scale,
            )
            .fill(color);
          target.hitArea = new Rectangle(
            -Math.max(radius, 16 / scale),
            top - p.y - 3 / scale,
            Math.max(radius, 16 / scale) * 2,
            radius + p.y - top + 3 / scale,
          );
        } else {
          const mine = s.owner === w.vision?.owner;
          const color =
            s.owner === null
              ? "#c4b491"
              : w.vision
                ? mine
                  ? "#75e5ec"
                  : "#fa907e"
                : (w.nations[s.owner ?? -1]?.color ?? "#c4b491");
          target
            .roundRect(
              -9 / scale,
              -8 / scale,
              18 / scale,
              16 / scale,
              1.5 / scale,
            )
            .fill(mine ? "#163b48" : "#402d32")
            .stroke({ color, width: 1.5 / scale });
          target
            .rect(-4.5 / scale, -4 / scale, 9 / scale, 8 / scale)
            .moveTo(-4.5 / scale, -4 / scale)
            .lineTo(4.5 / scale, 4 / scale)
            .moveTo(4.5 / scale, -4 / scale)
            .lineTo(-4.5 / scale, 4 / scale)
            .stroke({ color, width: 0.8 / scale });
          target.hitArea = new Rectangle(
            -12 / scale,
            -12 / scale,
            24 / scale,
            24 / scale,
          );
        }
        const attackHover =
          hoveredSquad === s.id &&
          s.owner !== w.vision?.owner &&
          Boolean(
            interaction.selectedSquads?.().length ||
            interaction.selected().length,
          );
        if (attackHover) {
          const extent =
            zoom() < 2.6
              ? 13 / scale
              : Math.max(radius + 3 / scale, 12 / scale);
          const corner = 5 / scale;
          target.circle(0, 0, extent).fill({ color: "#ef9276", alpha: 0.12 });
          for (const x of [-1, 1])
            for (const y of [-1, 1]) {
              target
                .moveTo(x * (extent - corner), y * extent)
                .lineTo(x * extent, y * extent)
                .lineTo(x * extent, y * (extent - corner));
            }
          target.stroke({ color: "#ffb08e", width: 2 / scale, alpha: 1 });
        }
        if (
          !attackHover &&
          (interaction.selectedSquads?.().includes(s.id) ||
            (army !== null && hoverArmy === army) ||
            (!interaction.selectedSquads?.().length &&
              army !== null &&
              interaction.selected().includes(army)))
        )
          graphics
            .circle(p.x, p.y, radius)
            .stroke({ color: "#fff3cb", width: 1.2 / scale, alpha: 0.85 });
      }

      if (detail === 0) continue;
      const color =
        s.owner === null
          ? "#c4b491"
          : w.vision
            ? s.owner === w.vision.owner
              ? "#75e5ec"
              : "#fa907e"
            : (w.nations[s.owner]?.color ?? "#d0d0c0");
      for (const [index, dot] of (members.get(s.id) ?? []).entries()) {
        const dx = dot.x - p.x,
          dy = dot.y - p.y;
        const profile = vehicleProfile(s);
        const pose = poses.get(s.id)?.[index];
        if (profile && pose)
          drawVehicle(graphics, pose, profile, unitScale, color, detail);
        else if (
          showModels &&
          infantry?.available() &&
          (s.kind === "infantry" || s.kind === "garrison")
        ) {
          const id = `${s.id}:${index}`,
            last = headings.get(id);
          const moving =
            fresh &&
            !reduced &&
            !!last &&
            Math.hypot(dot.x - last.x, dot.y - last.y) > 0.015;
          const enemy = s.target ? positions.get(s.target) : undefined;
          const heading =
            s.action === "firing" && enemy
              ? Math.atan2(enemy.y - dot.y, enemy.x - dot.x)
              : moving
                ? Math.atan2(dot.y - last!.y, dot.x - last!.x)
                : (last?.angle ?? -Math.PI / 2);
          headings.set(id, { x: dot.x, y: dot.y, angle: heading });
          const recoil =
            fresh && !reduced && s.action === "firing"
              ? Math.max(
                  0,
                  ...gunfire(
                    s.id,
                    (members.get(s.id) ?? []).length,
                    now,
                    s.fireProfile ?? "semi",
                  )
                    .filter((shot) => shot.member === index)
                    .map((shot) => 1 - shot.progress),
                )
              : 0;
          modelUnits.push({
            id,
            x: dot.x,
            y: dot.y,
            team: s.owner === w.vision?.owner ? 0 : 1,
            heading,
            moving,
            firing: s.action === "firing",
            recoil,
          });
        } else
          graphics
            .circle(
              p.x + dx,
              p.y + dy,
              (s.kind === "artillery" ? 2 : 0.8) / unitScale,
            )
            .fill({ color, alpha: detail })
            .stroke({
              color: "#172c2f",
              width: 0.4 / unitScale,
              alpha: detail,
            });
      }
      if (!fresh || reduced || s.action !== "firing" || !s.target) continue;
      const target = positions.get(s.target);
      if (!target) continue;
      const shooters = members.get(s.id) ?? [];
      const defenders = members.get(s.target) ?? [target];
      const profile =
        s.fireProfile ??
        (s.kind === "artillery" || s.kind === "armor"
          ? "cannon"
          : s.kind === "motorized"
            ? "automatic"
            : "semi");
      for (const shot of gunfire(s.id, shooters.length, now, profile)) {
        const origin = shooters[shot.member];
        const aim = defenders[shot.member % defenders.length] ?? target;
        const dx = aim.x - origin.x,
          dy = aim.y - origin.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.001) continue;
        const travel = distance * shot.progress;
        const tail = Math.max(0, travel - shot.length / unitScale);
        graphics
          .moveTo(
            origin.x + (dx / distance) * tail,
            origin.y + (dy / distance) * tail,
          )
          .lineTo(origin.x + dx * shot.progress, origin.y + dy * shot.progress)
          .stroke({
            color: profile === "cannon" ? "#f6a567" : "#ffe5a1",
            width: shot.width / unitScale,
            alpha: 0.9 * detail,
          });
        if (shot.progress < 0.24)
          graphics
            .circle(origin.x, origin.y, shot.flash / unitScale)
            .fill({ color: "#ffe6b0", alpha: detail * 0.85 });
        if (profile === "cannon" && shot.progress > 0.85)
          graphics.circle(aim.x, aim.y, 2 / unitScale).stroke({
            color: "#e9b789",
            width: 0.6 / unitScale,
            alpha: (1 - shot.progress) * detail,
          });
      }
    }
    if (infantry) {
      if (showModels)
        infantry.render(
          modelUnits,
          viewport,
          (2.2 / unitScale) * scale,
          now,
          reduced || !fresh,
        );
      else infantry.hide();
    }
    const visibleMembers = new Set(modelUnits.map((u) => u.id));
    for (const id of headings.keys())
      if (!visibleMembers.has(id)) headings.delete(id);
  };
  ticker.add(draw);
  return () => {
    disposed = true;
    infantry?.destroy();
    ticker.remove(draw);
    graphics.destroy();
    for (const target of targets.values()) target.destroy();
  };
}
