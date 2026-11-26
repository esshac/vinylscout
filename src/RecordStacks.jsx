import React, { useEffect, useMemo, useState } from 'react';
import * as api from './api.js';
import { searchReleases } from './discogs.js';
import { shortName } from './poster/geo.js';
import { money } from './components.jsx';

// Stores hero: live record stacks. As you type an artist/album, we search Discogs (debounced) and check
// every shop; each shop's column fills with one sleeve per matching record (real cover art), dropping in.
// The tallest stack gets a "MOST IN STOCK" tag. Idle, it cycles example artists so the stacks are never empty.

const INK = { NW: '#7d97ff', SW: '#ff5fa6', SE: '#ff7a3d', NE: '#ffd34d' };
const DEMO = ['Fleetwood Mac', 'Radiohead', 'Kendrick Lamar', 'Miles Davis', 'Daft Punk', 'Joni Mitchell'];
const MAX = 8;

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function RecordStacks({ tracks, text = '', going = false, onOpen }) {
  const typed = text.trim();
  const [demoIdx, setDemoIdx] = useState(0);
  useEffect(() => {
    if (typed) return undefined;
    const t = setInterval(() => setDemoIdx((i) => (i + 1) % DEMO.length), 7000);
    return () => clearInterval(t);
  }, [typed]);

  const debounced = useDebounced(typed, 550);
  const term = typed ? (debounced.length >= 2 ? debounced : '') : DEMO[demoIdx];
  const isDemo = !typed;

  const [state, setState] = useState({ status: 'idle', term: '', releases: [], error: '' });
  useEffect(() => {
    if (!term) { setState({ status: 'idle', term: '', releases: [], error: '' }); return undefined; }
    let alive = true;
    setState((s) => ({ ...s, status: 'loading' }));
    searchReleases(term, { limit: MAX })
      .then((releases) => alive && setState({ status: 'done', term, releases, error: '' }))
      .catch((e) => alive && setState({ status: 'error', term, releases: [], error: e.message }));
    return () => { alive = false; };
  }, [term]);

  const columns = useMemo(() => tracks.map((t) => {
    const offers = state.releases.map((rel) => ({ rel, o: api.offerFor(t.store, rel) })).filter((x) => x.o && x.o.status === 'available');
    const min = offers.reduce((m, x) => (x.o.price != null && x.o.price < m ? x.o.price : m), Infinity);
    return { t, offers, min };
  }), [tracks, state.releases]);

  const best = columns.reduce((b, c) => (!b || c.offers.length > b.offers.length || (c.offers.length === b.offers.length && c.min < b.min) ? c : b), null);
  const hasAny = best && best.offers.length > 0;
  const waiting = typed && (debounced !== typed || state.status === 'loading');

  return (
    <div className={`stk ${going ? 'going' : ''} ${state.status === 'loading' ? 'loading' : ''}`}>
      <div className="stk-top" aria-live="polite">
        <span className="stk-q">
          {isDemo ? <>e.g. <b>{DEMO[demoIdx]}</b></> : typed.length < 2 ? 'Keep typing…' : <>Digging <b>{typed}</b></>}
        </span>
        {waiting ? <span className="stk-best muted">checking 12 shops…</span>
          : state.status === 'error' ? <span className="stk-best muted">{state.error}</span>
          : hasAny ? (
            <button type="button" className="stk-best" onClick={() => onOpen?.(best.t.store.id)}>
              <span className="stk-crown">Most in stock</span>
              <b>{best.t.store.name}</b> · {best.offers.length} record{best.offers.length === 1 ? '' : 's'} · from {money(best.min)}
            </button>
          ) : state.status === 'done' ? <span className="stk-best muted">No Calgary shop has that right now</span> : null}
      </div>

      <div className="stk-floor" role="list" aria-label="Matching records per shop">
        {columns.map(({ t, offers }) => {
          const win = hasAny && best.t.store.id === t.store.id;
          return (
            <button type="button" role="listitem" key={t.store.id} className={`stk-col ${win ? 'win' : ''} ${offers.length ? '' : 'empty'}`}
                    style={{ '--ink': INK[t.side.key] }} onClick={() => onOpen?.(t.store.id)}
                    aria-label={`${t.store.name}: ${offers.length} matching record${offers.length === 1 ? '' : 's'}`}>
              <span className="stk-count">{offers.length || ''}</span>
              <span className="stk-pile">
                {offers.slice(0, MAX).map(({ rel }, i) => (
                  <span key={`${state.term}-${rel.id}`} className="stk-sleeve"
                        style={{ '--i': i, '--rot': `${((i * 37 + t.code * 11) % 9) - 4}deg`, backgroundImage: rel.thumb || rel.cover ? `url("${rel.thumb || rel.cover}")` : undefined }} />
                ))}
              </span>
              <span className="stk-base" />
              <span className="stk-name">{shortName(t.store.name)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
