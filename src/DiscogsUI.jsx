import React, { useEffect, useRef, useState } from 'react';
import { searchReleases, getRelease, peekRelease, discogsStatus } from './discogs.js';

/** Load a Discogs release (cached first, then network). */
export function useRelease(id) {
  const [state, setState] = useState(() => ({ data: peekRelease(id) || null, error: null, loading: !!id && !peekRelease(id) }));
  useEffect(() => {
    let alive = true;
    if (!id) { setState({ data: null, error: null, loading: false }); return undefined; }
    const cached = peekRelease(id);
    if (cached) { setState({ data: cached, error: null, loading: false }); return undefined; }
    setState((s) => ({ ...s, loading: true }));
    getRelease(id)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => { alive = false; };
  }, [id]);
  return state;
}

/** Album cover from Discogs, with a vinyl-disc placeholder while loading or when there's no image. */
export function Cover({ listing, size = 56, large = false }) {
  const { data } = useRelease(listing.coverUrl ? null : listing.discogsId);
  const src = listing.coverUrl || (large ? data?.cover : data?.thumb || data?.cover) || '';
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  // The sleeve wrapper lets a record slide out from behind the cover on hover (see .sleeve in styles.css).
  return (
    <span className={`sleeve ${large ? 'sleeve-large' : ''}`} style={style}>
      <span className="peek-disc" aria-hidden="true" />
      {!src || broken
        ? <span className="cover" style={style} aria-hidden="true"><span>{(listing.artist || '?').slice(0, 1)}</span></span>
        : <img className="cover-img" style={style} src={src} alt={`Cover of ${listing.title} by ${listing.artist}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />}
    </span>
  );
}

/** Release details from Discogs for the listing page. */
export function DiscogsPanel({ discogsId }) {
  const { data, error, loading } = useRelease(discogsId);
  const [showTracks, setShowTracks] = useState(false);
  if (!discogsId) {
    return <p className="muted small">This listing isn’t linked to a specific Discogs release, so the exact pressing is unconfirmed. Ask the store.</p>;
  }
  if (loading) return <p className="muted small">Loading release details from Discogs…</p>;
  if (error) return <p className="muted small">Couldn’t load Discogs details ({error.message}) <a href={`https://www.discogs.com/release/${discogsId}`} target="_blank" rel="noopener noreferrer">View on Discogs ↗</a></p>;
  if (!data) return null;
  return (
    <div className="discogs">
      <dl className="facts">
        <div><dt>Label</dt><dd>{data.label || '—'}</dd></div>
        <div><dt>Country</dt><dd>{data.country || '—'}</dd></div>
        <div><dt>Released</dt><dd>{data.released || data.year || '—'}</dd></div>
        <div><dt>Cat #</dt><dd>{data.catalogNo || '—'}</dd></div>
        <div className="wide"><dt>Format</dt><dd>{data.formatDetails || data.format || '—'}</dd></div>
        <div className="wide"><dt>Genre / style</dt><dd>{data.genres.join(', ') || '—'}</dd></div>
      </dl>
      {data.have != null && (
        <p className="small muted">Discogs community: {data.have.toLocaleString()} have it · {data.want.toLocaleString()} want it</p>
      )}
      {data.tracklist.length > 0 && (
        <>
          <button className="linkish" onClick={() => setShowTracks(!showTracks)} aria-expanded={showTracks}>
            {showTracks ? 'Hide' : 'Show'} tracklist ({data.tracklist.length})
          </button>
          {showTracks && (
            <ol className="tracks">
              {data.tracklist.map((t, i) => (
                <li key={i}><span className="pos">{t.position}</span><span>{t.title}</span><span className="muted">{t.duration}</span></li>
              ))}
            </ol>
          )}
        </>
      )}
      <p className="attribution">
        <DataByDiscogs href={data.url} /> The store’s copy is described by the store above; Discogs describes the release in general.
      </p>
    </div>
  );
}

/** Store portal: search Discogs and pick the exact release to pre-fill the listing form. */
export function DiscogsPicker({ onPick, initialQuery = '' }) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [err, setErr] = useState('');
  const [hasToken, setHasToken] = useState(true);
  const seq = useRef(0);

  useEffect(() => { discogsStatus().then((s) => setHasToken(!!s.token)); }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setStatus('idle'); return undefined; }
    const my = ++seq.current;
    const t = setTimeout(() => {
      setStatus('loading');
      searchReleases(term, { limit: 8 })
        .then((r) => { if (my === seq.current) { setResults(r); setStatus('done'); } })
        .catch((e) => { if (my === seq.current) { setErr(e.message); setStatus('error'); } });
    }, 450); // debounce so typing doesn't burn the rate limit
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="picker">
      <label htmlFor="dq"><b>Find it on Discogs</b> <span className="muted small">— fills in the details for you</span></label>
      <input id="dq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Artist, album, or catalogue # from the spine" autoComplete="off" />
      {status === 'loading' && <p className="muted small">Searching Discogs…</p>}
      {status === 'error' && <p className="err small">{err}</p>}
      {status === 'done' && !results.length && <p className="muted small">No vinyl releases found. You can still fill in the form by hand.</p>}
      {results.length > 0 && (
        <ul className="picker-list" role="listbox" aria-label="Discogs results">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" className="picker-item" onClick={() => onPick(r)}>
                {/* no per-result release lookups: that would spend 8 requests per search */}
                <Cover listing={{ coverUrl: r.thumb, discogsId: null, artist: r.artist, title: r.title }} size={44} />
                <span className="picker-text">
                  <span><b>{r.title}</b> <span className="muted">— {r.artist}</span></span>
                  <span className="small muted">{[r.year, r.country, r.label, r.catalogNo, r.format].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {results.length > 0 && <p className="attribution"><DataByDiscogs href={`https://www.discogs.com/search/?q=${encodeURIComponent(q.trim())}&type=release&format=Vinyl`} /></p>}
      {!hasToken && results.length > 0 && <p className="muted small">Tip: add a Discogs token (see README) to show covers in these results.</p>}
    </div>
  );
}

/** Credit required by the Discogs API Terms of Use next to any Discogs data, linking to the source page (no nofollow). */
export function DataByDiscogs({ href = 'https://www.discogs.com' }) {
  return <span className="dbd">Data provided by <a href={href} target="_blank" rel="noopener">Discogs</a>.</span>;
}
