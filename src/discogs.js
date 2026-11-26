// Discogs client for VinylScout.
// All calls go through the dev-server proxy at /api/discogs (see vite.config.js).
// Responses are cached briefly in localStorage so repeat views don't spend rate limit
// (Discogs: 25 req/min without a token, 60 with one).
// Discogs API Terms of Use: content may not be shown if it is more than 6 hours older than
// discogs.com, and may not be cached longer than needed — so the cache TTL is under 6 hours.

const BASE = '/api/discogs';
const CACHE_KEY = 'vinylscout:discogs-cache:v2';
const TTL = 5 * 60 * 60 * 1000; // 5 hours (< the 6-hour limit in the Discogs API terms)
const MAX_ENTRIES = 300;

export class DiscogsError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ---------- cache ----------
let cache = null;
function loadCache() {
  if (cache) return cache;
  try { localStorage.removeItem('vinylscout:discogs-cache:v1'); } catch { /* old 7-day cache */ }
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { cache = {}; }
  return cache;
}
function getCached(key) {
  const e = loadCache()[key];
  return e && Date.now() - e.at < TTL ? e.v : undefined;
}
function setCached(key, v) {
  const c = loadCache();
  c[key] = { at: Date.now(), v };
  const keys = Object.keys(c);
  if (keys.length > MAX_ENTRIES) keys.sort((a, b) => c[a].at - c[b].at).slice(0, keys.length - MAX_ENTRIES).forEach((k) => delete c[k]);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* storage full or blocked */ }
}
export function clearDiscogsCache() { cache = {}; try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ } }

// ---------- request queue (one at a time, backs off on 429) ----------
let chain = Promise.resolve();
let pausedUntil = 0;
const inflight = new Map();

function request(path) {
  if (inflight.has(path)) return inflight.get(path);
  const p = (chain = chain.then(async () => {
    const wait = pausedUntil - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    let res;
    try { res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } }); }
    catch { throw new DiscogsError(0, 'Can’t reach Discogs right now. Check your connection.'); }
    if (res.status === 429) { pausedUntil = Date.now() + 30_000; throw new DiscogsError(429, 'Discogs rate limit reached. Try again in about 30 seconds.'); }
    if (res.status === 404) throw new DiscogsError(404, 'Not found on Discogs.');
    if (res.status === 401) throw new DiscogsError(401, 'Discogs rejected the token. Check DISCOGS_TOKEN in .env.local.');
    if (!res.ok) throw new DiscogsError(res.status, `Discogs error (${res.status}).`);
    const remaining = Number(res.headers.get('x-discogs-ratelimit-remaining'));
    if (remaining === 0) pausedUntil = Date.now() + 60_000;
    else if (remaining && remaining < 3) pausedUntil = Date.now() + 2_500;
    return res.json();
  }).finally(() => inflight.delete(path)));
  chain = p.catch(() => {}); // keep the queue alive after a failure
  inflight.set(path, p);
  return p;
}

let statusPromise = null;
export function discogsStatus() {
  if (!statusPromise) statusPromise = fetch('/api/discogs-status').then((r) => (r.ok ? r.json() : { token: false })).catch(() => ({ token: false }));
  return statusPromise;
}

// ---------- shaping ----------
// Discogs disambiguates duplicate artist names as "Name (2)"; strip that for display.
const cleanName = (s = '') => s.replace(/\s\(\d+\)$/, '').trim();
const uniq = (a) => [...new Set(a.filter(Boolean))];

function splitTitle(full = '') {
  const i = full.indexOf(' - ');
  return i === -1 ? { artist: '', title: full } : { artist: cleanName(full.slice(0, i)), title: full.slice(i + 3).trim() };
}

function shapeSearchResult(r) {
  const { artist, title } = splitTitle(r.title);
  const fmt = r.formats?.[0];
  const descriptions = uniq([...(fmt?.descriptions || [])]);
  return {
    id: r.id,
    masterId: r.master_id || null,
    artist, title,
    year: r.year || '',
    country: r.country || '',
    label: r.label?.[0] || '',
    catalogNo: r.catno && r.catno !== 'none' ? r.catno : '',
    format: shortFormat(fmt?.qty, descriptions),
    formatText: fmt?.text || '',
    thumb: r.thumb && !r.thumb.includes('spacer.gif') ? r.thumb : '',
    cover: r.cover_image && !r.cover_image.includes('spacer.gif') ? r.cover_image : '',
    url: r.uri ? `https://www.discogs.com${r.uri}` : `https://www.discogs.com/release/${r.id}`,
    have: r.community?.have ?? null,
    want: r.community?.want ?? null,
  };
}

function shortFormat(qty, descriptions = []) {
  const size = descriptions.find((d) => /^\d+"$/.test(d));
  const kind = descriptions.find((d) => ['LP', 'EP', 'Single', 'Maxi-Single'].includes(d)) || 'LP';
  const n = Number(qty) > 1 ? `${qty}x` : '';
  return kind === 'LP' ? `${n}LP` : [n + (size || ''), kind].filter(Boolean).join(' ');
}

function shapeRelease(r) {
  const fmt = r.formats?.find((f) => f.name === 'Vinyl') || r.formats?.[0];
  const descriptions = uniq(fmt?.descriptions || []);
  const primary = r.images?.find((i) => i.type === 'primary') || r.images?.[0];
  return {
    id: r.id,
    masterId: r.master_id || null,
    artist: (r.artists || []).map((a) => cleanName(a.anv || a.name) + (a.join ? ` ${a.join}` : '')).join(' ').replace(/\s+,/g, ',').trim(),
    title: r.title,
    year: r.year ? String(r.year) : '',
    released: r.released_formatted || '',
    country: r.country || '',
    label: r.labels?.[0]?.name ? cleanName(r.labels[0].name) : '',
    catalogNo: r.labels?.[0]?.catno && r.labels[0].catno !== 'none' ? r.labels[0].catno : '',
    format: shortFormat(fmt?.qty, descriptions),
    formatDetails: uniq([...(descriptions || []), fmt?.text]).join(', '),
    genres: uniq([...(r.genres || []), ...(r.styles || [])]).slice(0, 5),
    tracklist: (r.tracklist || []).filter((t) => t.type_ === 'track').map((t) => ({ position: t.position, title: t.title, duration: t.duration })),
    cover: primary?.uri || '',
    thumb: primary?.uri150 || r.thumb || '',
    url: r.uri ? (r.uri.startsWith('http') ? r.uri : `https://www.discogs.com${r.uri}`) : `https://www.discogs.com/release/${r.id}`,
    have: r.community?.have ?? null,
    want: r.community?.want ?? null,
  };
}

// ---------- public API ----------
/** Search vinyl releases. Returns up to `limit` shaped results. */
export async function searchReleases(query, { limit = 8 } = {}) {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  // results differ with/without a token (covers only come with one), so cache them separately
  const { token } = await discogsStatus();
  const key = `s:${token ? "t" : "n"}:${q.toLowerCase()}:${limit}`;
  const hit = getCached(key);
  if (hit) return hit;
  const params = new URLSearchParams({ q, type: 'release', format: 'Vinyl', per_page: String(limit) });
  const data = await request(`/database/search?${params}`);
  const out = (data.results || []).map(shapeSearchResult);
  setCached(key, out);
  return out;
}

/**
 * Popular vinyl releases, ranked by Discogs community counts.
 * sort: 'want' (most wanted) | 'have' (most collected); year: optional release year.
 * Many pressings of the same album rank highly, so results are de-duplicated by master release.
 */
export async function popularReleases({ sort = 'want', year = '', limit = 12 } = {}) {
  const { token } = await discogsStatus();
  const key = `p:${token ? 't' : 'n'}:${sort}:${year}:${limit}`;
  const hit = getCached(key);
  if (hit) return hit;
  const params = new URLSearchParams({ type: 'release', format: 'Vinyl', sort, sort_order: 'desc', per_page: '60' });
  if (year) params.set('year', String(year));
  const data = await request(`/database/search?${params}`);
  const seen = new Set();
  const out = [];
  for (const r of (data.results || []).map(shapeSearchResult)) {
    const k = r.masterId || `r${r.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
    if (out.length >= limit) break;
  }
  setCached(key, out);
  return out;
}

/** Full release details (tracklist, images, label…). Works without a token. */
export async function getRelease(id) {
  if (!id) return null;
  const key = `r:${id}`;
  const hit = getCached(key);
  if (hit) return hit;
  const data = await request(`/releases/${encodeURIComponent(id)}`);
  const out = shapeRelease(data);
  setCached(key, out);
  return out;
}

/** Cached-only lookup, for rendering without a network call. */
export function peekRelease(id) { return id ? getCached(`r:${id}`) : undefined; }
