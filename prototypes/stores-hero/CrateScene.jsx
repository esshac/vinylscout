import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { INK, shortName } from '../poster/geo.js';

// Interactive 3D record crate for the Stores tab hero.
// One sleeve per shop, each with generated cover art in the poster's riso inks.
// Flip through like real crate-digging: drag up/down, use the ‹ › buttons or arrow keys, or click a sleeve.
// The chosen sleeve lifts out; click it (or "Open shop") to visit the store. Idles by flipping on its own.

const PALETTES = [
  [INK.blue, INK.pink, INK.paper], [INK.pink, INK.yellow, INK.black], [INK.orange, INK.blue, INK.paper],
  [INK.yellow, INK.black, INK.pink], [INK.black, INK.orange, INK.paper], [INK.paper, INK.blue, INK.orange],
];

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function coverTexture(track, fontsReady) {
  const S = 512;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const h = hash(track.store.id);
  const [bg, a, b] = PALETTES[h % PALETTES.length];
  const display = fontsReady ? '"Anton", Impact, sans-serif' : 'Impact, sans-serif';
  const mono = fontsReady ? '"DM Mono", monospace' : 'monospace';
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  g.save();
  g.globalCompositeOperation = 'multiply';
  switch (h % 5) {
    case 0: // concentric record rings
      for (let r = 380; r > 20; r -= 26) { g.strokeStyle = a; g.lineWidth = 10; g.beginPath(); g.arc(S * 0.62, S * 0.42, r, 0, Math.PI * 2); g.stroke(); }
      break;
    case 1: // diagonal stripes
      g.translate(S / 2, S / 2); g.rotate(-0.6);
      for (let x = -S; x < S; x += 46) { g.fillStyle = a; g.fillRect(x, -S, 22, S * 2); }
      break;
    case 2: // halftone dots growing to one corner
      for (let y = 10; y < S; y += 22) for (let x = 10; x < S; x += 22) {
        const r = ((x + y) / (S * 2)) * 10; g.fillStyle = a; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      break;
    case 3: // sunburst
      g.translate(S * 0.5, S * 0.95);
      for (let i = 0; i < 24; i++) { g.rotate(Math.PI / 24); g.fillStyle = i % 2 ? a : 'transparent'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-40, -S * 1.2); g.lineTo(40, -S * 1.2); g.fill(); }
      break;
    default: // stacked circles
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? a : b; g.beginPath(); g.arc(S * (0.3 + i * 0.13), S * 0.4, 150 - i * 22, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
  // misregistered big number
  g.font = `220px ${display}`; g.textBaseline = 'alphabetic';
  g.globalAlpha = 0.85; g.fillStyle = b; g.fillText(track.code.padStart(2, '0'), 30, S - 34);
  g.globalAlpha = 1;
  // name block
  const name = shortName(track.store.name);
  g.fillStyle = INK.black; g.fillRect(0, 0, S, 150);
  g.fillStyle = INK.paper;
  let size = 70; g.font = `${size}px ${display}`;
  while (g.measureText(name).width > S - 50 && size > 34) { size -= 4; g.font = `${size}px ${display}`; }
  g.fillText(name, 26, 84);
  g.font = `500 22px ${mono}`; g.fillStyle = a === INK.black ? INK.yellow : a;
  g.fillText(`${track.store.neighbourhood.toUpperCase()} · ${track.km.toFixed(1)} KM`, 28, 124);
  // wear + edge
  g.globalAlpha = 0.08; g.fillStyle = '#000';
  for (let i = 0; i < 1400; i++) g.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5);
  g.globalAlpha = 1;
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3; g.beginPath(); g.arc(S / 2, S / 2, S * 0.46, 0, Math.PI * 2); g.stroke(); // ring wear
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function woodTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#a8713f'; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(${70 + Math.random() * 40},${40 + Math.random() * 20},20,${0.15 + Math.random() * 0.25})`;
    g.lineWidth = 1 + Math.random() * 2; g.beginPath();
    const y = Math.random() * 64; g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 3);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function webglAvailable() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

export default function CrateScene({ tracks, onOpen }) {
  const mount = useRef(null);
  const api = useRef({});
  const [sel, setSel] = useState(0);
  const [fallback, setFallback] = useState(false);
  const openRef = useRef(onOpen); openRef.current = onOpen;
  const N = tracks.length;

  useEffect(() => {
    const el = mount.current;
    if (!el) return undefined;
    if (!webglAvailable()) { setFallback(true); return undefined; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setFallback(true); return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.prepend(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    const target = new THREE.Vector3(0, 0.62, 0);

    scene.add(new THREE.HemisphereLight(0xfff2dc, 0x2a1a10, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2.5, 4, 3.5); scene.add(key);
    const rim = new THREE.PointLight(0xff6a2b, 14, 8); rim.position.set(-2.2, 1.8, -1.5); scene.add(rim);

    const root = new THREE.Group(); scene.add(root);

    // floor shadow
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.0), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.001; root.add(shadow);

    // crate
    const W = 1.22, D = 0.95 + N * 0.02, H = 0.62, T = 0.035;
    const wood = woodTexture();
    const woodMat = (rx) => { const t = wood.clone(); t.needsUpdate = true; t.repeat.set(rx, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }); };
    const plank = (w, h, d, x, y, z, rx = 1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat(rx)); m.position.set(x, y, z); root.add(m); return m; };
    plank(W + T * 2, T, D, 0, T / 2, 0, 3);                       // floor
    plank(T, H, D, -W / 2 - T / 2, H / 2, 0, 2);                    // left
    plank(T, H, D, W / 2 + T / 2, H / 2, 0, 2);                     // right
    plank(W + T * 2, H * 0.42, T, 0, H * 0.21, D / 2 + T / 2, 3);   // low front lip
    plank(W + T * 2, H, T, 0, H / 2, -D / 2 - T / 2, 3);            // back
    // label card on the front lip
    const lc = document.createElement('canvas'); lc.width = 512; lc.height = 96;
    const lg = lc.getContext('2d'); lg.fillStyle = INK.paper; lg.fillRect(0, 0, 512, 96);
    lg.fillStyle = INK.black; lg.font = '54px "Anton", Impact, sans-serif'; lg.textAlign = 'center'; lg.fillText('CALGARY RECORD SHOPS', 256, 70);
    const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.115), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.9 }));
    label.position.set(0, H * 0.22, D / 2 + T + 0.002); label.rotation.z = -0.02; root.add(label);

    // sleeves: index 0 at the front
    const SW = 1.06, ST = 0.014;
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xe9dfcb, roughness: 0.9 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x2a241f, roughness: 0.9 });
    const sleeves = tracks.map((tr, i) => {
      const pivot = new THREE.Group();
      const z = D / 2 - 0.12 - i * ((D - 0.22) / Math.max(1, N - 1));
      pivot.position.set((i % 3 - 1) * 0.008, T, z);
      const front = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.02, map: coverTexture(tr, false) });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(SW, SW, ST), [edgeMat, edgeMat, edgeMat, edgeMat, front, backMat]);
      mesh.position.y = SW / 2;
      mesh.userData.index = i;
      pivot.add(mesh); root.add(pivot);
      return { pivot, mesh, front, tilt: 0, lift: 0, jitter: (Math.random() - 0.5) * 0.04 };
    });
    // repaint covers once the poster fonts are ready
    (document.fonts?.load ? Promise.all([document.fonts.load('70px "Anton"'), document.fonts.load('22px "DM Mono"')]) : Promise.resolve())
      .then(() => { if (disposed) return; sleeves.forEach((s, i) => { s.front.map.dispose(); s.front.map = coverTexture(tracks[i], true); s.front.needsUpdate = true; }); })
      .catch(() => {});

    // ---------- state + interaction ----------
    let current = 0, hovered = -1, lastInteract = -Infinity;
    const select = (i, user = true) => {
      current = ((i % N) + N) % N; setSel(current);
      if (user) lastInteract = performance.now();
    };
    api.current = { next: () => select(current + 1), prev: () => select(current - 1), go: (i) => select(i) };

    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(-10, -10);
    let dragging = false, startY = 0, accum = 0, moved = 0, tiltAimX = 0, tiltAimY = 0;
    const toNdc = (e) => { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); tiltAimX = ndc.y * 0.05; tiltAimY = ndc.x * 0.18; };
    const canvas = renderer.domElement;
    const onMove = (e) => {
      toNdc(e);
      if (!dragging) return;
      const dy = e.clientY - startY; startY = e.clientY; moved += Math.abs(dy); accum += dy;
      while (accum > 38) { accum -= 38; select(current + 1); }   // pull toward you → flip forward
      while (accum < -38) { accum += 38; select(current - 1); }
    };
    const onDown = (e) => { dragging = true; startY = e.clientY; accum = 0; moved = 0; toNdc(e); canvas.setPointerCapture?.(e.pointerId); el.classList.add('grabbing'); };
    const onUp = () => {
      if (!dragging) return; dragging = false; el.classList.remove('grabbing');
      if (moved < 6) { // a click: raycast now (hover only updates per frame)
        hovered = pick();
        if (hovered === current) openRef.current?.(tracks[current].store.id);
        else if (hovered >= 0) select(hovered);
        else select(current + 1);
      }
    };
    const onLeave = () => { ndc.set(-10, -10); tiltAimX = 0; tiltAimY = 0; };
    const pick = () => {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(sleeves.map((s) => s.mesh), false)[0];
      return hit ? hit.object.userData.index : -1;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);

    // ---------- sizing / visibility ----------
    let narrow = false;
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; narrow = w / h < 1.05; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 }); io.observe(el);

    // ---------- loop ----------
    const t0 = performance.now(); let last = t0, raf = 0, tiltX = 0, tiltY = 0, autoAt = t0 + 2600;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;

      // idle: keep flipping on its own until someone touches it (and 8s after they stop)
      if (!reduced && !dragging && now > autoAt && now - lastInteract > 8000) { select(current + 1, false); autoAt = now + 2600; }

      // camera
      tiltX += (tiltAimX - tiltX) * Math.min(1, dt * 3); tiltY += (tiltAimY - tiltY) * Math.min(1, dt * 3);
      const az = 0.5 + tiltY + (reduced ? 0 : Math.sin(t * 0.25) * 0.06);
      const elv = 0.5 + tiltX; const R = narrow ? 4.6 : 3.7;
      camera.position.set(Math.sin(az) * Math.cos(elv) * R, 0.35 + Math.sin(elv) * R, Math.cos(az) * Math.cos(elv) * R);
      camera.lookAt(target);

      hovered = pick();
      canvas.style.cursor = dragging ? 'grabbing' : hovered >= 0 ? 'pointer' : 'grab';

      sleeves.forEach((s, i) => {
        // flipped-past sleeves fall toward you; chosen lifts and stands; the rest lean back
        const tTilt = i < current ? Math.min(0.62, 0.42 + (current - i) * 0.05) : i === current ? -0.05 : -0.16 - Math.min(3, i - current) * 0.015;
        const tLift = i === current ? 0.34 + (hovered === i ? 0.06 : 0) : hovered === i ? 0.05 : 0;
        const k = reduced ? 1 : Math.min(1, dt * 9);
        s.tilt += (tTilt - s.tilt) * k; s.lift += (tLift - s.lift) * k;
        s.pivot.rotation.x = s.tilt + s.jitter * 0.3;
        s.pivot.rotation.z = s.jitter;
        s.pivot.position.y = T + s.lift;
        s.front.emissive = s.front.emissive || new THREE.Color();
        s.front.emissive.setRGB(1, 1, 1); s.front.emissiveIntensity = i === current ? 0.04 : 0;
      });
      root.rotation.y = reduced ? 0 : Math.sin(t * 0.3) * 0.02;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointerleave', onLeave);
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
      });
      renderer.dispose(); canvas.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = tracks[sel];
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); api.current.next?.(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); api.current.prev?.(); }
    if (e.key === 'Enter' && cur) onOpen?.(cur.store.id);
  };

  if (fallback) return <div className="scene scene-fallback" aria-hidden="true"><div className="css-disc" /></div>;
  return (
    <div className="crate-wrap">
      <div className="scene crate" ref={mount} tabIndex={0} onKeyDown={onKey} aria-label="Record crate: one sleeve per Calgary shop. Use arrow keys to flip, Enter to open.">
        <span className="scene-hint" aria-hidden="true">click or drag to dig · click the raised sleeve to open</span>
      </div>
      {cur && (
        <div className="crate-now" aria-live="polite">
          <button type="button" className="crate-btn" onClick={() => api.current.prev?.()} aria-label="Previous shop">‹</button>
          <div className="crate-now-text" key={cur.store.id}>
            <span className="crate-no">No. {cur.code.padStart(2, '0')} / {String(N).padStart(2, '0')}</span>
            <b>{cur.store.name}</b>
            <span className="small muted">{cur.store.neighbourhood} · {cur.km.toFixed(1)} km from downtown</span>
          </div>
          <button type="button" className="crate-btn" onClick={() => api.current.next?.()} aria-label="Next shop">›</button>
          <button type="button" className="btn primary sm crate-open" onClick={() => onOpen?.(cur.store.id)}>Open shop →</button>
        </div>
      )}
    </div>
  );
}
