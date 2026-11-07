import fs from "node:fs";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const ENGINE = "Psych Engine 0.6.3";

function fail(message) {
  console.error("FNF AI planner error:", message);
  process.exit(1);
}

function validateSpec(spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw new Error("AI response is not a JSON object.");
  if (typeof spec.mod !== "string" || !spec.mod.trim()) throw new Error("Missing mod title.");
  if (spec.engine !== ENGINE) throw new Error(`Engine must be exactly "${ENGINE}".`);
  if (!spec.song || typeof spec.song !== "object") throw new Error("Missing song object.");
  if (typeof spec.song.name !== "string" || !spec.song.name.trim()) throw new Error("Missing song name.");
  if (!Number.isFinite(spec.song.bpm) || spec.song.bpm <= 0 || spec.song.bpm > 400) throw new Error("Song BPM must be between 0 and 400.");
  if (!Number.isFinite(spec.song.durationSeconds) || spec.song.durationSeconds <= 0 || spec.song.durationSeconds > 900) throw new Error("Song duration must be between 0 and 900 seconds.");
  if (typeof spec.song.difficulty !== "string" || !spec.song.difficulty.trim()) throw new Error("Missing song difficulty.");
  if (!spec.characters || typeof spec.characters !== "object") throw new Error("Missing characters object.");
  for (const key of ["player", "opponent"]) {
    if (typeof spec.characters[key] !== "string" || !spec.characters[key].trim()) throw new Error(`Missing characters.${key}.`);
  }
  if (typeof spec.stage !== "string" || !spec.stage.trim()) throw new Error("Missing stage.");
  if (spec.chart !== undefined) {
    if (spec.chart.seed !== undefined && !Number.isInteger(spec.chart.seed)) throw new Error("chart.seed must be an integer.");
    if (spec.chart.notesPerSection !== undefined &&
        (!Number.isInteger(spec.chart.notesPerSection) || spec.chart.notesPerSection < 1 || spec.chart.notesPerSection > 64)) {
      throw new Error("chart.notesPerSection must be an integer from 1 to 64.");
    }
  }
  return spec;
}

function extractJson(text) {
  const trimmed = text.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model did not return a JSON object.");
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function main() {
  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) fail('Usage: ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=... node src/ai/plan-mod.mjs "Describe your FNF mod"');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey) fail("Set ANTHROPIC_API_KEY in your environment. Never put API keys in mod files or Git.");
  if (!model) fail("Set ANTHROPIC_MODEL to an Anthropic model available to your account.");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1600,
      system: [
        "You are an expert Friday Night Funkin' mod planner.",
        "Return exactly one JSON object and no markdown.",
        "Create a planning specification only; do not claim to create audio, images, sprite sheets, Lua scripts, or playable charts.",
        "Use this exact schema: {mod:string, song:{name:string,bpm:number,durationSeconds:number,difficulty:string}, engine:'Psych Engine 0.6.3', characters:{player:string,opponent:string,girlfriend?:string}, stage:string, chart?:{seed?:integer,notesPerSection?:integer}}.",
        "The engine must be exactly Psych Engine 0.6.3. Use valid simple asset IDs for character and stage names.",
        "Choose realistic BPM from 60 to 240, durationSeconds from 30 to 300, and notesPerSection from 2 to 8 unless the user requests otherwise.",
        "If the user omits details, make sensible creative choices. Do not include extra keys."
      ].join("\n"),
      messages: [{ role: "user", content: prompt }]
    })
  });

  const raw = await response.text();
  let payload;
  try { payload = JSON.parse(raw); } catch { throw new Error(`Anthropic returned non-JSON HTTP ${response.status}: ${raw.slice(0, 500)}`); }
  if (!response.ok) throw new Error(payload.error?.message || `Anthropic request failed with HTTP ${response.status}.`);

  const text = (payload.content || []).filter(block => block.type === "text").map(block => block.text).join("\n");
  const spec = validateSpec(extractJson(text));
  const output = process.env.FNF_SPEC_OUT || "generated-mod.spec.json";
  fs.writeFileSync(output, JSON.stringify(spec, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ ok: true, output, engine: spec.engine, mod: spec.mod, song: spec.song.name }, null, 2));
}

main().catch(error => fail(error.message));
