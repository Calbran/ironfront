import { mkdirSync, writeFileSync } from "node:fs";
import {
  synthesizeBattleSound,
  type BattleSound,
} from "../apps/web/src/audio/battleSoundSynthesis";
const root = "apps/web/public/audio/battle";
mkdirSync(root, { recursive: true });
const rate = 24000;
function wav(samples: Float32Array, channels = 1) {
  const out = Buffer.alloc(44 + samples.length * 2);
  out.write("RIFF");
  out.writeUInt32LE(out.length - 8, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(channels, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * channels * 2, 28);
  out.writeUInt16LE(channels * 2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) =>
    out.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, s)) * 32767),
      44 + i * 2,
    ),
  );
  return out;
}
for (const kind of [
  "rifle",
  "cannon",
  "impact",
  "step",
  "engine",
  "tracks",
] as BattleSound[])
  for (let v = 0; v < (kind === "engine" || kind === "tracks" ? 1 : 4); v++)
    writeFileSync(
      root + "/" + kind + "-" + v + ".wav",
      wav(synthesizeBattleSound(kind, v)),
    );
const demo = new Float32Array(rate * 12 * 2);
for (const [kind, start, gain, pan] of [
  ["step", 0.2, 0.7, -0.2],
  ["step", 0.7, 0.7, 0.2],
  ["rifle", 1.6, 0.7, -0.6],
  ["rifle", 2.3, 0.55, 0.6],
  ["cannon", 3.2, 0.8, -0.25],
  ["impact", 4.1, 0.6, 0.6],
  ["rifle", 7, 0.12, -0.5],
  ["rifle", 7.3, 0.11, -0.4],
  ["rifle", 7.7, 0.1, 0.5],
  ["impact", 8.5, 0.16, 0.4],
  ["cannon", 9.5, 0.13, -0.4],
] as [BattleSound, number, number, number][]) {
  const samples = synthesizeBattleSound(kind);
  let low = 0;
  for (let i = 0; i < samples.length; i++) {
    low += (start >= 7 ? 0.12 : 1) * (samples[i] - low);
    const j = (Math.round(start * rate) + i) * 2;
    if (j + 1 >= demo.length) break;
    demo[j] += low * gain * Math.sqrt((1 - pan) / 2);
    demo[j + 1] += low * gain * Math.sqrt((1 + pan) / 2);
  }
}
writeFileSync(root + "/sfx-demo.wav", wav(demo, 2));
writeFileSync(
  root + "/README.txt",
  "Original procedurally synthesized Ironfront prototype SFX. No third-party recordings or attribution dependencies. Rebuild with node --import tsx scripts/generate-battle-sfx.ts. Mono 24 kHz PCM variants; stereo demo contrasts close and distant fire. These are replaceable sound-design prototypes, not field recordings.",
);
console.log("Generated 16 variant effects, two loops, and a stereo preview.");
