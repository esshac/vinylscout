import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Interactive 3D turntable for the landing page.
// - record spins at "33⅓", tonearm drops onto the record on load
// - mouse/touch tilts the deck; dragging across the record "scratches" (spins it by hand)
// - a search (window event 'vinylscout:spin') gives it a burst of speed
// - pauses when off-screen or tab hidden; static render for prefers-reduced-motion

const ACCENT = '#e8572a';

function makeRecordTexture() {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const cx = S / 2;
  g.fillStyle = '#0c0c0d';
  g.fillRect(0, 0, S, S);
  // grooves: many thin rings with slightly varying brightness
  for (let r = S * 0.49; r > S * 0.17; r -= 1.6) {
    const v = 14 + Math.random() * 16 + (Math.sin(r * 0.21) > 0.96 ? 22 : 0);
    g.strokeStyle = `rgb(${v},${v},${v + 2})`;
    g.lineWidth = 0.9;
    g.beginPath(); g.arc(cx, cx, r, 0, Math.PI * 2); g.stroke();
  }
  // track gaps
  [0.43, 0.36, 0.29, 0.23].forEach((f) => {
    g.strokeStyle = '#050505'; g.lineWidth = 5;
    g.beginPath(); g.arc(cx, cx, S * f, 0, Math.PI * 2); g.stroke();
  });
  // label
  const lr = S * 0.16;
  const grad = g.createRadialGradient(cx, cx, 0, cx, cx, lr);
  grad.addColorStop(0, '#ff8a5c'); grad.addColorStop(1, ACCENT);
  g.fillStyle = grad;
  g.beginPath(); g.arc(cx, cx, lr, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3;
  g.beginPath(); g.arc(cx, cx, lr * 0.93, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#1b1209';
  g.textAlign = 'center';
  g.font = '800 46px system-ui, sans-serif';
  g.fillText('VINYLSCOUT', cx, cx - 58);
  g.font = '600 22px system-ui, sans-serif';
  g.fillText('SIDE A  ·  33⅓ RPM', cx, cx + 78);
  g.font = '500 18px system-ui, sans-serif';
  g.fillText('CALGARY PILOT PRESSING', cx, cx + 108);
  // spindle hole
  g.fillStyle = '#d9d4cb';
  g.beginPath(); g.arc(cx, cx, 10, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeSheenTexture() {
  // a fixed "light reflection" band; stays still while the record spins under it → convincing sheen
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const cx = S / 2;
  const wedge = (a0, a1, alpha) => {
    const grad = g.createRadialGradient(cx, cx, S * 0.17, cx, cx, S * 0.5);
    grad.addColorStop(0, `rgba(255,255,255,0)`);
    grad.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, `rgba(255,255,255,0)`);
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(cx, cx); g.arc(cx, cx, S * 0.49, a0, a1); g.closePath(); g.fill();
  };
  g.filter = 'blur(14px)';
  wedge(-0.9, -0.45, 0.22); wedge(Math.PI - 0.9, Math.PI - 0.45, 0.16);
  // punch out the label
  g.filter = 'none';
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.arc(cx, cx, S * 0.165, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

export default function VinylScene() {
  const mount = useRef(null);
  const [fallback, setFallback] = useState(false);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const el = mount.current;
    if (!el) return undefined;
    if (!webglAvailable()) { setFallback(true); return undefined; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setFallback(true); return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0.3, 4.6, 6.1);
    camera.lookAt(0, -0.15, 0);

    // lights
    scene.add(new THREE.HemisphereLight(0xfff3e6, 0x221a14, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 6, 2); scene.add(key);
    const rim = new THREE.PointLight(0xff7a4a, 18, 12); rim.position.set(-3, 1.5, -2); scene.add(rim);

    const deck = new THREE.Group();
    scene.add(deck);

    // plinth
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.28, 3.7),
      new THREE.MeshStandardMaterial({ color: 0x2a211b, roughness: 0.55, metalness: 0.1 }),
    );
    plinth.position.set(0.35, -0.24, 0);
    deck.add(plinth);
    const topPlate = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.02, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x3b2f27, roughness: 0.4, metalness: 0.2 }),
    );
    topPlate.position.set(0.35, -0.09, 0);
    deck.add(topPlate);

    // platter
    const platter = new THREE.Mesh(
      new THREE.CylinderGeometry(1.62, 1.62, 0.12, 96),
      new THREE.MeshStandardMaterial({ color: 0x9a9a9e, roughness: 0.25, metalness: 0.9 }),
    );
    platter.position.y = -0.02;
    deck.add(platter);

    // record (spins)
    const recordTex = makeRecordTexture();
    const record = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.025, 160),
      [
        new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.4 }),
        new THREE.MeshStandardMaterial({ map: recordTex, roughness: 0.32, metalness: 0.25 }),
        new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.4 }),
      ],
    );
    record.position.y = 0.055;
    deck.add(record);

    // sheen (doesn't spin)
    const sheen = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 96),
      new THREE.MeshBasicMaterial({ map: makeSheenTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    sheen.rotation.x = -Math.PI / 2;
    sheen.position.y = 0.069;
    deck.add(sheen);

    // spindle
    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.2 }));
    spindle.position.y = 0.1;
    deck.add(spindle);

    // tonearm: pivot group at back-right
    const armPivot = new THREE.Group();
    armPivot.position.set(1.95, 0.08, -1.25);
    deck.add(armPivot);
    const metal = new THREE.MeshStandardMaterial({ color: 0xcfcfd4, metalness: 1, roughness: 0.25 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.18, 32), metal);
    armPivot.add(base);
    const counter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 24), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 }));
    counter.rotation.x = Math.PI / 2; counter.position.set(0, 0.16, -0.32);
    armPivot.add(counter);
    const armLift = new THREE.Group(); // tilts the arm up/down (needle drop)
    armLift.position.y = 0.16;
    armPivot.add(armLift);
    const armLen = 2.25;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, armLen, 16), metal);
    arm.rotation.x = Math.PI / 2; arm.position.z = armLen / 2;
    armLift.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.32), new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.35, metalness: 0.3 }));
    head.position.set(0, -0.03, armLen + 0.1);
    armLift.add(head);
    const REST_Y = 0.15, PLAY_Y = -0.5; // pivot yaw: rest (off record) → play (on outer groove)

    // dust particles
    const N = 160;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 8; pos[i * 3 + 1] = Math.random() * 3; pos[i * 3 + 2] = (Math.random() - 0.5) * 6; }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffb08f, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false }));
    scene.add(dust);

    // ---------- interaction state ----------
    const BASE_SPEED = (33.333 / 60) * Math.PI * 2 * 0.35; // stylised 33⅓ (slowed for readability)
    let speed = reduced ? 0 : 0;      // current angular speed (rad/s), spins up after needle drop
    let target = reduced ? 0 : BASE_SPEED;
    let boost = 0;
    let dragging = false, lastX = 0, lastT = 0, dragVel = 0;
    let tiltX = 0, tiltY = 0, aimX = 0, aimY = 0;
    let t0 = performance.now();

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      aimX = y * 0.12; aimY = x * 0.25;
      if (dragging) {
        const now = performance.now();
        const dx = e.clientX - lastX;
        const dt = Math.max(1, now - lastT) / 1000;
        record.rotation.y -= dx * 0.012;
        dragVel = (-dx * 0.012) / dt;
        lastX = e.clientX; lastT = now;
      }
    };
    const onDown = (e) => {
      dragging = true; lastX = e.clientX; lastT = performance.now(); dragVel = 0;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('grabbing'); setHint(false);
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false; el.classList.remove('grabbing');
      speed = THREE.MathUtils.clamp(dragVel, -12, 12); // fling, then eases back to 33⅓
    };
    const onLeave = () => { aimX = 0; aimY = 0; };
    const onSpin = () => { boost = 9; };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    window.addEventListener('vinylscout:spin', onSpin);

    // ---------- sizing / visibility ----------
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w / h < 1 ? 7.4 : 6.1; // pull back on narrow screens
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 });
    io.observe(el);

    // ---------- loop ----------
    let raf = 0, last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;

      // needle drop: swing in (0–1.2s), lower (1.2–1.7s), then motor spins up
      const swing = THREE.MathUtils.smoothstep(t, 0.2, 1.2);
      armPivot.rotation.y = THREE.MathUtils.lerp(REST_Y, PLAY_Y, reduced ? 1 : swing);
      const lower = reduced ? 1 : THREE.MathUtils.smoothstep(t, 1.2, 1.7);
      armLift.rotation.x = THREE.MathUtils.lerp(-0.12, 0.035, lower);
      // arm slowly tracks inward as the "song" plays
      if (!reduced && t > 1.7) armPivot.rotation.y = PLAY_Y - Math.min(0.35, (t - 1.7) * 0.004);

      if (!dragging && !reduced) {
        const want = (t > 1.5 ? target : 0) + boost;
        speed += (want - speed) * Math.min(1, dt * 1.6);
        boost *= Math.pow(0.4, dt);
        record.rotation.y -= speed * dt;
      }

      tiltX += (aimX - tiltX) * Math.min(1, dt * 4);
      tiltY += (aimY - tiltY) * Math.min(1, dt * 4);
      deck.rotation.x = tiltX;
      deck.rotation.y = -0.35 + tiltY + (reduced ? 0 : Math.sin(t * 0.4) * 0.03);

      if (!reduced) {
        const p = dustGeo.attributes.position;
        for (let i = 0; i < N; i++) {
          let y = p.getY(i) + dt * (0.05 + (i % 7) * 0.012);
          if (y > 3) y = 0;
          p.setY(i, y);
          p.setX(i, p.getX(i) + Math.sin(t * 0.5 + i) * dt * 0.03);
        }
        p.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('vinylscout:spin', onSpin);
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (fallback) return <div className="scene scene-fallback" aria-hidden="true"><div className="css-disc" /></div>;
  return (
    <div className="scene" ref={mount}>
      {hint && <span className="scene-hint" aria-hidden="true">drag the record to scratch ↔</span>}
    </div>
  );
}
