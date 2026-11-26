import React, { useState } from 'react';
import * as api from '../api.js';
import { FreshBadge, Notice } from '../components.jsx';
import { SleeveHead, SleeveFoot } from '../poster/Sleeve.jsx';
import { go } from '../router.js';

export default function AdminPage({ user }) {
  const [err, setErr] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  if (!user || user.role !== 'admin') {
    return <section className="sleeve-back portal portal-small"><SleeveHead cat="Admin" /><h1 className="sb-title">Admin</h1><Notice kind="error">Administrator access only.</Notice><a href="#/signin?next=/admin">Sign in as admin →</a></section>;
  }
  const data = api.adminOverview();
  const m = api.pilotMetrics();
  const act = (fn) => { try { fn(); setErr(''); } catch (e) { setErr(e.message); } };
  const reports = data.reports.filter((r) => showClosed || r.status === 'open');

  return (
    <section className="sleeve-back portal admin-page">
      <SleeveHead cat="Admin · Calgary pilot control room" />
      <p className="rs-artist big">Admin</p>
      <h1 className="sb-title">Pilot control room</h1>
      {err && <Notice kind="error">{err}</Notice>}

      <h2>Pilot metrics</h2>
      <p className="muted small">Targets from PRD §5.2. Numbers here come from this browser’s test session only.</p>
      <div className="stats metrics">
        <Metric v={m.stores} label="Participating stores" target="≥ 3" ok={m.stores >= 3} />
        <Metric v={m.activeListings} label="Active listings" target="≥ 100" ok={m.activeListings >= 100} />
        <Metric v={`${m.freshPct}%`} label="Confirmed in last 7 days" target="≥ 70%" ok={m.freshPct >= 70} />
        <Metric v={m.searches} label="Searches" sub={`${m.searchesWithResults} with results`} />
        <Metric v={m.contactClicks} label="Contact-link clicks" />
        <Metric v={m.confirmations} label="Listing confirmations" />
      </div>
      <FeaturedSpot stores={data.stores} m={m} act={act} />
      <TesterTools />

      {m.failedQueries.length > 0 && (
        <div className="card">
          <h3>Searches with no results</h3>
          <p className="muted small">Useful for recruiting stores and understanding demand (PRD §17, Q6).</p>
          <div className="chips">{m.failedQueries.map(([q, n]) => <span key={q} className="chip">{q} × {n}</span>)}</div>
        </div>
      )}

      <div className="results-head">
        <h2>Reports ({m.openReports} open)</h2>
        <label className="check"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show resolved</label>
      </div>
      {!reports.length && <p className="muted card">No reports to review.</p>}
      {reports.map((r) => (
        <div className="card report-row" key={r.id}>
          <div>
            <b>{r.reason}</b> <span className={`badge ${r.status === 'open' ? 'status-no' : 'status-ok'}`}>{r.status}</span>
            <p className="small muted">Listing: {r.listing ? `${r.listing.title} — ${r.listing.artist} @ ${r.listing.store?.name}` : r.listingId} · {new Date(r.createdAt).toLocaleString()}</p>
            {r.note && <p>“{r.note}”</p>}
            {r.listing && <div className="badges"><FreshBadge fresh={r.listing.fresh} long />{r.listing.hidden && <span className="badge status-no">Hidden</span>}</div>}
          </div>
          <div className="manage-actions">
            {r.listing && (r.listing.hidden
              ? <button className="btn sm ghost" onClick={() => act(() => api.setListingHidden(r.listingId, false))}>Unhide listing</button>
              : <button className="btn sm ghost danger" onClick={() => act(() => api.setListingHidden(r.listingId, true))}>Hide listing</button>)}
            {r.status === 'open'
              ? <><button className="btn sm" onClick={() => act(() => api.resolveReport(r.id, 'resolved'))}>Mark resolved</button>
                  <button className="btn sm ghost" onClick={() => act(() => api.resolveReport(r.id, 'dismissed'))}>Dismiss</button></>
              : <button className="btn sm ghost" onClick={() => act(() => api.resolveReport(r.id, 'open'))}>Reopen</button>}
          </div>
        </div>
      ))}

      <h2>Accounts</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Store</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.users.map((u) => {
              const s = data.stores.find((x) => x.ownerId === u.id);
              return (
                <tr key={u.id}>
                  <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{s ? s.name : '—'}</td>
                  <td>{u.disabled ? 'Disabled' : 'Active'}</td>
                  <td>{u.id !== user.id && (
                    <button className={`btn sm ghost ${u.disabled ? '' : 'danger'}`} onClick={() => act(() => api.setUserDisabled(u.id, !u.disabled))}>
                      {u.disabled ? 'Re-enable' : 'Disable'}
                    </button>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">Disabling a store account suspends its store, so its listings disappear from public search.</p>
      <SleeveFoot>Numbers come from this browser’s test session only.</SleeveFoot>
    </section>
  );
}

function Metric({ v, label, target, ok, sub }) {
  return (
    <div className={`stat ${target ? (ok ? 'good' : 'warn') : ''}`}>
      <b>{v}</b><span>{label}</span>
      {target && <small>Target {target}</small>}
      {sub && <small>{sub}</small>}
    </div>
  );
}

// Featured (paid) spot in the Stores hero: pick the advertiser, set a tagline, see impressions/clicks.
// The spot is always labelled "Ad" and never changes how shops rank.
function FeaturedSpot({ stores, m, act }) {
  const current = api.getFeatured();
  const [storeId, setStoreId] = useState(current?.storeId || '');
  const [tagline, setTagline] = useState(current?.tagline || '');
  const ctr = m.adImpressions ? Math.round((m.adClicks / m.adImpressions) * 1000) / 10 : 0;
  return (
    <div className="card featured-admin">
      <h3>Ad spot — Stores tab card deck</h3>
      <p className="muted small">
        One shop can buy the ad spot: its trading card leads the Stores deck with an "Ad" tag and a rainbow border.
        It never changes search results or a shop's stats. With no ad set, the deck starts at the first shop.
      </p>
      <div className="stats metrics">
        <div className="stat"><b>{current ? current.store.name : '—'}</b><span>currently featured{current?.example ? ' (example placement — not a paying shop)' : ''}</span>{current && <small>since {new Date(current.since).toLocaleDateString()}</small>}</div>
        <div className="stat"><b>{m.adImpressions}</b><span>ad impressions</span></div>
        <div className="stat"><b>{m.adClicks}</b><span>ad clicks</span><small>{ctr}% click-through</small></div>
      </div>
      <div className="row featured-form">
        <label className="sr-only" htmlFor="feat-store">Shop to feature</label>
        <select id="feat-store" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">— No featured shop —</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="feat-tag">Tagline</label>
        <input id="feat-tag" value={tagline} maxLength={80} onChange={(e) => setTagline(e.target.value)} placeholder="Optional tagline, e.g. New arrivals every Thursday" />
        <button className="btn primary sm" onClick={() => act(() => api.setFeatured(storeId, tagline))}>{storeId ? 'Save featured shop' : 'Clear featured spot'}</button>
      </div>
    </div>
  );
}

// Test-run tools (moved here from the old header bar): age freshness labels without waiting, or reset the demo.
function TesterTools() {
  const [resetting, setResetting] = useState(false);
  const offset = api.getClockOffset();
  return (
    <div className="card tester-tools">
      <h3>Test-run tools</h3>
      <p className="muted small">Data is saved in this browser only. Use these when testing or recording the demo.</p>
      <div className="row tester-row">
        <label className="tester-label" htmlFor="clock">Simulate time passing</label>
        <select id="clock" value={offset} onChange={(e) => api.setClockOffset(e.target.value)}>
          {[0, 3, 7, 10, 20, 31, 45].map((d) => <option key={d} value={d}>+{d} days</option>)}
        </select>
        <span className="muted small">Watch “recently confirmed” labels age (FR-6) without waiting a week.</span>
      </div>
      <div className="row tester-row">
        {resetting ? (
          <span className="confirm-inline">
            <span>Reset all demo data, reports, ad stats and analytics?</span>
            <button className="btn sm danger-solid" onClick={() => { setResetting(false); api.resetData(); api.signOut(); go('/'); }}>Yes, reset</button>
            <button className="btn ghost sm" onClick={() => setResetting(false)}>Cancel</button>
          </span>
        ) : (
          <button className="btn ghost sm" onClick={() => setResetting(true)}>Reset demo data</button>
        )}
      </div>
    </div>
  );
}
