import React, { useState } from 'react';
import * as api from '../api.js';
import { FreshBadge, Notice, Field, money } from '../components.jsx';
import { Cover, DiscogsPicker } from '../DiscogsUI.jsx';
import { SleeveHead, SleeveFoot, trackOf } from '../poster/Sleeve.jsx';
import { getRelease } from '../discogs.js';

const EMPTY = { artist: '', title: '', year: '', format: 'LP', condition: '', catalogNo: '', pressingNotes: '', price: '', status: 'available', discogsId: null, coverUrl: '' };

export default function StorePortal({ user }) {
  const [storeId, setStoreId] = useState(null);
  const [tab, setTab] = useState('listings');
  const [flash, setFlash] = useState(null);

  if (!user) {
    return (
      <section className="sleeve-back portal portal-small">
        <SleeveHead cat="For stores · staff access" />
        <p className="rs-artist big">Store portal</p>
        <h1 className="sb-title">Put your crates on the map</h1>
        <p className="sb-meta">Calgary record-shop owners and staff sign in here to list records, mark sales and confirm what’s on the shelves.</p>
        <a className="btn primary" href="#/signin?next=/portal">Sign in to manage your shop</a>
        <SleeveFoot>Listing on VinylScout is free during the Calgary pilot.</SleeveFoot>
      </section>
    );
  }
  if (user.role === 'collector') {
    return <section className="sleeve-back portal portal-small"><SleeveHead cat="For stores · staff access" /><h1 className="sb-title">Store portal</h1><Notice kind="error">Your account is a collector account. Only authorized store staff can manage listings.</Notice></section>;
  }

  const stores = api.myStores();
  const store = stores.find((s) => s.id === storeId) || stores[0];
  if (!store) return <section className="sleeve-back portal portal-small"><SleeveHead cat="For stores · staff access" /><h1 className="sb-title">Store portal</h1><p className="sb-meta">No shop is linked to your account yet. Contact the VinylScout admin.</p></section>;

  const show = (kind, msg) => { setFlash({ kind, msg }); window.clearTimeout(show.t); show.t = window.setTimeout(() => setFlash(null), 4000); };

  const t = trackOf(store.id);
  return (
    <section className="sleeve-back portal">
      <SleeveHead cat={`Store portal · ${t.side.key || ''} · ${store.neighbourhood}`} />
      <div className="portal-head">
        <div>
          <p className="rs-artist big">Store portal</p>
          <h1 className="sb-title">{store.name}</h1>
          <p className="sb-meta">Signed in as {user.name}. <a href={`#/store/${store.id}`}>View your public page →</a></p>
        </div>
        {stores.length > 1 && (
          <label className="store-switch">Managing:{' '}
            <select value={store.id} onChange={(e) => setStoreId(e.target.value)}>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="sb-seg portal-tabs" role="tablist">
        {[['listings', 'Listings'], ['add', '+ Add record'], ['profile', 'Store profile']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {flash && <Notice kind={flash.kind}>{flash.msg}</Notice>}
      {tab === 'listings' && <ListingsTab key={store.id} store={store} show={show} onAdd={() => setTab('add')} />}
      {tab === 'add' && <ListingForm initial={EMPTY} submitLabel="Publish listing" onSubmit={(d) => {
        api.createListing(store.id, d); show('ok', `Published “${d.title}”. It’s marked as confirmed today.`); setTab('listings');
      }} />}
      {tab === 'profile' && <ProfileForm key={store.id} store={store} show={show} />}
      <SleeveFoot>Changes go live for collectors immediately. Use “Confirm” only after you’ve actually checked the shelf — that date is what collectors trust.</SleeveFoot>
    </section>
  );
}

function ListingsTab({ store, show, onAdd }) {
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [removing, setRemoving] = useState(null); // listing id awaiting an on-page "remove for good?" confirm
  const rows = api.storeListings(store.id);
  const shown = rows.filter((r) => filter === 'all' || (filter === 'attention' ? r.status === 'available' && r.fresh.key !== 'recent' : r.status === filter));
  const needs = rows.filter((r) => r.status === 'available' && r.fresh.key !== 'recent').length;
  const available = rows.filter((r) => r.status === 'available');
  const freshPct = available.length ? Math.round((available.filter((r) => r.fresh.key === 'recent').length / available.length) * 100) : 0;

  const act = (fn, msg) => { try { fn(); show('ok', msg); } catch (e) { show('error', e.message); } };

  if (editing) {
    const l = rows.find((r) => r.id === editing);
    return <ListingForm initial={{ ...l, price: l.price ?? '' }} submitLabel="Save changes" allowConfirm onCancel={() => setEditing(null)}
      onSubmit={(d, confirm) => { api.updateListing(l.id, d, { confirm }); show('ok', `Saved “${d.title}”.${confirm ? ' Marked as confirmed today.' : ''}`); setEditing(null); }} />;
  }

  return (
    <>
      <div className="stats">
        <div className="stat"><b>{available.length}</b><span>your listings live</span></div>
        <div className="stat"><b>{freshPct}%</b><span>confirmed in last 7 days</span></div>
        <div className={`stat ${needs ? 'warn' : ''}`}><b>{needs}</b><span>need reconfirming</span></div>
      </div>
      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter listings">
          <option value="all">All listings</option>
          <option value="attention">Needs reconfirming</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <button className="btn primary"
          onClick={() => act(() => api.confirmAll(store.id), `Confirmed today: your catalogue stock${available.length ? ` and ${available.length} listing${available.length === 1 ? '' : 's'}` : ''}.`)}>
          ✓ I checked the shelves — confirm all available
        </button>
        <button className="btn ghost" onClick={onAdd}>+ Add record</button>
      </div>
      {!shown.length && <p className="portal-empty">No listings in this view yet. Add the records people ask you about most — artist, title and a price is enough.</p>}
      <div className="manage-list">
        {shown.map((r) => (
          <div className={`manage-row ${r.status !== 'available' ? 'dim' : ''}`} key={r.id}>
            <Cover listing={r} size={48} />
            <div className="manage-main">
              <b>{r.title}</b> <span className="muted">— {r.artist}</span>
              <div className="small muted">{[r.year, r.format, r.condition].filter(Boolean).join(' · ') || 'No release details'} · {money(r.price) ?? 'no price'}</div>
              <div className="badges">
                {r.status === 'available' ? <FreshBadge fresh={r.fresh} long /> : <span className="badge status-no">Unavailable — hidden from search</span>}
                {r.hidden && <span className="badge status-no">Hidden by admin</span>}
              </div>
            </div>
            <div className="manage-actions">
              {r.status === 'available' && <button className="btn sm" onClick={() => act(() => api.confirmListing(r.id), `Confirmed “${r.title}” as checked today.`)}>Confirm</button>}
              {r.status === 'available'
                ? <button className="btn sm ghost" onClick={() => act(() => api.setAvailability(r.id, 'unavailable'), `“${r.title}” marked sold/unavailable.`)}>Sold / unavailable</button>
                : <button className="btn sm ghost" onClick={() => act(() => api.setAvailability(r.id, 'available'), `“${r.title}” is back in stock.`)}>Back in stock</button>}
              <button className="btn sm ghost" onClick={() => setEditing(r.id)}>Edit</button>
              {removing === r.id ? (
                <span className="confirm-inline" role="group" aria-label={`Remove ${r.title}?`}>
                  <span>Remove for good?</span>
                  <button className="btn sm danger-solid" onClick={() => { setRemoving(null); act(() => api.removeListing(r.id), `Removed “${r.title}”. Collectors no longer see it.`); }}>Yes, remove</button>
                  <button className="btn sm ghost" onClick={() => setRemoving(null)}>Cancel</button>
                </span>
              ) : (
                <button className="btn sm ghost danger" onClick={() => setRemoving(r.id)}>Remove</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="muted small">Your store already shows stock for most of the Discogs catalogue. Add a listing here to override a specific record (real price, condition, or mark it sold). Tip: you don’t need to list your whole inventory — just records people tend to ask for. Editing details doesn’t change the “last confirmed” date; use Confirm when you’ve actually checked the shelf.</p>
    </>
  );
}

function ListingForm({ initial, onSubmit, onCancel, submitLabel, allowConfirm = false }) {
  const [d, setD] = useState(initial);
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const [linking, setLinking] = useState(!initial.discogsId && !initial.artist);

  // Fill the form from a Discogs search result, then enrich from the full release record.
  const pick = (r) => {
    setLinking(false);
    setErrs({});
    setD((cur) => ({
      ...cur, discogsId: r.id, coverUrl: r.cover || r.thumb || '',
      artist: r.artist || cur.artist, title: r.title || cur.title,
      year: r.year || '', format: r.format || cur.format, catalogNo: r.catalogNo || '',
      pressingNotes: cur.pressingNotes || [r.country && `${r.country} pressing`, r.label, r.formatText].filter(Boolean).join(' · '),
    }));
    getRelease(r.id).then((full) => setD((cur) => (cur.discogsId !== r.id ? cur : {
      ...cur, coverUrl: cur.coverUrl || full.cover, artist: full.artist || cur.artist,
    }))).catch(() => { /* search data is enough */ });
  };
  const unlink = () => { setD({ ...d, discogsId: null, coverUrl: '' }); setLinking(true); };

  const submit = (e) => {
    e.preventDefault();
    try { onSubmit(d, confirm); }
    catch (x) {
      setErrs(x.fields || {}); setMsg(x.message || 'Could not save. Nothing was changed.');
      e.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <form className="card form" onSubmit={submit} noValidate>
      {msg && <Notice kind="error">{msg}</Notice>}
      {d.discogsId ? (
        <div className="linked">
          <Cover listing={d} size={56} />
          <div className="linked-text">
            <span className="small muted">Linked to Discogs release</span>
            <b>{d.title} — {d.artist}</b>
            <a className="small" href={`https://www.discogs.com/release/${d.discogsId}`} target="_blank" rel="noopener">Check it’s the same pressing on Discogs ↗</a>
          </div>
          <button type="button" className="btn sm ghost" onClick={unlink}>Change</button>
        </div>
      ) : linking ? (
        <>
          <DiscogsPicker onPick={pick} initialQuery={[d.artist, d.title].filter(Boolean).join(' ')} />
          <button type="button" className="linkish small" onClick={() => setLinking(false)}>Can’t find it? Enter details by hand ↓</button>
        </>
      ) : (
        <button type="button" className="btn sm ghost" onClick={() => setLinking(true)}>🔍 Find this record on Discogs to fill details</button>
      )}
      <div className="grid2">
        <Field id="artist" label="Artist *" error={errs.artist}><input id="artist" value={d.artist} onChange={set('artist')} /></Field>
        <Field id="title" label="Album title *" error={errs.title}><input id="title" value={d.title} onChange={set('title')} /></Field>
        <Field id="price" label="Price (CAD)" error={errs.price} hint="Optional"><input id="price" inputMode="decimal" value={d.price} onChange={set('price')} placeholder="e.g. 35" /></Field>
        <Field id="condition" label="Condition" hint="Optional — e.g. New, NM, VG+"><input id="condition" value={d.condition} onChange={set('condition')} /></Field>
        <Field id="year" label="Release year" error={errs.year} hint="Optional"><input id="year" inputMode="numeric" value={d.year} onChange={set('year')} /></Field>
        <Field id="format" label="Format" hint="Optional"><input id="format" value={d.format} onChange={set('format')} placeholder="LP, 2xLP, 7&quot;…" /></Field>
        <Field id="catalogNo" label="Catalogue #" hint="Optional"><input id="catalogNo" value={d.catalogNo} onChange={set('catalogNo')} /></Field>
        <Field id="status" label="Availability">
          <select id="status" value={d.status} onChange={set('status')}>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable / sold</option>
          </select>
        </Field>
      </div>
      <Field id="pressingNotes" label="Pressing / edition notes" hint="Optional — reissue, coloured vinyl, original pressing…">
        <textarea id="pressingNotes" rows="2" value={d.pressingNotes} onChange={set('pressingNotes')} />
      </Field>
      {allowConfirm && <label className="check"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> I just checked this record is on the shelf — update “last confirmed” to today</label>}
      <div className="row">
        <button className="btn primary" type="submit">{submitLabel}</button>
        {onCancel && <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

function ProfileForm({ store, show }) {
  const [d, setD] = useState(store);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    try { api.updateStore(store.id, d); setErr(''); show('ok', 'Store profile saved.'); }
    catch (x) { setErr(x.message); }
  };
  return (
    <form className="card form" onSubmit={submit} noValidate>
      {err && <Notice kind="error">{err}</Notice>}
      <div className="grid2">
        <Field id="name" label="Store name *"><input id="name" value={d.name} onChange={set('name')} /></Field>
        <Field id="neighbourhood" label="Neighbourhood"><input id="neighbourhood" value={d.neighbourhood} onChange={set('neighbourhood')} /></Field>
        <Field id="address" label="Street address" hint="Used for the Directions link"><input id="address" value={d.address} onChange={set('address')} /></Field>
        <Field id="hours" label="Hours"><input id="hours" value={d.hours} onChange={set('hours')} /></Field>
        <Field id="phone" label="Phone" hint="Leave blank to hide"><input id="phone" value={d.phone} onChange={set('phone')} /></Field>
        <Field id="website" label="Website"><input id="website" value={d.website} onChange={set('website')} placeholder="https://" /></Field>
        <Field id="instagram" label="Instagram"><input id="instagram" value={d.instagram} onChange={set('instagram')} placeholder="@handle" /></Field>
      </div>
      <Field id="blurb" label="Short description"><textarea id="blurb" rows="2" value={d.blurb} onChange={set('blurb')} /></Field>
      <div className="row"><button className="btn primary" type="submit">Save profile</button><a className="btn ghost" href={`#/store/${store.id}`}>View public profile</a></div>
    </form>
  );
}
