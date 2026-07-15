import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { SINNERS_BY_MODEL, PREFIX_OVERRIDES, MANUAL_NAME_OVERRIDES } from './name-overrides.mjs';
import { CHARACTER_TAGS } from './tags.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // .../test-sinners
const TEXT_JSON_DIR = path.join(ROOT, 'Text', 'Json');
const TEXT_JSON_EN_DIR = path.join(TEXT_JSON_DIR, 'EN');
const AUDIO_DIR = path.join(ROOT, 'Audio', 'Story');
const OUT_FILE = path.join(__dirname, 'index.json');
const OVERLAY_TAGS_FILE = path.join(__dirname, 'character-tags.json');
const AUDIO_EXTS = new Set(['.wav', '.ogg', '.mp3']);

// Tags added live from the browser (server.mjs's POST /api/tags) land here,
// on top of the hand-curated seed in tags.mjs, so they survive a rebuild.
function readOverlayTags() {
  try {
    return JSON.parse(fs.readFileSync(OVERLAY_TAGS_FILE, 'utf8'));
  } catch {
    return {};
  }
}
const overlayTags = readOverlayTags();

function tagsForModel(model) {
  if (!model) return [];
  const seed = CHARACTER_TAGS.get(model) || [];
  const overlay = overlayTags[model] || [];
  return [...new Set([...seed, ...overlay])];
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function buildAudioIndex(dir) {
  const map = new Map(); // basename without extension -> absolute path
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (AUDIO_EXTS.has(ext)) {
          const base = entry.name.slice(0, -ext.length);
          if (!map.has(base)) map.set(base, full);
        }
      }
    }
  }
  walk(dir);
  return map;
}

console.log('Scanning audio files under', AUDIO_DIR, '...');
const audioIndex = buildAudioIndex(AUDIO_DIR);
console.log(`Found ${audioIndex.size} audio files.`);

console.log('Scanning EN story text under', TEXT_JSON_EN_DIR, '...');
const enFiles = fs
  .readdirSync(TEXT_JSON_EN_DIR)
  .filter((f) => f.startsWith('EN_') && f.endsWith('.json'));

// Build a Korean model-name -> English display-name dictionary straight from
// the game's own localization: whenever a row already has both `model` (KR)
// and `teller` (EN) filled in, that pairing tells us the translation. We take
// the most frequent EN name seen for each KR model as the canonical one.
console.log('Building Korean -> English name dictionary from existing translations...');
const nameCounts = new Map(); // model(KR) -> Map(teller(EN) -> count)
for (const enFile of enFiles) {
  const data = readJsonSafe(path.join(TEXT_JSON_EN_DIR, enFile));
  if (!data?.dataList) continue;
  for (const row of data.dataList) {
    if (!row.model || !row.teller) continue;
    if (!nameCounts.has(row.model)) nameCounts.set(row.model, new Map());
    const counts = nameCounts.get(row.model);
    counts.set(row.teller, (counts.get(row.teller) || 0) + 1);
  }
}
const nameDictionary = new Map();
for (const [model, counts] of nameCounts) {
  const [bestName] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  nameDictionary.set(model, bestName);
}
console.log(`Learned ${nameDictionary.size} Korean -> English name mappings.`);

function resolveByPrefix(model) {
  for (const [prefix, name] of PREFIX_OVERRIDES) {
    if (model.startsWith(prefix)) return name;
  }
  return null;
}

// Derives a story-arc tag straight from the audio folder structure the game
// data already ships with (e.g. "Main Story/Canto IX/..." -> "Arc: Canto IX",
// "Detour Tales/Intervallo V-1/..." -> "Arc: Intervallo V-1"), so every
// story entry gets a grouping for free, with no manual identification
// required. Dante's UI voice barks ("Dante/D_Normal.wav") aren't part of any
// story arc, so they're left untagged here.
function deriveArcTag(audioPath) {
  const [top, sub] = audioPath.split('/');
  if (top === 'Main Story' || top === 'Detour Tales' || top === 'Events') {
    return `Arc: ${sub}`;
  }
  return null;
}

const entries = [];
let matchedChapters = 0;

for (const enFile of enFiles) {
  const chapter = enFile.slice('EN_'.length, -'.json'.length);
  const sourceFile = path.join(TEXT_JSON_DIR, `${chapter}.json`);
  if (!fs.existsSync(sourceFile)) continue;

  const enData = readJsonSafe(path.join(TEXT_JSON_EN_DIR, enFile));
  const sourceData = readJsonSafe(sourceFile);
  if (!enData?.dataList || !sourceData?.dataList) continue;

  matchedChapters++;

  const voiceById = new Map();
  for (const row of sourceData.dataList) {
    if (row.voice) voiceById.set(row.id, row.voice);
  }

  for (const row of enData.dataList) {
    if (!row.content) continue;
    const voiceId = voiceById.get(row.id);
    if (!voiceId) continue;
    const audioPath = audioIndex.get(voiceId);
    if (!audioPath) continue;

    const character =
      row.teller ||
      (row.model && MANUAL_NAME_OVERRIDES.get(row.model)) ||
      (row.model && nameDictionary.get(row.model)) ||
      (row.model && resolveByPrefix(row.model)) ||
      row.model ||
      null;
    const sinner = row.model ? SINNERS_BY_MODEL.get(row.model) || null : null;
    const relAudioPath = path.relative(AUDIO_DIR, audioPath).split(path.sep).join('/');
    const tags = [deriveArcTag(relAudioPath), ...tagsForModel(row.model)].filter(Boolean);

    entries.push({
      chapter,
      id: row.id,
      teller: character,
      model: row.model || null,
      title: row.title || null,
      place: row.place || null,
      content: row.content,
      voiceId,
      audioPath: relAudioPath,
      sinner,
      tags,
    });
  }
}

console.log(`Matched ${matchedChapters} chapters -> ${entries.length} voicelines with audio.`);

const sinnerCounts = new Map();
for (const e of entries) {
  if (e.sinner) sinnerCounts.set(e.sinner, (sinnerCounts.get(e.sinner) || 0) + 1);
}
console.log('Sinner line counts:', Object.fromEntries(sinnerCounts));

fs.writeFileSync(OUT_FILE, JSON.stringify(entries));
console.log('Wrote', OUT_FILE);
