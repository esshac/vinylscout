// SIMULATED inventory for the test run.
// Assumption: every participating store carries most of the Discogs vinyl catalogue.
// For any (store, Discogs release) pair we derive availability, condition, price and
// "last confirmed" date from a hash, so results are random-looking but stable across reloads.

const DAY = 24 * 60 * 60 * 1000;

// FNV-1a → [0, 1)
function rand(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}
const pick = (r, items) => {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let x = r * total;
  for (const [v, w] of items) { if ((x -= w) < 0) return v; }
  return items[items.length - 1][0];
};

/** Share of the catalogue a store carries: 60–88%, fixed per store ("most of the vinyls"). */
export function storeCoverage(storeId) { return 0.6 + rand(`cov|${storeId}`) * 0.28; }

/**
 * Simulated offer for one store + release, or null when the store doesn't have it.
 * `anchor` = when the test data was seeded (so the Tester tools clock can age it).
 * `storeConfirmedAt` = last time the store pressed "confirm all".
 */
export function simulateOffer(store, release, { anchor, storeConfirmedAt } = {}) {
  const k = `${store.id}|${release.id}`;
  if (rand(`has|${k}`) >= storeCoverage(store.id)) return null;

  const year = Number(release.year) || 0;
  const recent = year >= 2008;
  const condition = recent
    ? pick(rand(`cond|${k}`), [['New', 7], ['NM', 2], ['VG+', 1]])
    : pick(rand(`cond|${k}`), [['NM', 2], ['VG+', 5], ['VG', 4], ['G+', 1]]);

  const r = rand(`price|${k}`);
  let price;
  if (condition === 'New') price = 29 + r * 26;                       // $29–55 new
  else {
    const base = { NM: 32, 'VG+': 24, VG: 16, 'G+': 9 }[condition];
    const vintage = year && year < 1980 ? 1.5 : 1;                      // older originals cost more
    price = base * vintage * (0.7 + r * 0.9);
  }
  const twoLp = /2x|3x/i.test(release.format || '');
  if (twoLp) price *= 1.35;
  price = Math.round(price) - 0.01;

  // last confirmed: 55% this week, 27% 8–30 days, 13% 31–75 days, 5% never
  const fr = rand(`fresh|${k}`);
  const daysAgo = fr < 0.55 ? Math.floor(fr / 0.55 * 7)
    : fr < 0.82 ? 8 + Math.floor((fr - 0.55) / 0.27 * 23)
    : fr < 0.95 ? 31 + Math.floor((fr - 0.82) / 0.13 * 45)
    : null;
  let lastConfirmedAt = daysAgo == null ? null : (anchor ?? Date.now()) - daysAgo * DAY;
  if (storeConfirmedAt && (!lastConfirmedAt || storeConfirmedAt > lastConfirmedAt)) lastConfirmedAt = storeConfirmedAt;

  const copies = 1 + Math.floor(rand(`copies|${k}`) * (recent ? 4 : 2));

  return {
    id: `sim-${store.id}-${release.id}`,
    simulated: true,
    storeId: store.id,
    discogsId: release.id,
    artist: release.artist, title: release.title,
    year: release.year || '', format: release.format || 'LP',
    catalogNo: release.catalogNo || '', pressingNotes: [release.country && `${release.country} pressing`, release.label].filter(Boolean).join(' · '),
    coverUrl: release.cover || release.thumb || '',
    condition, price, copies,
    status: 'available',
    lastConfirmedAt,
  };
}

// ---------- Simulated shop-level stats for the Stores "showdown" hero ----------
export const GENRES = ['Jazz', 'Hip-hop', 'Rock', 'Soul', 'Electronic'];

/** Estimated records in the crates (catalogue size), stable per shop. */
export function storeCatalogue(storeId) {
  return Math.round((storeCoverage(storeId) * 16000 + rand(`size|${storeId}`) * 9000) / 100) * 100;
}

/** % of the shop's listings confirmed in the last 7 days; 100% if the shop pressed "confirm all" this week. */
export function storeFreshPct(storeId, storeConfirmedAt, now = Date.now()) {
  if (storeConfirmedAt && now - storeConfirmedAt < 7 * 24 * 60 * 60 * 1000) return 100;
  return Math.round(42 + rand(`freshpct|${storeId}`) * 50);
}

/** Estimated records of one genre: each shop leans toward a couple of genres. */
export function storeGenreCount(storeId, genre) {
  const lean = rand(`genre|${storeId}|${genre}`);
  const share = 0.03 + Math.pow(lean, 2.2) * 0.32; // most genres small, one or two big
  return Math.round(storeCatalogue(storeId) * share / 10) * 10;
}
