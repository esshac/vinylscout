import React, { useEffect, useMemo, useState } from 'react';
import * as api from '../api.js';
import { go } from '../router.js';
import { FreshBadge, StatusBadge, ReleaseLine, ContactLinks, Notice, money } from '../components.jsx';
import { Cover, DiscogsPanel, DataByDiscogs, useRelease } from '../DiscogsUI.jsx';
import { searchReleases, getRelease, popularReleases } from '../discogs.js';
import { FEATURED_RELEASE_IDS } from '../seed.js';
import { storeCoverage, GENRES } from '../simulate.js';

// brighter riso inks for type/art on dark backgrounds, by quadrant
const SHOP_INK = { NW: '#7d97ff', SW: '#ff5fa6', SE: '#ff7a3d', NE: '#ffd34d' };
import RecordSunrise from '../RecordSunrise.jsx';
import ShopCards from '../ShopCards.jsx';
import PosterMap from '../poster/PosterMap.jsx';
import SleeveTracklist from '../poster/SleeveTracklist.jsx';
import { trackify, INK } from '../poster/geo.js';
import { SleeveHead, SleeveFoot, OfferTrack, trackOf } from '../poster/Sleeve.jsx';

const Disclaimer = () => (
  <p className="disclaimer">
    Listings are posted by stores and can change after they are confirmed. <b>Call or message the store before making a special trip.</b>
  </p>
);

// Line icons (consistent across devices, unlike emoji)
const DiscIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5" strokeLinecap="round" />
  </svg>
);
const StoreIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" /><path d="M5.5 11.5V20h13v-8.5" /><path d="M10 20v-5h4v5" />
  </svg>
);

const TABS = [
  { key: 'vinyls', label: 'Vinyls', Icon: DiscIcon, placeholder: 'Artist or album — e.g. Rumours, Miles Davis', chips: ['Rumours', 'Kind of Blue', 'Radiohead', 'Kendrick'] },
  { key: 'stores', label: 'Stores', Icon: StoreIcon, placeholder: 'Store name, neighbourhood, or a record they carry', chips: ['Inglewood', 'Kensington', 'Beltline', 'Radiohead'] },
];

function SearchTabs({ mode, onChange }) {
  const idx = TABS.findIndex((t) => t.key === mode);
  return (
    <div className="search-tabs" role="tablist" aria-label="What are you searching for?" style={{ '--idx': idx }}>
      <span className="tab-pill" aria-hidden="true" />
      {TABS.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={mode === t.key} className={mode === t.key ? 'active' : ''} onClick={() => onChange(t.key)}>
          <t.Icon /> {t.label}
        </button>
      ))}
    </div>
  );
}

const HEADLINES = {
  vinyls: { eyebrow: 'Calgary pilot · local record stores', words: ['Find', 'the', 'record.'], sub: 'Know which Calgary stores to check before you leave home.' },
  stores: { eyebrow: 'Every crate in the city', words: ['Dig', 'every', 'crate.'], sub: 'Twelve Calgary record shops, one card each. Flip through the deck, compare their stats, and save your favourites to a dig list.' },
};

function Headline({ mode }) {
  const h = HEADLINES[mode];
  return (
    <h1 className="headline" key={mode}>
      {h.words.map((w, i) => <span key={w} className="word" style={{ '--i': i }}>{w}&nbsp;</span>)}
      <span className="sub" style={{ '--i': 4 }}>{h.sub}</span>
    </h1>
  );
}

export function SearchPage({ q, tab }) {
  const mode = tab === 'stores' ? 'stores' : 'vinyls';
  const conf = TABS.find((t) => t.key === mode);
  const [text, setText] = useState(q);
  useEffect(() => {
    setText(q);
    if (q.trim()) {
      window.dispatchEvent(new Event('vinylscout:spin'));
    }
  }, [q, mode]);

  const link = (m, query) => `/?tab=${m}${query ? `&q=${encodeURIComponent(query)}` : ''}`;
  const [dropping, setDropping] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    const query = text.trim();
    // On either landing, play the hero's moment (needle drop / tape cut) before the results load.
    const animate = !q && query && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate) { go(link(mode, query)); return; }
    setDropping(true);
    setTimeout(() => { setDropping(false); go(link(mode, query)); }, 900);
  };
  const switchTab = (k) => go(link(k, text.trim()));
  const landing = !q; // big hero on both tabs until a search is made
  const crateTracks = useMemo(() => trackify(api.listStores()), []);

  return (
    <>
      <section className={`hero ${landing ? 'hero-landing' : 'hero-compact'}`}>
        <div className="hero-copy">
          {landing && <p className="eyebrow rise" key={`e-${mode}`} style={{ '--i': 0 }}><span className="eyebrow-dot" style={{ background: mode === 'vinyls' ? INK.orange : INK.pink }} />{HEADLINES[mode].eyebrow}</p>}
          {landing && <Headline mode={mode} />}
          <SearchTabs mode={mode} onChange={switchTab} />
          <form className="searchbar rise" style={{ '--i': 5 }} onSubmit={submit} role="search">
            <label htmlFor="q" className="sr-only">{conf.placeholder}</label>
            <input id="q" value={text} onChange={(e) => setText(e.target.value)} placeholder={conf.placeholder} autoComplete="off" />
            <button className="btn primary" type="submit">Search <span className="btn-mode">{conf.label.toLowerCase()}</span></button>
          </form>
          {!q && (
            <div className="chips rise" style={{ '--i': 6 }}>
              <span className="muted">Try:</span>
              {conf.chips.map((s) => <a key={s} className="chip" href={`#${link(mode, s)}`}>{s}</a>)}
            </div>
          )}
        </div>
        {landing && (
          <div className={`hero-art hero-sleeve sleeve-back rise ${mode}`} key={mode} style={{ '--i': 2 }}>
            <SleeveHead cat={mode === 'vinyls' ? 'Now pressing · your search · 33⅓' : `Shop cards · ${crateTracks.length} to collect`} />
            {mode === 'vinyls' ? <RecordSunrise text={text} dropping={dropping} /> : <ShopCards tracks={crateTracks} text={text} going={dropping} onOpen={(id) => go(`/store/${id}`)} />}
          </div>
        )}
      </section>

      {landing && mode === 'vinyls' && (
        <>
          <PopularVinyls />
          <HowItWorks />
        </>
      )}

      {mode === 'stores' && <StoreResults q={q} />}
      {mode === 'vinyls' && q && <VinylResults q={q} />}
    </>
  );
}

// ---------- shared: async Discogs search hook ----------
function useDiscogsSearch(q, limit) {
  const [state, setState] = useState({ status: q.trim() ? 'loading' : 'idle', releases: [], error: '' });
  useEffect(() => {
    if (!q.trim()) { setState({ status: 'idle', releases: [], error: '' }); return undefined; }
    let alive = true;
    setState((s) => ({ ...s, status: 'loading' }));
    searchReleases(q, { limit })
      .then((releases) => alive && setState({ status: 'done', releases, error: '' }))
      .catch((e) => alive && setState({ status: 'error', releases: [], error: e.message }));
    return () => { alive = false; };
  }, [q, limit]);
  return state;
}


// ---------- Vinyls landing: popular records and where to get them in Calgary ----------
const POPULAR_VIEWS = [
  { key: 'want', label: 'Most wanted', opts: { sort: 'want' }, blurb: 'The records Discogs collectors want most — and which Calgary stores have them.' },
  { key: 'have', label: 'Most collected', opts: { sort: 'have' }, blurb: 'The records the most collectors own. Classics every crate should have.' },
  { key: 'new', label: `New in ${new Date().getFullYear()}`, opts: { sort: 'want', year: new Date().getFullYear() }, blurb: 'This year’s most-wanted new vinyl releases.' },
];

function PopularVinyls() {
  const [view, setView] = useState('want');
  const [state, setState] = useState({ status: 'loading', rows: [], error: '' });
  const conf = POPULAR_VIEWS.find((v) => v.key === view);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, status: 'loading' }));
    popularReleases({ ...conf.opts, limit: 12 })
      .then((rows) => alive && setState({ status: 'done', rows, error: '' }))
      .catch((e) => alive && setState({ status: 'error', rows: [], error: e.message }));
    return () => { alive = false; };
  }, [view]); // eslint-disable-line
  const inks = [INK.blue, INK.pink, INK.orange, INK.yellow];

  return (
    <section className="sleeve-back chart reveal" aria-label="Popular vinyls near you">
      <SleeveHead cat="VS-YYC-CHART · TOP 12 · 33⅓" />
      <div className="chart-head">
        <div>
          <h2 className="sb-title">Popular Vinyls Near You</h2>
          <p className="sb-meta">{conf.blurb}</p>
        </div>
        <div className="sb-seg" role="tablist" aria-label="Popular list">
          {POPULAR_VIEWS.map((v) => (
            <button key={v.key} role="tab" aria-selected={view === v.key} className={view === v.key ? 'active' : ''} onClick={() => setView(v.key)}>{v.label}</button>
          ))}
        </div>
      </div>
      {state.status === 'error' && <Notice kind="error">{state.error}</Notice>}
      {state.status === 'loading' && !state.rows.length && <div className="loading-row sb-loading"><span className="spinner" /> Flipping through Calgary’s crates…</div>}
      <ol className={`chart-grid ${state.status === 'loading' ? 'is-loading' : ''}`} key={view}>
        {state.rows.map((rel, i) => {
          const { available, storeCount } = api.offersForRelease(rel);
          const cheapest = available.reduce((m, o) => (o.price != null && (!m || o.price < m.price) ? o : m), null);
          const count = view === 'have' ? rel.have : rel.want;
          return (
            <li key={rel.id} className="rise" style={{ '--i': i }}>
              <a className="chart-item" href={`#/release/${rel.id}${cheapest ? `?store=${cheapest.storeId}` : ''}`}>
                <span className="chart-rank" style={{ '--side': inks[i % 4] }}>{String(i + 1).padStart(2, '0')}</span>
                <Cover listing={{ ...rel, coverUrl: rel.cover || rel.thumb }} size={168} large />
                <b className="chart-title">{rel.title}</b>
                <span className="chart-artist">{rel.artist}{rel.year ? ` · ${rel.year}` : ''}</span>
                {available.length ? (
                  <>
                    <span className="chart-line"><span>{available.length}/{storeCount} shops</span><span className="sb-leader" aria-hidden="true" /><b>{money(cheapest?.price)}</b></span>
                    <span className="chart-where">cheapest · {cheapest?.store.name}</span>
                  </>
                ) : <span className="chart-where">not in Calgary crates</span>}
                {count != null && <span className="chart-want">♥ {Intl.NumberFormat('en', { notation: 'compact' }).format(count)} {view === 'have' ? 'own it' : 'want it'}</span>}
              </a>
            </li>
          );
        })}
      </ol>
      <SleeveFoot>
        ℗ 2026 VinylScout · Chart compiled from Discogs collectors · <DataByDiscogs href="https://www.discogs.com/search/?type=release&format=Vinyl" /><br />
        Prices and stock checked against every Calgary shop. Call ahead before you dig.
      </SleeveFoot>
    </section>
  );
}

function StoreResults({ q }) {
  const [hovered, setHovered] = useState(null);
  const stores = useMemo(() => api.listStores(), []);
  const tracks = useMemo(() => trackify(stores), [stores]);

  const profile = api.searchStores(q, { log: false }); // store name / neighbourhood matches
  const profileIds = new Set(profile.filter((r) => r.score >= 10).map((r) => r.store.id));
  const looksLikePlace = !!q.trim() && profileIds.size > 0;
  // Not a place or store name → treat it as a record and find which shops have it.
  const disc = useDiscogsSearch(looksLikePlace ? '' : q, 6);

  let matchList = null, posterMatches = null;
  if (q.trim()) {
    matchList = {}; posterMatches = {};
    stores.forEach((s) => {
      const offers = disc.releases.map((rel) => api.offerFor(s, rel)).filter((o) => o && o.status === 'available');
      matchList[s.id] = offers;
      posterMatches[s.id] = offers.length || (profileIds.has(s.id) ? true : 0);
    });
  }
  const trackRows = tracks.map((t) => ({ ...t, profileHit: profileIds.has(t.store.id) }));
  const hits = q.trim() ? stores.filter((s) => posterMatches[s.id]).length : stores.length;
  useEffect(() => { if (disc.status === 'done' || looksLikePlace) api.logSearch('stores', q, hits); }, [disc.status, q]); // eslint-disable-line

  return (
    <section className="stores-stage">
      <div className="results-head">
        <h2 className="results-title">{!q.trim() ? 'The Calgary record shop tour'
          : disc.status === 'loading' ? `Checking every shop for “${q.trim()}”…`
          : hits ? `${hits} shop${hits === 1 ? '' : 's'} for “${q.trim()}”` : `No shops for “${q.trim()}”`}</h2>
        {disc.status === 'loading' && <span className="loading-row inline"><span className="spinner" /> digging…</span>}
      </div>
      {disc.status === 'error' && <Notice kind="error">{disc.error}</Notice>}
      <div className="poster-layout">
        <div className="poster-col">
          <PosterMap tracks={tracks} hovered={hovered} onHover={setHovered} matches={posterMatches} onSelect={(id) => go(`/store/${id}`)} />
          <p className="small muted poster-cap">Hover a record to find the shop · click to open it · every shop in the tracklist has a Directions link.</p>
        </div>
        <SleeveTracklist tracks={trackRows} hovered={hovered} onHover={setHovered} matchList={matchList} query={q.trim()} />
      </div>
    </section>
  );
}


function VinylResults({ q }) {
  const disc = useDiscogsSearch(q, 12);
  const manual = api.search(q, { log: false }).filter((l) => !l.discogsId); // store-entered listings not linked to Discogs
  const groups = disc.releases.map((rel) => ({ rel, ...api.offersForRelease(rel) })).filter((g) => g.available.length);
  const total = groups.reduce((a, g) => a + g.available.length, 0) + manual.length;
  useEffect(() => { if (disc.status === 'done') api.logSearch('vinyls', q, total); }, [disc.status, q]); // eslint-disable-line
  let n = 0;

  return (
    <section>
      <div className="results-head">
        <h2 className="results-title">{disc.status === 'loading' ? `Digging for “${q.trim()}”…`
          : groups.length || manual.length ? <>{groups.length + (manual.length ? 1 : 0)} record{groups.length === 1 ? '' : 's'} in Calgary for <span>“{q.trim()}”</span></>
          : `Nothing found for “${q.trim()}”`}</h2>
        <Legend />
      </div>
      {disc.status === 'loading' && <div className="loading-row"><span className="spinner" /> Searching Discogs and checking every shop’s shelves…</div>}
      {disc.status === 'error' && <Notice kind="error">{disc.error}</Notice>}
      {disc.status === 'done' && !groups.length && !manual.length && (
        <div className="sleeve-back empty-sleeve"><SleeveHead /><h3 className="sb-title">No pressing found</h3><p className="sb-meta">Discogs has no vinyl release matching that. Check spelling, or try just the artist or just the album.</p></div>
      )}
      <div className="sleeve-grid">
        {groups.map((g) => {
          const from = Math.min(...g.available.map((o) => o.price ?? 9999));
          return (
            <article className="sleeve-back release-sleeve rise" style={{ '--i': n++ }} key={g.rel.id}>
              <a className="rs-head" href={`#/release/${g.rel.id}`}>
                <Cover listing={{ ...g.rel, coverUrl: g.rel.thumb || g.rel.cover }} size={96} />
                <div className="rs-head-text">
                  <span className="sb-cat">{[g.rel.catalogNo, g.rel.country, g.rel.year].filter(Boolean).join(' · ') || 'VINYL'}</span>
                  <h3 className="rs-title">{g.rel.title}</h3>
                  <span className="rs-artist">{g.rel.artist}</span>
                  <span className="rs-stock"><b>{g.available.length}/{g.storeCount}</b> shops · from <b>{money(from)}</b></span>
                </div>
              </a>
              <ol className="sb-tracks">
                {g.available.slice(0, 3).map((o) => <OfferTrack key={o.id} o={o} i={n++} />)}
              </ol>
              <a className="rs-more" href={`#/release/${g.rel.id}`}>
                {g.available.length > 3 ? `+ ${g.available.length - 3} more shop${g.available.length - 3 === 1 ? '' : 's'}` : 'Liner notes & tracklist'} →
              </a>
            </article>
          );
        })}
        {manual.length > 0 && (
          <article className="sleeve-back release-sleeve">
            <SleeveHead cat="STORE-LISTED" />
            <h3 className="rs-title">Other store listings</h3>
            <ol className="sb-tracks">{manual.map((o) => <OfferTrack key={o.id} o={o} i={n++} />)}</ol>
          </article>
        )}
      </div>
      {(groups.length > 0 || manual.length > 0) && <Disclaimer />}
      {groups.length > 0 && <p className="attribution">Release data and covers: <DataByDiscogs href={`https://www.discogs.com/search/?q=${encodeURIComponent(q.trim())}&type=release&format=Vinyl`} /></p>}
    </section>
  );
}

function ResultRow({ r, i = 0, highlight = false }) {
  const href = r.simulated ? `#/release/${r.discogsId}?store=${r.storeId}` : `#/listing/${r.id}`;
  return (
    <a className={`result rise ${highlight ? 'highlight' : ''}`} style={{ '--i': i }} href={href}>
      <Cover listing={r} size={56} />
      <div className="result-main">
        <div className="result-store">{r.store.name} <span className="muted">· {r.store.neighbourhood}</span></div>
        <span className="release">{[r.condition && `Condition: ${r.condition}`, r.copies > 1 && `${r.copies} copies`, r.year, r.format].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="result-side">
        <div className="price">{money(r.price) ?? <span className="muted">Price not listed</span>}</div>
        <FreshBadge fresh={r.fresh} long />
      </div>
    </a>
  );
}


function Legend() {
  return (
    <details className="legend">
      <summary>What do the labels mean?</summary>
      <ul>
        <li><FreshBadge fresh={{ key: 'recent', label: 'Recently confirmed' }} /> store checked it in the last 7 days</li>
        <li><FreshBadge fresh={{ key: 'stale', label: 'Needs reconfirmation' }} /> last checked 8–30 days ago</li>
        <li><FreshBadge fresh={{ key: 'old', label: 'Out of date' }} /> last checked over 30 days ago</li>
        <li><FreshBadge fresh={{ key: 'unverified', label: 'Unverified' }} /> the store has never confirmed it</li>
      </ul>
      <p className="muted">Freshness shows when the <i>store</i> last checked — not when someone viewed it. It is not a guarantee.</p>
    </details>
  );
}

function HowItWorks() {
  const steps = [
    ['Search', 'Artist or album across every participating store.'],
    ['Compare', 'Price, pressing details and store location.'],
    ['Check freshness', 'See when each store last confirmed the record.'],
    ['Contact, then visit', 'Call or message to confirm before you go.'],
  ];
  return (
    <section className="how">
      {steps.map(([t, d], i) => (
        <div className="how-step reveal" style={{ '--i': i }} key={t}><span className="num">{i + 1}</span><b>{t}</b><p>{d}</p></div>
      ))}
    </section>
  );
}

export function ListingPage({ id }) {
  const l = api.getListing(id);
  const [reporting, setReporting] = useState(false);
  const [sent, setSent] = useState(false);
  if (!l) return <div className="card"><h2>Listing not available</h2><p>It may have been removed by the store.</p><a href="#/">Back to search</a></div>;
  return (
    <div className="detail">
      <button className="linkish back" onClick={() => window.history.back()}>← Back</button>
      <div className="card detail-card">
        <div className="detail-head">
          <Cover listing={l} size={120} large />
          <div>
            <p className="eyebrow">{l.artist}</p>
            <h1>{l.title}</h1>
            <ReleaseLine l={l} />
            <div className="badges"><StatusBadge status={l.status} /><FreshBadge fresh={l.fresh} long /></div>
          </div>
          <div className="price big">{money(l.price) ?? <span className="muted">Price not listed</span>}</div>
        </div>
        <dl className="facts">
          <div><dt>Format</dt><dd>{l.format || '—'}</dd></div>
          <div><dt>Year</dt><dd>{l.year || '—'}</dd></div>
          <div><dt>Condition</dt><dd>{l.condition || '—'}</dd></div>
          <div><dt>Catalogue #</dt><dd>{l.catalogNo || '—'}</dd></div>
          <div className="wide"><dt>Pressing notes</dt><dd>{l.pressingNotes || 'None provided — ask the store if the edition matters to you.'}</dd></div>
          <div className="wide"><dt>Last confirmed by store</dt><dd>{l.lastConfirmedAt ? new Date(l.lastConfirmedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Never confirmed'}</dd></div>
        </dl>
        <Disclaimer />
      </div>

      <div className="card">
        <h2>About this release</h2>
        <DiscogsPanel discogsId={l.discogsId} />
      </div>

      <div className="card">
        <h2>At {l.store.name}</h2>
        <p className="muted">{l.store.neighbourhood} · {l.store.hours || 'Hours not listed'}</p>
        <ContactLinks store={l.store} />
        <p><a href={`#/store/${l.store.id}`}>See store profile and other listings →</a></p>
      </div>

      <div className="card">
        {sent ? <Notice kind="ok">Thanks — the report was sent to the VinylScout admin for review. The listing stays up until it’s checked.</Notice>
          : reporting ? <ReportForm listingId={l.id} onDone={() => setSent(true)} onCancel={() => setReporting(false)} />
          : <button className="linkish" onClick={() => setReporting(true)}>Report this listing (sold, wrong details, inappropriate)</button>}
      </div>
    </div>
  );
}

function ReportForm({ listingId, onDone, onCancel }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    try { api.reportListing(listingId, reason, note); onDone(); } catch (x) { setErr(x.message); }
  };
  return (
    <form onSubmit={submit} className="report">
      <h3>Report this listing</h3>
      {err && <Notice kind="error">{err}</Notice>}
      <fieldset>
        <legend className="sr-only">Reason</legend>
        {['Possibly sold', 'Wrong price or details', 'Wrong store', 'Inappropriate content'].map((r) => (
          <label key={r} className="radio"><input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} /> {r}</label>
        ))}
      </fieldset>
      <label htmlFor="note">Anything else? (optional — don’t include personal info)</label>
      <textarea id="note" rows="2" maxLength="500" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="row"><button className="btn primary" type="submit">Send report</button><button type="button" className="btn ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

// Release page: one Discogs release, and which Calgary stores have it.
export function ReleasePage({ id, storeId }) {
  const { data, error, loading } = useRelease(Number(id));
  if (loading) return <div className="loading-row"><span className="spinner" /> Pulling the record off the shelf…</div>;
  if (error || !data) return <div className="sleeve-back empty-sleeve"><SleeveHead /><h2 className="sb-title">Couldn’t load this release</h2><p className="sb-meta">{error?.message}</p><a className="rs-more" href="#/">Back to search →</a></div>;
  const { available, storeCount } = api.offersForRelease(data);
  const missing = api.listStores().filter((s) => !available.some((o) => o.storeId === s.id));
  const best = available.find((o) => o.storeId === storeId) || available[0];
  const from = available.length ? Math.min(...available.map((o) => o.price ?? 9999)) : null;
  return (
    <div className="release-page">
      <button className="linkish back" onClick={() => window.history.back()}>← Back</button>
      <div className="release-layout">
        <div className="release-art">
          <Cover listing={{ ...data, coverUrl: data.cover }} size={340} large />
          <div className="release-stats">
            <div><b>{available.length}/{storeCount}</b><span>shops have it</span></div>
            <div><b>{from != null ? money(from) : '—'}</b><span>lowest price</span></div>
            {data.want != null && <div><b>{Intl.NumberFormat('en', { notation: 'compact' }).format(data.want)}</b><span>want it</span></div>}
          </div>
        </div>
        <section className="sleeve-back release-main">
          <SleeveHead cat={[data.catalogNo, data.label, data.country].filter(Boolean).join(' · ') || 'VINYL'} />
          <p className="rs-artist big">{data.artist}</p>
          <h1 className="sb-title">{data.title}</h1>
          <p className="sb-meta">{[data.released || data.year, data.formatDetails].filter(Boolean).join(' · ')}</p>

          <h3 className="sb-side-h"><span className="sb-dot" style={{ background: INK.orange }} />Where to find it in Calgary</h3>
          {available.length ? (
            <ol className="sb-tracks">{available.map((o, i) => <OfferTrack key={o.id} o={o} i={i} highlight={o.storeId === storeId} />)}</ol>
          ) : <p className="sb-meta">No Calgary shop has this pressing right now.</p>}
          {missing.length > 0 && <p className="sb-missing">Not in stock at: {missing.map((s) => s.name).join(', ')}.</p>}

          {best && (
            <div className="sb-callout">
              <b>Before you go</b> — call {best.store.name}{best.store.phone ? ` at ${best.store.phone}` : ''} to confirm it’s still in the crate.
              <ContactLinks store={best.store} compact />
            </div>
          )}

          <h3 className="sb-side-h"><span className="sb-dot" style={{ background: INK.blue }} />Liner notes</h3>
          <DiscogsPanel discogsId={data.id} />
          <SleeveFoot>℗ 2026 VinylScout · Listings can change after a shop confirms them — call before a special trip.</SleeveFoot>
        </section>
      </div>
    </div>
  );
}

export function StoresPage() { useEffect(() => { go('/?tab=stores'); }, []); return null; }

export function StorePage({ id }) {
  const s = api.getStore(id);
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const disc = useDiscogsSearch(submitted, 12);
  const [featured, setFeatured] = useState([]);
  useEffect(() => {
    let alive = true;
    Promise.all(FEATURED_RELEASE_IDS.map((rid) => getRelease(rid).catch(() => null)))
      .then((rels) => alive && setFeatured(rels.filter(Boolean)));
    return () => { alive = false; };
  }, []);
  if (!s) return <div className="sleeve-back empty-sleeve"><SleeveHead /><h2 className="sb-title">Shop not found</h2><a className="rs-more" href="#/?tab=stores">All shops →</a></div>;

  const offers = (rels) => rels.map((rel) => api.offerFor(s, rel)).filter((o) => o && o.status === 'available');
  const shown = submitted ? offers(disc.releases) : offers(featured);
  const manual = s.listings.filter((l) => !l.discogsId);
  const coverage = Math.round(storeCoverage(s.id) * 100);
  const t = trackOf(s.id);
  const stats = api.shopStats(s);
  const topGenre = GENRES.map((g) => ({ g, n: api.shopStats(s, g).genreCount })).sort((a, b) => b.n - a.n)[0];
  const ad = api.getFeatured();
  const isAd = ad && ad.storeId === s.id;
  const compact = (n) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

  return (
    <div className="shop-page">
      <button className="linkish back" onClick={() => window.history.back()}>← Back</button>
      <div className="shop-layout">
        {/* sleeve front: generated cover for the shop in its quadrant ink */}
        <div className={`shop-cover pat${Number(t.code) % 3}`} style={{ '--ink': SHOP_INK[t.side.key] }} aria-hidden="true">
          <span className="shop-cover-disc" />
          <span className="shop-cover-kicker">VinylScout · Calgary record shops</span>
          <span className="shop-cover-name">{s.name}</span>
          <span className="shop-cover-hood">{s.neighbourhood} · {t.side.label}</span>
        </div>

        <section className="sleeve-back shop-main">
          <SleeveHead cat={`${t.side.key} · ${s.address.replace(', Calgary, AB', '')}`} />
          {isAd && <span className="feat-ad shop-ad">Ad</span>}
          <p className="rs-artist big">{s.neighbourhood}</p>
          <h1 className="sb-title">{s.name}</h1>
          <p className="sb-meta">{s.address} · listing info from {s.source || 'Google Maps'}</p>
          <div className="shop-stats">
            <div><b>~{compact(stats.catalogue)}</b><span>records in the crates</span></div>
            <div><b>{t.km.toFixed(1)} km</b><span>from downtown</span></div>
            <div><b>{topGenre.g}</b><span>deepest genre</span></div>
          </div>
          <div className="sb-callout">
            <b>Hours</b> — {s.hours || 'not listed. Check Google Maps or call before you visit.'}
            <ContactLinks store={s} compact />
          </div>
        </section>
      </div>

      <section className="sleeve-back chart shop-crates">
        <SleeveHead cat={`Crate dig · ~${coverage}% of the Discogs catalogue`} />
        <div className="chart-head">
          <div>
            <h2 className="sb-title">Dig through the crates</h2>
            <p className="sb-meta">Search {s.name} for an artist or album, or browse what’s featured below.</p>
          </div>
        </div>
        <form className="dark-search" onSubmit={(e) => { e.preventDefault(); setSubmitted(q.trim()); }} role="search">
          <label htmlFor="sq" className="sr-only">Search this store</label>
          <input id="sq" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${s.name} — artist or album`} />
          <button className="btn primary">Dig</button>
        </form>

        <h3 className="sb-side-h"><span className="sb-dot" style={{ background: SHOP_INK[t.side.key] }} />{submitted ? <>In stock for “{submitted}”</> : 'Featured records in stock'}</h3>
        {(submitted ? disc.status === 'loading' : !featured.length) && <div className="loading-row sb-loading"><span className="spinner" /> Flipping through the crates…</div>}
        {submitted && disc.status === 'done' && !shown.length && <p className="sb-meta">Nothing matching that in this shop right now.</p>}
        <ol className="chart-grid">
          {shown.map((o, i) => (
            <li key={o.id} className="rise" style={{ '--i': i }}>
              <a className="chart-item" href={`#/release/${o.discogsId}?store=${s.id}`}>
                <Cover listing={o} size={168} large />
                <b className="chart-title">{o.title}</b>
                <span className="chart-artist">{o.artist}{o.year ? ` · ${o.year}` : ''}</span>
                <span className="chart-line"><span>{o.condition}{o.copies > 1 ? ` · ${o.copies} copies` : ''}</span><span className="sb-leader" aria-hidden="true" /><b>{money(o.price)}</b></span>
                <FreshBadge fresh={o.fresh} />
              </a>
            </li>
          ))}
        </ol>

        {manual.length > 0 && (
          <>
            <h3 className="sb-side-h"><span className="sb-dot" style={{ background: INK.yellow }} />Other listings from the shop</h3>
            <ol className="sb-tracks">{manual.map((o, i) => <OfferTrack key={o.id} o={{ ...o, store: s }} i={i} />)}</ol>
          </>
        )}
        <SleeveFoot>
          Listings can change after the shop confirms them — call before a special trip. · Release data and covers: <DataByDiscogs />
        </SleeveFoot>
      </section>
    </div>
  );
}
