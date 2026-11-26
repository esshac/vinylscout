import React, { useEffect, useMemo, useRef, useState } from 'react';

// Stores hero: an embossing label maker. As you type, red tape feeds out with each letter stamped in
// raised white type; the letter wheel turns to that character and the trigger squeezes every keystroke.
// Idle, it stamps shop names on its own. On search (cutting=true) the tape is cut and stuck onto the crate.

const WHEEL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&-'.split('');
const DEMO = ['HOT WAX', 'SLOTH', 'RECORDLAND', 'INGLEWOOD', 'BLACKBYRD', 'KENSINGTON', 'NEON TASTE'];
const clean = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9 &'\-!.]/g, '').replace(/\s+/g, ' ').slice(0, 22);

function useIdleDemo(active) {
  const [demo, setDemo] = useState('');
  useEffect(() => {
    if (!active) { setDemo(''); return undefined; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDemo(DEMO[0]); return undefined; }
    let word = 0, i = 0, timer = 0, alive = true;
    const step = () => {
      if (!alive) return;
      const w = DEMO[word % DEMO.length];
      if (i <= w.length) { setDemo(w.slice(0, i)); i += 1; timer = setTimeout(step, i === 1 ? 500 : 150); }
      else { timer = setTimeout(() => { setDemo(''); i = 0; word += 1; step(); }, 1500); }
    };
    timer = setTimeout(step, 600);
    return () => { alive = false; clearTimeout(timer); };
  }, [active]);
  return demo;
}

export default function LabelMaker({ text = '', cutting = false }) {
  const typed = clean(text);
  const demo = useIdleDemo(!typed && !cutting);
  const shown = typed || demo;
  const last = shown.replace(/\s+$/, '').slice(-1);
  const idx = Math.max(0, WHEEL.indexOf(last));

  // keep turning the same way: accumulate the shortest step to the next letter
  const angle = useRef(0);
  const prevIdx = useRef(0);
  const stepDeg = 360 / WHEEL.length;
  useMemo(() => {
    let d = idx - prevIdx.current;
    if (d > WHEEL.length / 2) d -= WHEEL.length;
    if (d < -WHEEL.length / 2) d += WHEEL.length;
    angle.current -= d * stepDeg;
    prevIdx.current = idx;
  }, [idx, stepDeg]);

  const size = Math.max(17, Math.min(32, 36 - shown.length * 1.05)); // shrink long labels so they fit
  return (
    <div className={`lm ${typed ? 'typing' : 'idle'} ${cutting ? 'cutting' : ''}`} aria-hidden="true">
      <div className="lm-dots" />

      {/* crate with labels already stuck on */}
      <div className="lm-crate">
        <span className="lm-old" style={{ '--r': '-4deg', left: '6%' }}>KENSINGTON</span>
        <span className="lm-old" style={{ '--r': '3deg', left: '40%' }}>BELTLINE</span>
        <span className="lm-old" style={{ '--r': '-2deg', left: '70%' }}>INGLEWOOD</span>
      </div>

      {/* the tape */}
      <div className="lm-tape-wrap">
        <div className="lm-tape" style={{ fontSize: `${size}px` }}>
          {shown.split('').map((ch, i) => <span key={i} className="lm-char">{ch === ' ' ? ' ' : ch}</span>)}
          <span className="lm-feed" />
        </div>
        <span className="lm-cut" />
      </div>

      {/* the device */}
      <div className="lm-device">
        <div className="lm-wheel-window">
          <div className="lm-wheel" style={{ transform: `rotate(${angle.current}deg)` }}>
            {WHEEL.map((c, i) => <span key={c} style={{ transform: `rotate(${i * stepDeg}deg) translateY(-46px)` }}>{c}</span>)}
          </div>
          <span className="lm-pointer" />
        </div>
        <div className="lm-body">
          <span className="lm-brand">LABEL·MAKER</span>
          <span className="lm-screw a" /><span className="lm-screw b" />
          <span className="lm-slot" />
        </div>
        <div className="lm-handle" key={shown.length}><span /></div>
      </div>

      <div className="lm-caption">
        {cutting ? <>Cutting: <b>{typed}</b></> : typed ? <>Stamping: <b>{typed}</b></> : 'Type a shop, neighbourhood or artist to stamp it'}
      </div>
    </div>
  );
}
