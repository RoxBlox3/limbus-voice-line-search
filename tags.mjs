// Hand-curated Korean `model` key -> tag list, in the same spirit as
// name-overrides.mjs. Tags are free-form "Category: Value" strings (e.g.
// "Role: Fixer", "Faction: Ryōshū Family"). This map only needs entries for
// characters someone has actually identified — everyone else still gets an
// automatic Canto/Interlude tag from build-index.mjs, and stays findable by
// name via the search box. Add to this map incrementally; no need to cover
// all 532 speakers up front. Re-run `node build-index.mjs` after editing.
export const CHARACTER_TAGS = new Map([
  // Example seed entries using the Sinners' own model keys — extend freely.
  ['그레고르', ['Role: Sinner']],
  ['이스마엘', ['Role: Sinner']],
  ['오티스', ['Role: Sinner']],
  ['돈키호테', ['Role: Sinner']],
  ['파우스트', ['Role: Sinner']],
  ['뫼르소', ['Role: Sinner']],
  ['로쟈', ['Role: Sinner']],
  ['료슈', ['Role: Sinner']],
  ['이상', ['Role: Sinner']],
  ['홍루', ['Role: Sinner']],
  ['히스클리프', ['Role: Sinner']],
  ['싱클레어', ['Role: Sinner']],
]);
