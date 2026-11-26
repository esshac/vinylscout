import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as api from './api.js';
import { GENRES } from './simulate.js';

// Stores hero: holographic trading cards, one per shop. A foil shimmer + 3D tilt follow the pointer;
// swipe/drag, ‹ › or arrow keys flip through the deck; "Add to my dig list" saves shops (this browser);
// typing filters the deck by shop name or neighbourhood. The ad shop's card leads the deck, labelled "Ad"
// with an animated rainbow border.

const INK = { NW: '#7d97ff', SW: '#ff5fa6', SE: '#ff7a3d', NE: '#ffd34d' };
const DIG_KEY = 'vinylscout:diglist:v1';
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const compact = (n) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function useDigList() {
  const [ids, setIds] = useState(() => { try { return JSON.parse(localStorage.getItem(DIG_KEY)) || []; } catch { return []; } });
  const toggle = (id) => setIds((cur) => {
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try { localStorage.setItem(DIG_KEY, JSON.stringify(next)); } catch { /* storage blocked: keep in memory */ }
    return next;
  });
  return [ids, toggle];
}

function Card({ t, total, saved, onSave, onOpen, active, ad }) {
  const ref = useRef(null);
  const s = t.store;
  const st = useMemo(() => api.shopStats(s), [s]);
  const best = useMemo(() => GENRES.map((g) => ({ g, n: api.shopStats(s, g).genreCount })).sort((a, b) => b.n - a.n)[0], [s]);
  const ink = INK[t.side.key];
  const open = () => { if (ad) api.trackAd('click', s.id); onOpen?.(s.id); };

  // foil + tilt follow the pointer (CSS variables, no re-render)
  const onMove = (e) => {
    const el = ref.current; if (!el || !active) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.setProperty('--rx', `${(0.5 - y) * 14}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * 18}deg`);
    el.style.setProperty('--foil', '1');
  };
  const onLeave = () => {
    const el = ref.current; if (!el) return;
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.style.setProperty('--foil', '.45');
  };

  return (
    <article ref={ref} className={`hc ${active ? 'active' : ''} ${ad ? 'ad' : ''}`} style={{ '--ink': ink }} onPointerMove={onMove} onPointerLeave={onLeave}
             aria-label={`${ad ? 'Ad. ' : ''}${s.name}, ${s.neighbourhood}. About ${compact(st.catalogue)} records, ${t.km.toFixed(1)} km from downtown, best for ${best.g}.`}>
      <div className="hc-inner">
        <header className="hc-top">
          <span className="hc-no">No. {t.code.padStart(2, '0')}/{String(total).padStart(2, '0')}</span>
          {ad
            ? <span className="hc-tags"><span className="hc-ultra">ULTRA</span><span className="hc-ad">Ad</span></span>
            : <span className="hc-holo">HOLO</span>}
        </header>
        <button type="button" className={`hc-art pat${Number(t.code) % 3}`} onClick={open} tabIndex={active ? 0 : -1} aria-label={`Open ${s.name}`}>
          <span className="hc-disc" aria-hidden="true" />
          <span className="hc-quad">{t.side.key}</span>
        </button>
        <h3 className="hc-name">{s.name}</h3>
        <p className="hc-hood">{s.neighbourhood} · {t.side.label}</p>
        <dl className="hc-stats">
          <div><dt>Catalogue</dt><dd>~{compact(st.catalogue)}</dd></div>
          <div><dt>Distance</dt><dd>{t.km.toFixed(1)} km</dd></div>
          <div><dt>Best for</dt><dd>{best.g}</dd></div>
        </dl>
        <div className="hc-actions">
          <button type="button" className={`hc-save ${saved ? 'on' : ''}`} onClick={() => onSave(s.id)} tabIndex={active ? 0 : -1} aria-pressed={saved}>
            {saved ? '★ On my dig list' : '☆ Add to my dig list'}
          </button>
          <button type="button" className="hc-open" onClick={open} tabIndex={active ? 0 : -1}>Visit →</button>
        </div>
      </div>
      <span className="hc-foil" aria-hidden="true" />
      <span className="hc-glare" aria-hidden="true" />
    </article>
  );
}

export default function ShopCards({ tracks, text = '', going = false, onOpen }) {
  const featured = api.getFeatured();
  const adId = featured?.storeId || null;

  const q = norm(text);
  const filtered = tracks.filter((t) => !q || norm(`${t.store.name} ${t.store.neighbourhood} ${t.store.address}`).includes(q));
  const base = filtered.length ? filtered : tracks;
  // the paid placement: the ad shop's card leads the deck (it is always labelled "Ad"; stats are unchanged)
  const deck = adId && base.some((t) => t.store.id === adId)
    ? [base.find((t) => t.store.id === adId), ...base.filter((t) => t.store.id !== adId)]
    : base;
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [q]);
  const i = Math.min(idx, deck.length - 1);
  const go = (d) => setIdx((cur) => (Math.min(cur, deck.length - 1) + d + deck.length) % deck.length);
  const [dig, toggleDig] = useDigList();
  const frontId = deck[i]?.store.id;
  useEffect(() => { if (adId && frontId === adId) api.trackAd('impression', adId); }, [frontId, adId]);

  // drag / swipe to flip
  const drag = useRef(null);
  const onDown = (e) => { if (e.target.closest('button')) return; drag.current = { x: e.clientX }; };
  const onUp = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x; drag.current = null;
    if (dx < -40) go(1); else if (dx > 40) go(-1);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };

  return (
    <div className={`hcd ${going ? 'going' : ''}`}>
      <div className="hcd-bar">
        <span className="hcd-count">{q && filtered.length ? <>Showing <b>{filtered.length}</b> for “{text.trim()}”</> : q ? <>No shop called “{text.trim()}” — showing all</> : <>Swipe the deck · {deck.length} shops</>}</span>
        {dig.length > 0 && (
          <span className="hcd-dig">★ Dig list: {dig.map((id) => tracks.find((t) => t.store.id === id)).filter(Boolean).map((t, n) => (
            <a key={t.store.id} href={`#/store/${t.store.id}`}>{n ? ', ' : ''}{t.store.name.replace(/ Records.*| Myoozik| Posters.*| & .*/i, '')}</a>
          ))}</span>
        )}
      </div>

      <div className="hcd-stage" tabIndex={0} onKeyDown={onKey} onPointerDown={onDown} onPointerUp={onUp} aria-roledescription="card deck" aria-label="Shop cards. Use left and right arrows to flip.">
        {deck.map((t, n) => {
          const off = (n - i + deck.length) % deck.length; // 0 = front, 1 = next, …
          const pos = off === 0 ? 'front' : off === 1 ? 'next' : off === deck.length - 1 ? 'prev' : off === 2 ? 'next2' : 'hidden';
          return (
            <div key={t.store.id} className={`hcd-slot ${pos}`} aria-hidden={pos !== 'front'}>
              <Card t={t} total={tracks.length} ad={t.store.id === adId} active={pos === 'front'} saved={dig.includes(t.store.id)} onSave={toggleDig} onOpen={onOpen} />
            </div>
          );
        })}
        <button type="button" className="hcd-nav prev" onClick={() => go(-1)} aria-label="Previous shop">‹</button>
        <button type="button" className="hcd-nav next" onClick={() => go(1)} aria-label="Next shop">›</button>
      </div>
      <div className="hcd-dots" aria-hidden="true">
        {deck.map((t, n) => <span key={t.store.id} className={n === i ? 'on' : ''} style={{ '--ink': INK[t.side.key] }} />)}
      </div>
    </div>
  );
}
