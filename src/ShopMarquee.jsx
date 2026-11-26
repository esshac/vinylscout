import React from 'react';
import { shortName } from './poster/geo.js';

// Stores hero: the shop names set huge in poster type, drifting in rows that alternate direction.
// Hover a row to pause it, click a name to open the shop. As you type, shops that don't match fade back.
// Each row is rendered twice side by side so the CSS loop is seamless.

// brighter riso inks for type on the dark sleeve (the print blue is too dark to read here)
const INK = { NW: '#7d97ff', SW: '#ff5fa6', SE: '#ff7a3d', NE: '#ffd34d' };

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

export default function ShopMarquee({ tracks, text = '', going = false }) {
  const q = norm(text);
  const matches = (t) => !q || norm(`${t.store.name} ${t.store.neighbourhood} ${t.store.address}`).includes(q);
  const anyMatch = !q || tracks.some(matches);
  const hits = q ? tracks.filter(matches).length : tracks.length;
  const rows = [tracks.slice(0, 4), tracks.slice(4, 8), tracks.slice(8)].filter((r) => r.length);

  return (
    <div className={`mq ${q ? 'typing' : ''} ${going ? 'going' : ''}`}>
      <div className="mq-caption" aria-live="polite">
        {!q ? 'Hover to pause · click a shop'
          : anyMatch ? <>Digging <b>{text.trim()}</b> · {hits} shop{hits === 1 ? '' : 's'}</>
          : <>Checking every crate for <b>{text.trim()}</b></>}
      </div>
      <div className="mq-rows">
        {rows.map((row, r) => (
          <div className={`mq-row ${r % 2 ? 'rev' : ''}`} key={r} style={{ '--dur': `${34 + r * 7}s` }}>
            <div className="mq-track">
              {[0, 1].map((copy) => (
                <div className="mq-set" key={copy} aria-hidden={copy === 1 ? 'true' : undefined}>
                  {row.map((t) => {
                    const on = !anyMatch || matches(t);
                    return (
                      <a key={t.store.id} href={`#/store/${t.store.id}`} tabIndex={copy ? -1 : 0}
                         className={`mq-item ${on ? (q ? 'hit' : '') : 'dim'}`} style={{ '--ink': INK[t.side.key] }}
                         aria-label={copy ? undefined : `${t.store.name}, ${t.store.neighbourhood}`}>
                        <span className="mq-name">{shortName(t.store.name)}</span>
                        <span className="mq-hood">{t.store.neighbourhood}</span>
                        <span className="mq-dot" aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
