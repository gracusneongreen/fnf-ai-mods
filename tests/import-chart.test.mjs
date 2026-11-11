import test from "node:test";
import assert from "node:assert/strict";
import { normalizeChart } from "../src/pipeline/import-chart.mjs";

const spec = {
  mod: "FNF Corruption",
  engine: "Psych Engine 0.6.3",
  song: { name: "School Party", bpm: 150, durationSeconds: 180, difficulty: "Hard" },
  characters: { player: "boyfriend", opponent: "gracusneongreen", girlfriend: "gf" },
  stage: "school"
};

test("imports FNF AI Charter-style sections and preserves note data", () => {
  const source = {
    song: {
      song: "school-party",
      bpm: 150,
      needsVoices: true,
      speed: 2,
      notes: [{ sectionNotes: [[500, 4, 125], [0, 0, 0]], mustHitSection: true, lengthInSteps: 16 }]
    }
  };
  const result = normalizeChart(source, spec);
  assert.equal(result.summary.notes, 2);
  assert.equal(result.summary.sections, 1);
  assert.deepEqual(result.chart.song.notes[0].sectionNotes, [[0, 0, 0], [500, 4, 125]]);
  assert.equal(result.chart.song.player2, "gracusneongreen");
  assert.equal(result.chart.song.stage, "school");
  assert.equal(result.chart.song.speed, 2);
});

test("rejects a BPM mismatch instead of silently desynchronizing the chart", () => {
  const source = { song: { bpm: 120, notes: [{ sectionNotes: [[0, 0, 0]] }] } };
  assert.throws(() => normalizeChart(source, spec), /BPM mismatch/);
});

test("rejects invalid lane indexes", () => {
  const source = { song: { bpm: 150, notes: [{ sectionNotes: [[0, 8, 0]] }] } };
  assert.throws(() => normalizeChart(source, spec), /invalid lane/);
});

test("rejects an empty chart", () => {
  const source = { song: { bpm: 150, notes: [{ sectionNotes: [] }] } };
  assert.throws(() => normalizeChart(source, spec), /contains no notes/);
});
