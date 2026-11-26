import React from 'react';

// Stores hero: a felt letterboard sign. White plastic letters, each pushed in slightly crooked.
// The last line is the visitor's search, swapping in letter by letter as they type (in yellow letters).
// On search (going=true) the search line does a little wave before the results load.

const clean = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9 &'\-!?.]/g, '').replace(/\s+/g, ' ').trim().slice(0, 18);

// deterministic "hand-placed" wobble per letter slot
const wobble = (row, i) => {
  const h = Math.sin((row + 1) * 97.13 + (i + 1) * 13.7) * 43758.5453;
  const r = h - Math.floor(h);
  return { rot: (r - 0.5) * 7, y: ((r * 7) % 1 - 0.5) * 4 };
};

function Row({ text, row, kind = '' }) {
  return (
    <div className={`lb-row ${kind}`} style={{ '--len': Math.max(text.length, 7) }} aria-hidden="true">
      {text.split('').map((ch, i) => {
        const w = wobble(row, i);
        return (
          <span key={`${i}-${ch}`} className="lb-ch" style={{ '--rot': `${w.rot}deg`, '--dy': `${w.y}px`, '--i': i }}>
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
    </div>
  );
}

export default function LetterBoard({ text = '', going = false, shops = 12 }) {
  const q = clean(text);
  return (
    <div className={`lb ${q ? 'typing' : 'idle'} ${going ? 'going' : ''}`}>
      <div className="lb-frame">
        <div className="lb-felt">
          <Row row={0} text="CALGARY" />
          <Row row={1} text="RECORD SHOPS" />
          <Row row={2} text={going ? "LET'S DIG:" : 'NOW DIGGING:'} kind="small" />
          <Row row={3} text={q || 'YOUR SEARCH'} kind={`search ${q ? '' : 'placeholder'}`} />
          <Row row={4} text={`${shops} SHOPS · CALL AHEAD`} kind="tiny" />
        </div>
        <span className="lb-screw tl" /><span className="lb-screw tr" /><span className="lb-screw bl" /><span className="lb-screw br" />
      </div>
      <p className="sr-only">Letterboard sign: Calgary record shops, now digging {q || 'your search'}.</p>
    </div>
  );
}
