import React from 'react';
import * as api from '../api.js';
import { trackify } from './geo.js';
import { FreshBadge, money } from '../components.jsx';

// Shared "record sleeve back" design language (Stores tab tracklist, Vinyls tab chart, results, release page):
// dark sleeve, Anton headings, DM Mono text, riso-ink track numbers, dotted leaders, barcode footer.

let trackCache = null;
/** A shop's poster number + quadrant ink, consistent across every page. */
export function trackOf(storeId) {
  if (!trackCache) trackCache = new Map(trackify(api.listStores()).map((t) => [t.store.id, t]));
  return trackCache.get(storeId) || { code: '•', side: { ink: '#f3e9d6' }, km: 0 };
}

export function SleeveHead({ cat = 'VS-YYC-026 · STEREO · 33⅓' }) {
  return (
    <header className="sb-head">
      <span className="sb-logo">VINYL<b>SCOUT</b></span>
      <span className="sb-cat">{cat}</span>
    </header>
  );
}

export function SleeveFoot({ children }) {
  return (
    <footer className="sb-foot">
      <div className="sb-barcode" aria-hidden="true" />
      <p>{children}</p>
    </footer>
  );
}

/** One shop's copy of a record, as a tracklist row: shop ····· price, then details. (Shop numbers live on the Stores tab only.) */
export function OfferTrack({ o, i = 0, highlight = false }) {
  const href = o.simulated ? `#/release/${o.discogsId}?store=${o.storeId}` : `#/listing/${o.id}`;
  const details = [o.store.neighbourhood, o.condition && `Cond. ${o.condition}`, o.copies > 1 && `${o.copies} copies`].filter(Boolean).join(' · ');
  return (
    <li className={`sb-track no-code rise ${highlight ? 'hover pinned' : ''}`} style={{ '--i': i }}>
      <a className="sb-row" href={href}>
        <span className="sb-name">{o.store.name}</span>
        <span className="sb-leader" aria-hidden="true" />
        <span className="sb-time sb-price">{money(o.price) ?? '—'}</span>
      </a>
      <div className="sb-sub">
        <span>{details}</span>
        <FreshBadge fresh={o.fresh} long />
      </div>
    </li>
  );
}
