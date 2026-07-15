// Hand-curated Korean `model` key -> English display-name data.
// Kept separate from build-index.mjs so this list can grow freely without
// bloating the indexer script. Re-run `node build-index.mjs` after editing.

// The 12 protagonists ("Sinners"), keyed by their Korean `model` identifier so
// filtering stays correct even in scenes where they speak under an alias
// (e.g. Hong Lu appearing as "Jia Baoyu").
export const SINNERS_BY_MODEL = new Map([
  ['그레고르', 'Gregor'],
  ['이스마엘', 'Ishmael'],
  ['오티스', 'Outis'],
  ['돈키호테', 'Don Quixote'],
  ['파우스트', 'Faust'],
  ['뫼르소', 'Meursault'],
  ['로쟈', 'Rodion'],
  ['료슈', 'Ryōshū'],
  ['이상', 'Yi Sang'],
  ['홍루', 'Hong Lu'],
  ['히스클리프', 'Heathcliff'],
  ['싱클레어', 'Sinclair'],
]);

// Dante (the player's persona) and Vergilius (his AI) narrate huge amounts of
// story text without ever getting a nameplate, so the pairing-based learning
// in build-index.mjs never sees an EN translation for their bare model keys
// ("단테", "베르길리우스") or numbered variants. Both names are unambiguous
// across the whole game, so it's safe to fill them in by prefix instead of
// leaving raw Korean text on screen.
export const PREFIX_OVERRIDES = [
  ['단테', 'Dante'],
  ['베르길리우스', 'Vergilius'],
];

// Hand-confirmed names for model keys that never appear with an EN nameplate
// anywhere in the data, so the learned dictionary has no way to know them.
// Confirmed by the user, not inferred.
export const MANUAL_NAME_OVERRIDES = new Map([
  // Canto VII flashback figure Don Quixote (the Sinner) took her name from -
  // her father, not the Sinner herself.
  ['키호테빛', 'Don Quixote (Father)'],
  // Canto IX finger-clan patriarch; the game itself only ever shows him as
  // "???" on-screen, but the user confirmed his name.
  ['검지아비', 'Rien'],
  // "Ryōshū's daughter" - mostly shown as "???" pre-reveal, but the game
  // itself uses "Araya" as teller in 8 other lines with this same model key,
  // and the user confirmed the identity directly.
  ['료슈딸', 'Araya'],
  ['료슈딸2', 'Araya'],
  ['료슈딸연구실', 'Araya'],
]);
