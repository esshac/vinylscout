import React, { useEffect, useMemo, useState } from 'react';
import * as api from './api.js';
import { GENRES } from './simulate.js';
import { shortName, CENTER } from './poster/geo.js';

// Stores hero: a "shop showdown". The 12 shops stand as stacks of sleeves; a lens decides what the
// height means (nearest, freshest stock, best for a genre, biggest catalogue) and crowns a winner.
// Typing filters by shop name / neighbourhood. A clearly labelled featured (ad) spot sits on top;
// it never changes the rankings.

const INK = { NW: '#7d97ff', SW: '#ff5fa6', SE: '#ff7a3d', NE: '#ffd34d' };
// each genre gets its own sleeve print, so the stacks visibly change when you switch genre
const GENRE_PRINT = { Jazz: 'p1', 'Hip-hop': 'p2', Rock: 'p0', Soul: 'p3', Electronic: 'p4' };
const GENRE_DOT = { Jazz: '#7d97ff', 'Hip-hop': '#ffd34d', Rock: '#ff7a3d', Soul: '#ff5fa6', Electronic: '#5fe0c0' };
const MAX_SLEEVES = 10;
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const compact = (n) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function distKm(a, b) {
  const x = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180) * 111.32;
  const y = (b.lat - a.lat) * 110.57;
  return Math.hypot(x, y);
}

export default function ShopShowdown({ tracks, text = '', going = false, onOpen }) {
  const [lens, setLens] = useState('near');
  const [genre, setGenre] = useState('Jazz');
  const [origin, setOrigin] = useState({ ...CENTER, label: 'downtown' });
  const [geo, setGeo] = useState('idle');
  const featured = api.getFeatured();

  useEffect(() => { if (featured) api.trackAd('impression', featured.storeId); }, [featured?.storeId]); // eslint-disable-line

  const locate = () => {
    if (!navigator.geolocation) { setGeo('denied'); return; }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => { setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'you' }); setGeo('on'); },
      () => setGeo('denied'), { timeout: 8000, maximumAge: 600000 },
    );
  };

  const q = norm(text);
  const rows = useMemo(() => tracks.map((t) => {
    const s = t.store;
    const st = api.shopStats(s, genre);
    const km = distKm(origin, s);
    const match = !q || norm(`${s.name} ${s.neighbourhood} ${s.address}`).includes(q);
    const value = lens === 'near' ? -km : lens === 'genre' ? st.genreCount : st.catalogue;
    const label = lens === 'near' ? `${km.toFixed(1)}` : lens === 'genre' ? compact(st.genreCount) : compact(st.catalogue);
    return { t, km, st, match, value, label };
  }), [tracks, origin, lens, genre, q]);

  const anyMatch = rows.some((r) => r.match);
  const pool = anyMatch ? rows.filter((r) => r.match) : rows;
  const vals = pool.map((r) => r.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const height = (v) => (hi === lo ? MAX_SLEEVES : Math.round(2 + ((v - lo) / (hi - lo)) * (MAX_SLEEVES - 2)));
  const best = pool.reduce((b, r) => (!b || r.value > b.value ? r : b), null);

  const winnerText = !best ? '' : lens === 'near'
    ? <>Closest: <b>{best.t.store.name}</b> · {best.km.toFixed(1)} km from {origin.label}</>
    : lens === 'genre' ? <>Best for {genre.toLowerCase()}: <b>{best.t.store.name}</b> · ~{compact(best.st.genreCount)} records</>
    : <>Biggest catalogue: <b>{best.t.store.name}</b> · ~{compact(best.st.catalogue)} records</>;

  return (
    <div className={`sd ${going ? 'going' : ''}`}>
      {featured ? (
        <a className="feat" href={`#/store/${featured.store.id}`} onClick={() => api.trackAd('click', featured.storeId)}>
          <span className="feat-ad">Ad</span>
          <span className="feat-text"><b>{featured.store.name}</b> · {featured.store.neighbourhood}{featured.tagline ? ` — ${featured.tagline}` : ''}</span>
          <span className="feat-go">Visit →</span>
        </a>
      ) : (
        <a className="feat empty" href="#/portal">
          <span className="feat-ad">Ad spot</span>
          <span className="feat-text">Your shop here — feature your record store on VinylScout</span>
          <span className="feat-go">For stores →</span>
        </a>
      )}

      <div className="sd-lenses" role="tablist" aria-label="Compare shops by">
        <button type="button" role="tab" aria-selected={lens === 'near'} className={lens === 'near' ? 'active' : ''} onClick={() => setLens('near')}>Nearest</button>
        <button type="button" role="tab" aria-selected={lens === 'big'} className={lens === 'big' ? 'active' : ''} onClick={() => setLens('big')}>Biggest catalogue</button>
        <span className="sd-divider" aria-hidden="true" />
        <span className="sd-label">Best for</span>
        {GENRES.map((g) => {
          const on = lens === 'genre' && genre === g;
          return (
            <button key={g} type="button" role="tab" aria-selected={on} className={`sd-genre ${on ? 'active' : ''}`} style={{ '--dot': GENRE_DOT[g] }}
                    onClick={() => { setGenre(g); setLens('genre'); }}>
              <span className="sd-gdot" aria-hidden="true" />{g}
            </button>
          );
        })}
      </div>
      {lens === 'near' && (
        <div className="sd-sub">
          <button type="button" className={geo === 'on' ? 'active' : ''} onClick={locate} disabled={geo === 'locating'}>
            {geo === 'locating' ? 'Locating…' : geo === 'on' ? '📍 From your location' : '📍 Use my location'}
          </button>
          {geo === 'denied' && <span className="sd-note">Location unavailable — measuring from downtown</span>}
          {geo !== 'denied' && <span className="sd-note">Measuring from {origin.label}</span>}
        </div>
      )}

      <div className="sd-winner" key={`${lens}-${genre}-${origin.label}-${best?.t.store.id}`} aria-live="polite">
        {best && <button type="button" onClick={() => onOpen?.(best.t.store.id)}><span className="stk-crown">Winner</span>{winnerText}</button>}
        {q && !anyMatch && <span className="sd-note">No shop called “{text.trim()}” — looking for a record? Try the Vinyls tab.</span>}
      </div>

      <div className="stk-floor sd-floor" role="list" aria-label="Shops compared">
        {rows.map((r) => {
          const on = !anyMatch || r.match;
          const n = on ? height(r.value) : 2;
          const win = best && best.t.store.id === r.t.store.id;
          return (
            <button type="button" role="listitem" key={r.t.store.id} className={`stk-col ${win ? 'win' : ''} ${on ? '' : 'dim'}`}
                    style={{ '--ink': lens === 'genre' ? GENRE_DOT[genre] : INK[r.t.side.key] }} onClick={() => onOpen?.(r.t.store.id)}
                    aria-label={`${r.t.store.name}: ${r.label}${lens === 'near' ? ' km' : ''}`}>
              <span className="stk-count">{r.label}</span>
              <span className="stk-pile">
                {Array.from({ length: n }, (_, i) => (
                  <span key={`${lens}-${genre}-${i}`} className={`stk-sleeve sd-sleeve ${lens === 'genre' ? GENRE_PRINT[genre] : `p${(i + Number(r.t.code)) % 4}`}`}
                        style={{ '--i': i, '--rot': `${((i * 37 + Number(r.t.code) * 11) % 9) - 4}deg` }} />
                ))}
              </span>
              <span className="stk-base" />
              <span className="stk-name">{shortName(r.t.store.name)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
