import React from 'react';
import { SIDES } from './geo.js';
import { Cover } from '../DiscogsUI.jsx';
import * as api from '../api.js';

// The store list, styled as the back of a record sleeve: four sides, numbered tracks,
// dotted leaders, and "duration" = distance from downtown. Hover syncs with the poster map.

export default function SleeveTracklist({ tracks, hovered, onHover, matchList, query }) {
  const filtering = matchList != null;
  const shown = filtering ? tracks.filter((t) => (matchList[t.store.id] || []).length || t.profileHit) : tracks;

  return (
    <section className="sleeve-back" aria-label="Calgary record shops">
      <header className="sb-head">
        <span className="sb-logo">VINYL<b>SCOUT</b></span>
        <span className="sb-cat">VS-YYC-026 · STEREO · 33⅓</span>
      </header>
      <h2 className="sb-title">{filtering ? <>Shops with “{query}”</> : <>Calgary Record Shops</>}</h2>
      <p className="sb-meta">
        {filtering ? `${shown.length} of ${tracks.length} shops · ` : `${tracks.length} shops · 4 quadrants · `}
        <span>times shown = km from downtown</span>
      </p>

      {SIDES.map((side) => {
        const rows = shown.filter((t) => t.side.key === side.key);
        if (!rows.length) return null;
        return (
          <div className="sb-side" key={side.key}>
            <h3 className="sb-side-h"><span className="sb-dot" style={{ background: side.ink }} />{side.label}</h3>
            <ol className="sb-tracks">
              {rows.map((t) => {
                const m = filtering ? matchList[t.store.id] || [] : [];
                const s = t.store;
                return (
                  <li key={s.id} className={`sb-track ${hovered === s.id ? 'hover' : ''}`}
                      onMouseEnter={() => onHover(s.id)} onMouseLeave={() => onHover(null)}>
                    <a className="sb-row" href={`#/store/${s.id}`} onFocus={() => onHover(s.id)} onBlur={() => onHover(null)}>
                      <span className="sb-code" style={{ '--side': side.ink }}>{t.code}</span>
                      <span className="sb-name">{s.name}</span>
                      <span className="sb-leader" aria-hidden="true" />
                      <span className="sb-time">{t.km.toFixed(1)} km</span>
                    </a>
                    <div className="sb-sub">
                      <span>{s.neighbourhood} · {s.address.replace(', Calgary, AB', '')}</span>
                      <span className="sb-actions">
                        {s.phone && <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} onClick={() => api.trackContact(s.id, 'phone')}>Call</a>}
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => api.trackContact(s.id, 'directions')}>Directions ↗</a>
                      </span>
                    </div>
                    {m.length > 0 && (
                      <div className="sb-matches">
                        {m.slice(0, 5).map((o) => (
                          <a key={o.id} href={`#/release/${o.discogsId}?store=${s.id}`} title={`${o.title} — ${o.artist} · $${o.price}`}>
                            <Cover listing={o} size={40} />
                          </a>
                        ))}
                        <span className="sb-match-n">{m.length} match{m.length === 1 ? '' : 'es'}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
      {filtering && !shown.length && <p className="sb-empty">No shop matched. Try a neighbourhood or another artist.</p>}

      <footer className="sb-foot">
        <div className="sb-barcode" aria-hidden="true" />
        <p>℗ 2026 VinylScout · Recorded live in Calgary, Alberta · Shop details via Google Maps · Records via Discogs.<br />Call ahead before you dig — crates change daily.</p>
      </footer>
    </section>
  );
}
