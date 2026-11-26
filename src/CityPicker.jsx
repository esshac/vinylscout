import React, { useEffect, useRef, useState } from 'react';
import * as api from './api.js';

// Header city picker. The test run covers Calgary only; other cities are listed as "coming soon"
// so the multi-city plan is visible without pretending those markets exist yet.
const CITIES = [
  { code: 'YYC', name: 'Calgary', live: true },
  { code: 'YEG', name: 'Edmonton', live: false },
  { code: 'YVR', name: 'Vancouver', live: false },
  { code: 'YYZ', name: 'Toronto', live: false },
];

export default function CityPicker() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = CITIES[0];
  const shops = api.listStores().length;

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="city" ref={ref}>
      <button type="button" className="city-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="city-pin" aria-hidden="true" />
        <span className="city-code">{current.code}</span>
        <span className="city-name">{current.name}</span>
        <span className="city-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="city-menu" role="listbox" aria-label="Choose a city">
          <div className="city-menu-head">Choose your city</div>
          {CITIES.map((c) => (
            <button key={c.code} type="button" role="option" aria-selected={c.code === current.code} aria-disabled={!c.live}
                    className={`city-opt ${c.code === current.code ? 'on' : ''} ${c.live ? '' : 'soon'}`}
                    onClick={() => { if (c.live) setOpen(false); }}>
              <span className="city-opt-code">{c.code}</span>
              <span className="city-opt-name">{c.name}</span>
              <span className="city-opt-meta">{c.live ? `${shops} shops` : 'coming soon'}</span>
              {c.code === current.code && <span className="city-tick" aria-hidden="true">✓</span>}
            </button>
          ))}
          <div className="city-menu-foot">Calgary is our pilot city. More cities once the pilot proves out.</div>
        </div>
      )}
    </div>
  );
}
