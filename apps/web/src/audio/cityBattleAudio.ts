import * as T from "three";
import {
  synthesizeBattleSound,
  synthesizeCityImpulse,
  type BattleSound,
} from "./battleSoundSynthesis";
import {
  battleShotVariation,
  AUDIO_VOICE_LIMIT,
  createAudioEventCursor,
  spatialBattleMix,
  type AudioPoint,
  type CameraEars,
} from "./battleAudioMath";
import type { CitySoundCue } from "../../../../packages/game-core/src/cityHearing";
import type { CityShot } from "../../../../packages/game-core/src/cityBattle";
import {
  tacticalShotBatchDelays,
  tacticalShotDelay,
} from "../experiments/battlePresentation";
import "./cityBattleAudio.css";
type Unit = {
  id: number;
  x: number;
  z: number;
  kind: string;
  health: number;
  visible?: boolean;
  moving: boolean;
  speed: number;
  distance: number;
};
type Voice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  pan: StereoPannerNode;
  point: AudioPoint;
  kind: BattleSound;
  strength: number;
  priority: number;
  loopKey?: string;
};
export function createCityBattleAudio(
  root: T.Object3D,
  getCamera: () => T.Camera,
  canvas: HTMLCanvasElement,
  overlayRoot: HTMLElement = canvas.parentElement!,
  surfaceHeight: (p: { x: number; z: number }) => number = () => 0,
) {
  const panel = document.createElement("div");
  panel.className = "city-audio";
  panel.innerHTML =
    '<button class="audio-toggle" aria-pressed="false">Sound off</button><div class="audio-controls" hidden><label>Volume <input aria-label="Battle volume" type="range" min="0" max="100" value="35"></label><button class="audio-test">Test SFX</button><span class="audio-status" role="status"></span></div>';
  overlayRoot.append(panel);
  const toggle = panel.querySelector<HTMLButtonElement>(".audio-toggle")!,
    controls = panel.querySelector<HTMLElement>(".audio-controls")!,
    volume = panel.querySelector<HTMLInputElement>("input")!,
    status = panel.querySelector<HTMLElement>(".audio-status")!;
  let context: AudioContext | undefined,
    master: GainNode | undefined,
    reverbInput: GainNode | undefined,
    reverb: ConvolverNode | undefined,
    impulse: AudioBuffer | undefined,
    enabled = false,
    disposed = false,
    bank: Map<string, AudioBuffer> | undefined,
    ears: CameraEars = { x: 0, y: 0, z: 0, rightX: 1, rightZ: 0 },
    nextUpdate = 0,
    wasRunning = false;
  const voices = new Set<Voice>(),
    cursor = createAudioEventCursor(),
    steps = new Map<number, number>(),
    loops = new Map<string, Voice>(),
    distant = new Map<string, number>();
  const localEye = new T.Vector3(),
    direction = new T.Vector3(),
    right = new T.Vector3(),
    inverse = new T.Matrix4();
  function listener() {
    const camera = getCamera();
    camera.updateMatrixWorld();
    root.updateWorldMatrix(true, false);
    inverse.copy(root.matrixWorld).invert();
    localEye.copy(camera.position).applyMatrix4(inverse);
    camera.getWorldDirection(direction).transformDirection(inverse);
    right
      .setFromMatrixColumn(camera.matrixWorld, 0)
      .transformDirection(inverse);
    if (camera instanceof T.OrthographicCamera) {
      const t =
        direction.y < -0.01 ? Math.max(0, -localEye.y / direction.y) : 30;
      const focus = localEye.clone().addScaledVector(direction, t),
        distance = Math.max(
          5,
          ((camera.top - camera.bottom) / camera.zoom) * 0.65,
        );
      localEye.copy(focus).addScaledVector(direction, -distance);
    }
    ears = {
      x: localEye.x,
      y: localEye.y,
      z: localEye.z,
      rightX: right.x,
      rightZ: right.z,
    };
  }
  function remove(v: Voice) {
    voices.delete(v);
    if (v.loopKey && loops.get(v.loopKey) === v) loops.delete(v.loopKey);
    v.source.disconnect();
    v.gain.disconnect();
    v.filter.disconnect();
    v.pan.disconnect();
  }
  function stop(v: Voice) {
    try {
      v.source.stop();
    } catch {}
    remove(v);
  }
  function resetReverb() {
    reverbInput?.disconnect();
    reverb?.disconnect();
    if (disposed || !context || !master || !reverbInput || !impulse) return;
    reverb = context.createConvolver();
    reverb.normalize = false;
    reverb.buffer = impulse;
    reverbInput.connect(reverb).connect(master);
  }
  function clear() {
    for (const v of [...voices]) stop(v);
    distant.clear();
    resetReverb();
  }
  function mix(v: Voice) {
    if (!context) return;
    const m = spatialBattleMix(v.point, ears, v.kind),
      now = context.currentTime;
    v.priority =
      m.gain *
      (v.kind === "cannon" || v.kind === "impact"
        ? 5
        : v.kind === "rifle"
          ? 3
          : 1) *
      v.strength;
    v.gain.gain.setTargetAtTime(m.gain * v.strength, now, 0.045);
    v.filter.frequency.setTargetAtTime(m.cutoff, now, 0.06);
    v.pan.pan.setTargetAtTime(m.pan, now, 0.045);
    return m;
  }
  function play(
    kind: BattleSound,
    point: AudioPoint,
    id: number,
    strength = 1,
    loopKey?: string,
    eventDelay = ((Math.abs(id) * 37) % 173) / 1000,
  ) {
    if (
      !enabled ||
      !context ||
      context.state !== "running" ||
      !master ||
      !bank ||
      document.hidden
    )
      return;
    const variation = battleShotVariation(id, kind);
    if (!loopKey) strength *= variation.strength;
    const m = spatialBattleMix(point, ears, kind);
    if (m.gain < 0.003) return;
    const priority =
      m.gain *
      (kind === "cannon" || kind === "impact" ? 5 : kind === "rifle" ? 3 : 1) *
      strength;
    if (!loopKey && kind === "rifle" && m.distance > 80) {
      const key = Math.floor(point.x / 40) + ":" + Math.floor(point.z / 40),
        last = distant.get(key) ?? -1;
      if (context.currentTime - last < 0.12) return;
      distant.set(key, context.currentTime);
    }
    if (voices.size >= AUDIO_VOICE_LIMIT) {
      const lowest = [...voices]
        .filter((v) => !v.loopKey)
        .sort((a, b) => a.priority - b.priority)[0];
      if (!lowest || lowest.priority >= priority) return;
      stop(lowest);
    }
    const source = context.createBufferSource(),
      gain = context.createGain(),
      filter = context.createBiquadFilter(),
      pan = context.createStereoPanner();
    source.buffer = bank.get(
      kind +
        "-" +
        (kind === "engine" || kind === "tracks" ? 0 : variation.variant),
    )!;
    source.loop = !!loopKey;
    source.playbackRate.value = loopKey ? 1 : variation.rate;
    filter.type = "lowpass";
    filter.Q.value = 0.45;
    filter.frequency.value = m.cutoff;
    pan.pan.value = m.pan;
    gain.gain.value = loopKey ? 0 : m.gain * strength;
    source.connect(filter).connect(gain).connect(pan).connect(master);
    if (reverbInput && !loopKey) pan.connect(reverbInput);
    const voice: Voice = {
      source,
      gain,
      filter,
      pan,
      point,
      kind,
      strength,
      priority,
      loopKey,
    };
    voices.add(voice);
    if (loopKey) loops.set(loopKey, voice);
    source.onended = () => remove(voice);
    mix(voice);
    source.start(context.currentTime + (loopKey ? 0 : m.delay + eventDelay));
    return voice;
  }
  async function enable() {
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = Number(volume.value) / 100;
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.knee.value = 18;
        compressor.ratio.value = 6;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        master.connect(compressor).connect(context.destination);
        reverbInput = context.createGain();
        reverbInput.gain.value = 0.18;
        const reflection = synthesizeCityImpulse(context.sampleRate);
        impulse = context.createBuffer(
          1,
          reflection.length,
          context.sampleRate,
        );
        impulse.copyToChannel(new Float32Array(reflection), 0);
        resetReverb();
      }
      await context.resume();
      if (disposed) return;
      bank ??= new Map();
      if (bank.size === 0)
        for (const kind of [
          "rifle",
          "cannon",
          "impact",
          "step",
          "engine",
          "tracks",
        ] as BattleSound[])
          for (
            let variant = 0;
            variant < (kind === "engine" || kind === "tracks" ? 1 : 4);
            variant++
          ) {
            const data = synthesizeBattleSound(kind, variant),
              buffer = context.createBuffer(1, data.length, 24000);
            buffer.copyToChannel(new Float32Array(data), 0);
            bank.set(kind + "-" + variant, buffer);
          }
      enabled = true;
      master!.gain.setTargetAtTime(
        Number(volume.value) / 100,
        context.currentTime,
        0.02,
      );
      toggle.textContent = "Sound on";
      toggle.setAttribute("aria-pressed", "true");
      controls.hidden = false;
      status.textContent = "Camera spatial audio";
    } catch {
      status.textContent = "Audio unavailable. Click Sound to retry.";
      controls.hidden = false;
    }
  }
  toggle.onclick = () => {
    if (enabled) {
      enabled = false;
      clear();
      if (context) void context.suspend();
      toggle.textContent = "Sound off";
      toggle.setAttribute("aria-pressed", "false");
      controls.hidden = true;
    } else void enable();
  };
  volume.oninput = () => {
    if (context && master)
      master.gain.setTargetAtTime(
        Number(volume.value) / 100,
        context.currentTime,
        0.03,
      );
  };
  panel.querySelector<HTMLButtonElement>(".audio-test")!.onclick = () => {
    listener();
    const near = {
      x: ears.x + ears.rightX * 8,
      y: ears.y,
      z: ears.z + ears.rightZ * 8,
    };
    play("rifle", near, 1, 0.6);
    play(
      "cannon",
      { x: ears.x - ears.rightX * 120, y: 0, z: ears.z - ears.rightZ * 120 },
      2,
      0.8,
    );
  };
  const hide = () => {
    if (document.hidden) {
      cursor.reset();
      clear();
      if (context) void context.suspend();
    } else if (enabled && context)
      void context.resume().catch(() => {
        status.textContent = "Click Sound to resume audio";
      });
  };
  document.addEventListener("visibilitychange", hide);
  const cancelEvent = (e: Event) => e.stopPropagation();
  for (const event of ["pointerdown", "pointerup", "keydown", "contextmenu"])
    panel.addEventListener(event, cancelEvent);
  return {
    reset() {
      cursor.reset();
      clear();
      steps.clear();
      nextUpdate = 0;
      wasRunning = false;
    },
    update(
      time: number,
      running: boolean,
      units: readonly Unit[],
      shots: readonly CityShot[],
      cues: readonly CitySoundCue[],
    ) {
      listener();
      const events = cursor.take(
          cues.length
            ? cues
            : shots.map((s) => ({
                id: s.id,
                kind: (s.impact
                  ? "impact"
                  : s.shell
                    ? "cannon"
                    : "rifle") as CitySoundCue["kind"],
                x: s.impact ? s.tx : s.x,
                z: s.impact ? s.tz : s.z,
                time: 0,
              })),
        ),
        exactShots = events
          .map((event) => shots.find((shot) => shot.id === event.id))
          .filter((shot): shot is CityShot => !!shot),
        batchDelays = tacticalShotBatchDelays(exactShots),
        delayById = new Map(
          exactShots.map((shot, index) => [shot.id, batchDelays[index]]),
        );
      if (!running && wasRunning) clear();
      wasRunning = running;
      // Consume events while muted/paused so enabling audio cannot replay a snapshot backlog.
      if (!running || !enabled || !context || document.hidden) {
        for (const u of units)
          steps.set(u.id, Math.floor(u.distance / 0.65 + u.id * 0.618));
        return;
      }
      for (const event of events) {
        const exact = shots.find((s) => s.id === event.id);
        play(
          event.kind,
          {
            x: exact ? (exact.impact ? exact.tx : exact.x) : event.x,
            y:
              surfaceHeight({
                x: exact ? (exact.impact ? exact.tx : exact.x) : event.x,
                z: exact ? (exact.impact ? exact.tz : exact.z) : event.z,
              }) + 1,
            z: exact ? (exact.impact ? exact.tz : exact.z) : event.z,
          },
          event.id,
          event.kind === "rifle" ? 0.65 : 1,
          undefined,
          exact
            ? (delayById.get(exact.id) ?? 0) +
                (exact.impact ? 0 : tacticalShotDelay(exact.id, exact.from))
            : undefined,
        );
      }
      if (time < nextUpdate) return;
      nextUpdate = time + 0.05;
      for (const [key, t] of distant)
        if (context.currentTime - t > 1) distant.delete(key);
      for (const v of voices) {
        const m = mix(v);
        if (m && m.gain < 0.002) stop(v);
      }
      const alive = units.filter((u) => u.health > 0 && u.visible !== false);
      for (const u of alive) {
        const phase = Math.floor(u.distance / 0.65 + u.id * 0.618),
          previous = steps.get(u.id);
        steps.set(u.id, phase);
        if (
          u.kind === "infantry" &&
          u.moving &&
          u.speed > 0.05 &&
          previous !== undefined &&
          phase > previous
        )
          play(
            "step",
            { x: u.x, y: surfaceHeight(u), z: u.z },
            u.id + phase,
            0.35,
          );
      }
      const vehicles = alive
          .filter((u) => u.kind === "vehicle")
          .sort(
            (a, b) =>
              Math.hypot(a.x - ears.x, a.z - ears.z) -
              Math.hypot(b.x - ears.x, b.z - ears.z),
          )
          .slice(0, 4),
        wanted = new Set<string>();
      for (const u of vehicles)
        for (const kind of ["engine", "tracks"] as const) {
          const key = kind + u.id;
          if (kind === "tracks" && (!u.moving || u.speed < 0.05)) continue;
          wanted.add(key);
          const strength = kind === "engine" ? (u.moving ? 0.45 : 0.17) : 0.32,
            point = { x: u.x, y: surfaceHeight(u) + 0.5, z: u.z },
            v = loops.get(key) ?? play(kind, point, u.id, strength, key);
          if (v) {
            v.point = point;
            v.strength = strength;
            v.source.playbackRate.setTargetAtTime(
              0.8 + Math.min(1, u.speed) * 0.35,
              context.currentTime,
              0.15,
            );
          }
        }
      for (const [key, v] of loops) if (!wanted.has(key)) stop(v);
    },
    dispose() {
      disposed = true;
      enabled = false;
      clear();
      document.removeEventListener("visibilitychange", hide);
      panel.remove();
      if (context) void context.close();
      bank?.clear();
    },
  };
}
