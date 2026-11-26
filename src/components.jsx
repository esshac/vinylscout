import React from 'react';
import * as api from './api.js';

export function FreshBadge({ fresh, long = false }) {
  const when = fresh.days == null ? 'never confirmed'
    : fresh.days === 0 ? 'confirmed today'
    : `confirmed ${fresh.days} day${fresh.days === 1 ? '' : 's'} ago`;
  return (
    <span className={`badge fresh-${fresh.key}`} title={`${fresh.label} — ${when}`}>
      <span className="dot" aria-hidden="true" />
      {fresh.label}{long && <span className="when"> · {when}</span>}
    </span>
  );
}

export function StatusBadge({ status }) {
  if (status === 'available') return <span className="badge status-ok">In stock (per store)</span>;
  if (status === 'unavailable') return <span className="badge status-no">Marked unavailable</span>;
  return <span className="badge status-no">Removed</span>;
}

export const money = (p) => (p == null ? null : `$${Number(p).toFixed(2)}`);

export function ReleaseLine({ l }) {
  const bits = [l.year, l.format, l.condition && `Condition: ${l.condition}`, l.catalogNo && `Cat# ${l.catalogNo}`].filter(Boolean);
  return bits.length ? <span className="release">{bits.join(' · ')}</span> : <span className="release muted">No release details provided</span>;
}

// FR-7: show only real contact details, never fabricate; record clicks for pilot metrics
export function ContactLinks({ store, compact = false }) {
  const items = [];
  if (store.phone) items.push({ key: 'phone', href: `tel:${store.phone.replace(/[^\d+]/g, '')}`, label: `Call ${store.phone}` });
  if (store.website) items.push({ key: 'website', href: store.website, label: 'Website', ext: true });
  if (store.instagram) items.push({ key: 'instagram', href: `https://instagram.com/${store.instagram.replace('@', '')}`, label: store.instagram, ext: true });
  if (store.address) items.push({ key: 'directions', href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`, label: 'Directions', ext: true });
  if (!items.length) return <p className="muted">This store hasn’t added contact details yet.</p>;
  return (
    <div className={`contact ${compact ? 'compact' : ''}`}>
      {items.map((i) => (
        <a key={i.key} className="btn ghost sm" href={i.href}
           {...(i.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
           onClick={() => api.trackContact(store.id, i.key)}>
          {i.label}
        </a>
      ))}
    </div>
  );
}

export function Notice({ kind = 'info', children }) {
  return <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Field({ label, error, hint, children, id }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small className="err">{error}</small>}
    </div>
  );
}
