import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function slug(value) {
  return String(value).trim().toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Normalize a Psych Engine 0.6.3 chart export (including FNF AI Charter)
 * into this project's mod spec. Note timings, lanes, sustains and
 * mustHitSection are preserved; target project metadata comes from spec.
 */
export function normalizeChart(source, spec) {
  assert(source && typeof source === "object", "Chart JSON must be an object.");
  assert(source.song && typeof source.song === "object", 'Expected a Psych chart with a "song" object.');
  assert(spec && typeof spec === "object", "Mod spec must be an object.");
  assert(spec.engine === "Psych Engine 0.6.3", "Only Psych Engine 0.6.3 is supported.");
  assert(spec.mod && spec.song?.name && spec.characters?.player && spec.characters?.opponent && spec.stage,
    "Mod spec is missing mod, song.name, characters, or stage.");

  const incoming = source.song;
  assert(Array.isArray(incoming.notes) && incoming.notes.length > 0,
    'Chart must contain a non-empty "song.notes" section array.');

  const bpm = Number(incoming.bpm ?? spec.song.bpm);
  const expectedBpm = Number(spec.song.bpm);
  assert(Number.isFinite(bpm) && bpm > 0, "Chart BPM must be a positive number.");
  assert(Number.isFinite(expectedBpm) && expectedBpm > 0, "Mod spec BPM must be a positive number.");
  assert(Math.abs(bpm - expectedBpm) < 0.01,
    "BPM mismatch: chart is " + bpm + ", but the mod spec expects " + expectedBpm + ". Update one so they match.");

  let noteCount = 0;
  const sections = incoming.notes.map((section, sectionIndex) => {
    assert(section && typeof section === "object", "Section " + sectionIndex + " must be an object.");
    assert(Array.isArray(section.sectionNotes),
      "Section " + sectionIndex + " is missing its sectionNotes array.");

    const sectionNotes = section.sectionNotes.map((note, noteIndex) => {
      assert(Array.isArray(note) && note.length >= 2,
        "Note " + noteIndex + " in section " + sectionIndex + " must be [time, lane, sustain].");
      const [time, lane, sustain = 0] = note;
      assert(Number.isFinite(time) && time >= 0,
        "Note " + noteIndex + " in section " + sectionIndex + " has an invalid timestamp.");
      assert(Number.isInteger(lane) && lane >= 0 && lane <= 7,
        "Note " + noteIndex + " in section " + sectionIndex + " has invalid lane " + lane + "; expected 0..7.");
      assert(Number.isFinite(sustain) && sustain >= 0,
        "Note " + noteIndex + " in section " + sectionIndex + " has an invalid sustain length.");
      noteCount++;
      return [Math.round(time), lane, Math.round(sustain)];
    }).sort((a, b) => a[0] - b[0]);

    return {
      sectionNotes,
      mustHitSection: Boolean(section.mustHitSection),
      lengthInSteps: Number.isInteger(section.lengthInSteps) && section.lengthInSteps > 0
        ? section.lengthInSteps : 16,
      typeOfSection: Number.isInteger(section.typeOfSection) ? section.typeOfSection : 0,
      altAnim: Boolean(section.altAnim)
    };
  });

  assert(noteCount > 0, "Chart contains no notes.");
  const songId = slug(spec.song.name);
  assert(songId.length > 0, "Song name must contain at least one letter or number.");

  return {
    chart: {
      song: {
        song: songId,
        notes: sections,
        bpm: expectedBpm,
        needsVoices: incoming.needsVoices !== false,
        speed: Number.isFinite(Number(incoming.speed)) && Number(incoming.speed) > 0
          ? Number(incoming.speed) : 1,
        player1: spec.characters.player,
        player2: spec.characters.opponent,
        gfVersion: spec.characters.girlfriend || "gf",
        stage: spec.stage,
        validScore: true
      }
    },
    summary: { song: songId, bpm: expectedBpm, sections: sections.length, notes: noteCount, source: "imported-chart" }
  };
}

function writeFile(root, relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function main(args) {
  const [specPath, chartPath, outputDir = "build"] = args;
  assert(specPath && chartPath,
    "Usage: node src/pipeline/import-chart.mjs <mod-spec.json> <psych-chart.json> [output-dir]");

  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const source = JSON.parse(fs.readFileSync(chartPath, "utf8"));
  const result = normalizeChart(source, spec);
  const modId = slug(spec.mod);
  const root = path.resolve(outputDir, modId);
  const songId = slug(spec.song.name);

  writeFile(root, "mods/" + modId + "/data/" + songId + "/" + songId + ".json",
    JSON.stringify(result.chart, null, 2) + "\n");
  writeFile(root, "mods/" + modId + "/data/" + songId + "/IMPORT-REPORT.json",
    JSON.stringify({
      ...result.summary,
      engine: spec.engine,
      importedFrom: path.basename(chartPath),
      note: "Imported chart timings and lanes are preserved. Audio and character/stage assets must be supplied separately."
    }, null, 2) + "\n");

  console.log(JSON.stringify({ ok: true, output: root, ...result.summary }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error("FNF AI Mods chart import error:", error.message);
    process.exitCode = 1;
  }
}
