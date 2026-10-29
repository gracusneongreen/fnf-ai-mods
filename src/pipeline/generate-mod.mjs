import fs from "node:fs";
import path from "node:path";

function fail(message) {
  console.error("FNF AI Mods pipeline error:", message);
  process.exitCode = 1;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function loadSpec(file) {
  const spec = JSON.parse(fs.readFileSync(file, "utf8"));
  if (spec.engine !== "Psych Engine 0.6.3") throw new Error("Only Psych Engine 0.6.3 is supported by this pipeline.");
  for (const key of ["mod", "song", "characters", "stage"]) {
    if (!spec[key]) throw new Error("Missing spec field: " + key);
  }
  if (!spec.song.name || !Number.isFinite(spec.song.bpm) || spec.song.bpm <= 0) throw new Error("Invalid song configuration.");
  return spec;
}

function makeChart(spec) {
  const bpm = Number(spec.song.bpm);
  const durationMs = Math.round(Number(spec.song.durationSeconds) * 1000);
  const sectionLength = (60000 / bpm) * 4;
  const count = Math.max(1, Math.ceil(durationMs / sectionLength));
  const notesPerSection = Math.max(1, Math.min(64, Math.trunc(spec.chart?.notesPerSection ?? 4)));
  let seed = Math.trunc(spec.chart?.seed ?? 1337);

  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  };

  const sections = [];
  for (let i = 0; i < count; i++) {
    const sectionNotes = [];
    const baseTime = Math.round(i * sectionLength);
    for (let n = 0; n < notesPerSection; n++) {
      const step = sectionLength / notesPerSection;
      const strumTime = Math.round(baseTime + n * step);
      const data = next() % 4;
      sectionNotes.push([strumTime, data, 0]);
    }
    sections.push({
      sectionNotes,
      mustHitSection: i % 2 === 1,
      lengthInSteps: 16,
      typeOfSection: 0,
      altAnim: false
    });
  }

  return {
    song: {
      song: slug(spec.song.name),
      notes: sections,
      bpm,
      needsVoices: true,
      speed: 1,
      player1: spec.characters.player,
      player2: spec.characters.opponent,
      gfVersion: spec.characters.girlfriend || "gf",
      stage: spec.stage
    }
  };
}

function writeFile(root, relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, content, "utf8");
}

const input = process.argv[2];
const output = process.argv[3] || "build";
if (!input) {
  fail("Usage: node src/pipeline/generate-mod.mjs <spec.json> [output-dir]");
  process.exit();
}

try {
  const spec = loadSpec(input);
  const modId = slug(spec.mod);
  const songId = slug(spec.song.name);
  const root = path.resolve(output, modId);
  const chart = makeChart(spec);

  writeFile(root, `mods/${modId}/data/${songId}/${songId}.json`, JSON.stringify(chart, null, 2) + "\n");
  writeFile(root, `mods/${modId}/data/${songId}/README.md`,
    "# Generated FNF Mod Pack\n\n" +
    `Engine: ${spec.engine}\nSong: ${spec.song.name}\nBPM: ${spec.song.bpm}\nDifficulty: ${spec.song.difficulty}\n\n` +
    "This package was generated from an FNF AI Mod Spec. Add Inst.ogg/Voices.ogg and real character/stage assets before testing in-game.\n"
  );
  writeFile(root, `mods/${modId}/mod.json`, JSON.stringify({
    id: modId,
    title: spec.mod,
    engine: spec.engine,
    song: songId,
    characters: spec.characters,
    stage: spec.stage,
    generatedBy: "FNF AI Mods pipeline v0.2"
  }, null, 2) + "\n");

  console.log(JSON.stringify({ok:true, output:root, files:3}, null, 2));
} catch (error) {
  fail(error.message);
}
