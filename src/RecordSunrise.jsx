import React, { useEffect, useRef, useState } from 'react';

// Vinyls hero: a big record rising out of its sleeve like a sunrise, with riso sun-rays behind.
// Whatever the visitor types is printed live around the centre label.
// Typing nudges the spin; submitting drops the tonearm (dropping=true) just before results load.
// Rotation runs on requestAnimationFrame so speed changes stay smooth; static for reduced motion.

const BASE = 36;      // deg/s idle spin
const TYPE_KICK = 120; // deg/s added per keystroke (decays)
const DROP = 420;     // deg/s once the needle drops

function labelText(text) {
  const t = (text || '').trim().toUpperCase().replace(/\s+/g, ' ').slice(0, 40);
  const unit = t ? `${t} · ` : 'TYPE AN ARTIST OR ALBUM · ';
  let out = '';
  while (out.length < 46) out += unit; // fill the full circle so it reads at any angle
  return out;
}

export default function RecordSunrise({ text = '', dropping = false }) {
  const disc = useRef(null);
  const speed = useRef(BASE);
  const angle = useRef(0);
  const dropRef = useRef(dropping);
  dropRef.current = dropping;
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- drag to spin: the record follows the pointer's angle around its centre; letting go flings it ----
  const drag = useRef({ on: false, last: 0, t: 0, vel: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const pointerAngle = (e) => {
    const r = disc.current.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  };
  const onDown = (e) => {
    if (!disc.current) return;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* synthetic or already-released pointer */ }
    drag.current = { on: true, last: pointerAngle(e), t: performance.now(), vel: 0 };
    setGrabbing(true);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d.on) return;
    const a = pointerAngle(e);
    let delta = a - d.last;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const now = performance.now();
    const dt = Math.max(1, now - d.t) / 1000;
    d.vel = d.vel * 0.6 + (delta / dt) * 0.4; // smoothed deg/s for the fling
    d.last = a; d.t = now;
    angle.current = (angle.current + delta) % 360;
    disc.current.style.transform = `rotate(${angle.current}deg)`;
  };
  const onUp = () => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    setGrabbing(false);
    if (performance.now() - d.t > 120) d.vel = 0; // held still before letting go → no fling
    speed.current = Math.max(-1600, Math.min(1600, d.vel));
  };

  // every keystroke gives the platter a push
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    speed.current = Math.min(speed.current + TYPE_KICK, 520);
  }, [text]);

  useEffect(() => {
    if (reduced) return undefined;
    let raf = 0, last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (drag.current.on) return; // the hand is on the record
      const target = dropRef.current ? DROP : BASE;
      speed.current += (target - speed.current) * Math.min(1, dt * (dropRef.current ? 6 : 1.4));
      angle.current = (angle.current + speed.current * dt) % 360;
      if (disc.current) disc.current.style.transform = `rotate(${angle.current}deg)`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const typed = (text || '').trim();
  return (
    <div className={`sunrise ${dropping ? 'dropping' : ''} ${typed ? 'typing' : ''} ${grabbing ? 'grabbing' : ''}`} aria-hidden="true">
      <div className="sun-record">
        <div className="sun-rays" />
        <div className="sun-glow" />
        <div className="sun-disc" ref={disc} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="sun-grooves" />
          <svg className="sun-label" viewBox="0 0 200 200">
            <defs>
              <path id="label-ring" d="M100,100 m-68,0 a68,68 0 1,1 136,0 a68,68 0 1,1 -136,0" />
            </defs>
            <circle cx="100" cy="100" r="96" className="sl-bg" />
            <circle cx="100" cy="100" r="82" className="sl-ring" />
            <text className="sl-curve"><textPath href="#label-ring" startOffset="0">{labelText(text)}</textPath></text>
            <text x="100" y="86" className="sl-brand">VINYLSCOUT</text>
            <text x="100" y="128" className="sl-side">SIDE A · 33⅓</text>
            <circle cx="100" cy="100" r="5" className="sl-hole" />
          </svg>
        </div>
        <div className="sun-sheen" />
      </div>
      <div className="tonearm">
        <div className="ta-base" />
        <div className="ta-arm"><div className="ta-head" /></div>
      </div>
      <div className="sun-caption">{typed ? <>Pressing: <b>{typed}</b></> : 'Type to press your search onto the label — or grab the record and spin it'}</div>
    </div>
  );
}
