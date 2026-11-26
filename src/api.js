// Mock backend for the VinylScout test variant.
// Data lives in the browser's localStorage so the prototype runs with zero setup.
// Every write goes through a permission check (FR-4) the same way a real server route would,
// so the logic can be moved to Express/Replit DB later without changing the UI.

import { buildSeed, EXAMPLE_AD } from './seed.js';
import { simulateOffer, storeCatalogue, storeFreshPct, storeGenreCount } from './simulate.js';

const DB_KEY = 'vinylscout:db:v4';
const SESSION_KEY = 'vinylscout:session:v1';
const DAY = 24 * 60 * 60 * 1000;

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let db = null;
const listeners = new Set();

function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(DB_KEY);
    db = raw ? JSON.parse(raw) : buildSeed();
  } catch { db = buildSeed(); }
  if (!db.meta.exampleAdSeeded) { // one-time: give older test data the example ad too
    db.featured = { ...EXAMPLE_AD, since: Date.now() };
    db.meta.exampleAdSeeded = true;
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore */ }
  }
  return db;
}
function save() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* storage blocked: keep in memory */ }
  listeners.forEach((fn) => fn());
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

// ---------- Test clock (lets testers jump ahead to see freshness labels age) ----------
export function now() { return Date.now() + (load().meta.clockOffsetDays || 0) * DAY; }
export function getClockOffset() { return load().meta.clockOffsetDays || 0; }
export function setClockOffset(days) { load().meta.clockOffsetDays = Number(days) || 0; save(); }
export function resetData() { db = buildSeed(); save(); }

// ---------- Freshness (FR-6) ----------
export function freshness(listing, at = now()) {
  if (!listing.lastConfirmedAt) return { key: 'unverified', label: 'Unverified', days: null };
  const days = Math.max(0, Math.floor((at - listing.lastConfirmedAt) / DAY));
  if (days <= 7) return { key: 'recent', label: 'Recently confirmed', days };
  if (days <= 30) return { key: 'stale', label: 'Needs reconfirmation', days };
  return { key: 'old', label: 'Out of date', days };
}

// ---------- Session / auth (demo accounts, no passwords in the test variant) ----------
export function currentUser() {
  const id = (() => { try { return localStorage.getItem(SESSION_KEY); } catch { return null; } })();
  const u = id && load().users.find((x) => x.id === id);
  return u && !u.disabled ? u : null;
}
export function demoUsers() { return load().users; }
export function signIn(userId) {
  const u = load().users.find((x) => x.id === userId);
  if (!u) throw new ApiError(401, 'Sign-in failed. Check your account details.');
  if (u.disabled) throw new ApiError(403, 'This account has been disabled by an administrator.');
  try { localStorage.setItem(SESSION_KEY, u.id); } catch { /* ignore */ }
  save();
  return u;
}
export function signOut() { try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } save(); }

function requireUser() {
  const u = currentUser();
  if (!u) throw new ApiError(401, 'Please sign in to continue.');
  return u;
}
function requireAdmin() {
  const u = requireUser();
  if (u.role !== 'admin') throw new ApiError(403, 'Administrator access only.');
  return u;
}
function requireStoreAccess(storeId) {
  const u = requireUser();
  const s = load().stores.find((x) => x.id === storeId);
  if (!s) throw new ApiError(404, 'Store not found.');
  if (u.role === 'admin') return { u, s };
  if (u.role !== 'store' || s.ownerId !== u.id) throw new ApiError(403, 'You can only manage your own store.');
  return { u, s };
}

// ---------- Analytics events (pilot metrics, §17) ----------
function track(type, data = {}) { load().events.push({ type, at: now(), ...data }); save(); }
export function trackContact(storeId, method) { track('contact_click', { storeId, method }); }

// ---------- Public reads ----------
const norm = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
const storeVisible = (s) => s && s.status === 'active';
function isPublic(l) {
  const s = load().stores.find((x) => x.id === l.storeId);
  return !l.hidden && l.status !== 'removed' && storeVisible(s);
}
function withStore(l) {
  return { ...l, store: load().stores.find((s) => s.id === l.storeId), fresh: freshness(l) };
}

// FR-1: case-insensitive, trimmed, unavailable/removed excluded from "currently available"
export function search(query, { includeUnavailable = false, log = true } = {}) {
  const q = norm(query);
  if (!q) return [];
  const terms = q.split(' ');
  const rows = load().listings
    .filter(isPublic)
    .filter((l) => includeUnavailable || l.status === 'available')
    .filter((l) => {
      const hay = `${norm(l.artist)} ${norm(l.title)}`;
      return terms.every((t) => hay.includes(t));
    })
    .map(withStore);
  const rank = { recent: 0, stale: 1, old: 2, unverified: 3 };
  rows.sort((a, b) => rank[a.fresh.key] - rank[b.fresh.key] || a.artist.localeCompare(b.artist));
  if (log) track('search', { q, results: rows.length });
  return rows;
}

// FR-2: viewing a listing never refreshes lastConfirmedAt
export function getListing(id) {
  const l = load().listings.find((x) => x.id === id);
  if (!l || !isPublic(l)) return null;
  return withStore(l);
}
export function listStores() { return load().stores.filter(storeVisible); }
export function getStore(id) {
  const s = load().stores.find((x) => x.id === id);
  if (!storeVisible(s)) return null;
  const listings = load().listings.filter((l) => l.storeId === id && isPublic(l) && l.status === 'available').map(withStore);
  return { ...s, listings };
}
// ---------- Simulated inventory (test run) ----------
// Every active store is assumed to carry most of the Discogs catalogue (see simulate.js).
// A real store-entered listing for the same Discogs release always wins over the simulation.
export function offerFor(store, release) {
  const d = load();
  const manual = d.listings.find((l) => l.storeId === store.id && l.discogsId === release.id && !l.hidden && l.status !== 'removed');
  if (manual) return withStore(manual);
  const sim = simulateOffer(store, release, { anchor: d.meta.seededAt, storeConfirmedAt: d.storeConfirmedAt?.[store.id] });
  return sim ? withStore(sim) : null;
}
export function offersForRelease(release) {
  const all = load().stores.filter(storeVisible).map((s) => offerFor(s, release));
  const rank = { recent: 0, stale: 1, old: 2, unverified: 3 };
  const available = all.filter((o) => o && o.status === 'available')
    .sort((a, b) => rank[a.fresh.key] - rank[b.fresh.key] || (a.price ?? 999) - (b.price ?? 999));
  return { available, storeCount: all.length };
}
export function logSearch(kind, q, results) { if (norm(q)) track(kind === 'stores' ? 'store_search' : 'search', { q: norm(q), results }); }

// "Stores" tab: match store name / neighbourhood / description, OR stores carrying matching records.
export function searchStores(query, { log = true } = {}) {
  const q = norm(query);
  const stores = load().stores.filter(storeVisible);
  const live = (s) => load().listings.filter((l) => l.storeId === s.id && isPublic(l) && l.status === 'available');
  const rows = stores.map((s) => {
    const listings = live(s);
    if (!q) return { store: s, total: listings.length, matches: [], score: 1 };
    const terms = q.split(' ');
    const hay = norm(`${s.name} ${s.neighbourhood} ${s.blurb} ${s.address}`);
    const profileHit = terms.every((t) => hay.includes(t));
    const matches = listings.filter((l) => terms.every((t) => `${norm(l.artist)} ${norm(l.title)}`.includes(t))).map(withStore);
    return { store: s, total: listings.length, matches, score: (profileHit ? 10 : 0) + matches.length };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score || a.store.name.localeCompare(b.store.name));
  if (log && q) track('store_search', { q, results: rows.length });
  return rows;
}

export function suggestions() {
  const set = new Set(load().listings.filter(isPublic).map((l) => l.artist));
  return [...set].slice(0, 6);
}

// FR-8: anyone can report; report never deletes the listing
export function reportListing(listingId, reason, note = '') {
  if (!reason) throw new ApiError(400, 'Please choose a reason.');
  if (!load().listings.some((l) => l.id === listingId)) throw new ApiError(404, 'Listing not found.');
  load().reports.push({ id: uid('r'), listingId, reason, note: note.slice(0, 500), createdAt: now(), status: 'open' });
  save();
}

// ---------- Store portal (FR-4, FR-5, FR-6) ----------
export function myStores() {
  const u = requireUser();
  if (u.role === 'admin') return load().stores;
  return load().stores.filter((s) => s.ownerId === u.id);
}
export function storeListings(storeId) {
  requireStoreAccess(storeId);
  return load().listings.filter((l) => l.storeId === storeId && l.status !== 'removed').map(withStore);
}

export function updateStore(storeId, patch) {
  const { s } = requireStoreAccess(storeId);
  if (!patch.name || !patch.name.trim()) throw new ApiError(400, 'Store name is required.');
  const allowed = ['name', 'neighbourhood', 'address', 'phone', 'website', 'instagram', 'hours', 'blurb'];
  allowed.forEach((k) => { if (k in patch) s[k] = String(patch[k] ?? '').trim(); });
  save();
  return s;
}

function validateListing(d) {
  const errors = {};
  if (!d.artist || !d.artist.trim()) errors.artist = 'Artist is required.';
  if (!d.title || !d.title.trim()) errors.title = 'Album title is required.';
  if (d.price !== '' && d.price != null) {
    const p = Number(d.price);
    if (Number.isNaN(p) || p < 0 || p > 100000) errors.price = 'Price must be a positive number.';
  }
  if (d.year && !/^\d{4}$/.test(String(d.year).trim())) errors.year = 'Use a 4-digit year, or leave blank.';
  if (Object.keys(errors).length) { const e = new ApiError(400, 'Please fix the highlighted fields.'); e.fields = errors; throw e; }
}
const clean = (d) => ({
  artist: d.artist.trim(), title: d.title.trim(),
  year: (d.year || '').toString().trim(), format: (d.format || '').trim(),
  catalogNo: (d.catalogNo || '').trim(), condition: (d.condition || '').trim(),
  pressingNotes: (d.pressingNotes || '').trim(),
  price: d.price === '' || d.price == null ? null : Math.round(Number(d.price) * 100) / 100,
  status: d.status === 'unavailable' ? 'unavailable' : 'available',
  // Optional link to the exact Discogs release (PRD §9.3 record identification)
  discogsId: Number.isInteger(Number(d.discogsId)) && Number(d.discogsId) > 0 ? Number(d.discogsId) : null,
  coverUrl: typeof d.coverUrl === 'string' && /^https:\/\/i\.discogs\.com\//.test(d.coverUrl) ? d.coverUrl : '',
});

export function createListing(storeId, data) {
  requireStoreAccess(storeId);
  validateListing(data);
  const t = now();
  const l = { id: uid('l'), storeId, hidden: false, ...clean(data), lastConfirmedAt: t, createdAt: t, updatedAt: t };
  load().listings.push(l);
  save();
  return l;
}
function ownListing(id) {
  const l = load().listings.find((x) => x.id === id);
  if (!l) throw new ApiError(404, 'Listing not found.');
  requireStoreAccess(l.storeId);
  return l;
}
export function updateListing(id, data, { confirm = false } = {}) {
  const l = ownListing(id);
  validateListing(data);
  Object.assign(l, clean(data), { updatedAt: now() });
  if (confirm) l.lastConfirmedAt = now();
  save();
  return l;
}
export function setAvailability(id, status) {
  const l = ownListing(id);
  l.status = status === 'available' ? 'available' : 'unavailable';
  l.updatedAt = now();
  l.lastConfirmedAt = now(); // the store is explicitly asserting current state
  save();
}
export function removeListing(id) { const l = ownListing(id); l.status = 'removed'; l.updatedAt = now(); save(); }
export function confirmListing(id) { const l = ownListing(id); l.lastConfirmedAt = now(); save(); track('confirm', { storeId: l.storeId, count: 1 }); }
export function confirmAll(storeId) {
  requireStoreAccess(storeId);
  const t = now(); let count = 0;
  load().storeConfirmedAt = { ...(load().storeConfirmedAt || {}), [storeId]: t }; // also refreshes simulated stock
  load().listings.forEach((l) => { if (l.storeId === storeId && l.status === 'available') { l.lastConfirmedAt = t; count++; } });
  save(); track('confirm', { storeId, count });
  return count;
}

// ---------- Admin (FR-10) ----------
export function adminOverview() {
  requireAdmin();
  const d = load();
  const listings = d.listings.map((l) => ({ ...withStore(l), reports: d.reports.filter((r) => r.listingId === l.id) }));
  const reports = d.reports.map((r) => ({ ...r, listing: listings.find((l) => l.id === r.listingId) }))
    .sort((a, b) => b.createdAt - a.createdAt);
  return { users: d.users, stores: d.stores, listings, reports };
}
export function resolveReport(id, status) {
  requireAdmin();
  const r = load().reports.find((x) => x.id === id);
  if (!r) throw new ApiError(404, 'Report not found.');
  r.status = status; r.resolvedAt = now(); save();
}
export function setListingHidden(id, hidden) {
  requireAdmin();
  const l = load().listings.find((x) => x.id === id);
  if (!l) throw new ApiError(404, 'Listing not found.');
  l.hidden = !!hidden; save();
}
export function setUserDisabled(id, disabled) {
  const admin = requireAdmin();
  if (admin.id === id) throw new ApiError(400, 'You cannot disable your own admin account.');
  const u = load().users.find((x) => x.id === id);
  if (!u) throw new ApiError(404, 'User not found.');
  u.disabled = !!disabled;
  load().stores.filter((s) => s.ownerId === id).forEach((s) => { s.status = disabled ? 'suspended' : 'active'; });
  save();
}

/** Simulated shop-level stats (catalogue size, freshness, genre depth) for the Stores showdown. */
export function shopStats(store, genre) {
  const d = load();
  return {
    catalogue: storeCatalogue(store.id),
    freshPct: storeFreshPct(store.id, d.storeConfirmedAt?.[store.id], now()),
    genreCount: genre ? storeGenreCount(store.id, genre) : 0,
  };
}

// ---------- Featured (paid) spot ----------
// One shop can be featured in the Stores hero. It is always labelled "Ad", never changes rankings,
// and impressions/clicks are tracked so the spot can be sold to shops with real numbers.
export function getFeatured() {
  const f = load().featured;
  if (!f) return null;
  const store = load().stores.find((s) => s.id === f.storeId);
  return storeVisible(store) ? { ...f, store } : null;
}
export function setFeatured(storeId, tagline = '') {
  requireAdmin();
  if (!storeId) { load().featured = null; save(); return; }
  if (!load().stores.some((s) => s.id === storeId)) throw new ApiError(404, 'Store not found.');
  load().featured = { storeId, tagline: String(tagline).trim().slice(0, 80), since: now(), example: false };
  save();
}
const seenAds = new Set();
export function trackAd(kind, storeId) {
  if (kind === 'impression') { if (seenAds.has(storeId)) return; seenAds.add(storeId); } // once per page load
  track(kind === 'click' ? 'ad_click' : 'ad_impression', { storeId });
}

// Pilot metrics (PRD §5.2 and §17)
export function pilotMetrics() {
  requireAdmin();
  const d = load();
  const active = d.listings.filter((l) => isPublic(l) && l.status === 'available');
  const fresh = active.filter((l) => freshness(l).key === 'recent').length;
  const searches = d.events.filter((e) => e.type === 'search');
  const failed = {};
  searches.filter((e) => e.results === 0).forEach((e) => { failed[e.q] = (failed[e.q] || 0) + 1; });
  return {
    stores: d.stores.filter(storeVisible).length,
    activeListings: active.length,
    freshPct: active.length ? Math.round((fresh / active.length) * 100) : 0,
    searches: searches.length,
    searchesWithResults: searches.filter((e) => e.results > 0).length,
    contactClicks: d.events.filter((e) => e.type === 'contact_click').length,
    confirmations: d.events.filter((e) => e.type === 'confirm').reduce((a, e) => a + (e.count || 0), 0),
    failedQueries: Object.entries(failed).sort((a, b) => b[1] - a[1]).slice(0, 8),
    openReports: d.reports.filter((r) => r.status === 'open').length,
    adImpressions: d.events.filter((e) => e.type === 'ad_impression').length,
    adClicks: d.events.filter((e) => e.type === 'ad_click').length,
  };
}

// Exposed for permission tests in docs/TEST_PLAN.md (try these from the browser console).
if (typeof window !== 'undefined') {
  window.vinylscoutApi = { updateListing, createListing, removeListing, confirmAll, adminOverview, setUserDisabled, currentUser };
}
