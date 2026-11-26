// Shared geography for the gig-poster map + sleeve tracklist.
// Fisheye projection centred on downtown Calgary: spreads the dense Beltline/downtown cluster
// so every shop gets room, the way hand-drawn tourist/gig-poster maps exaggerate the core.

// Riso-style ink palette (fixed: the poster is a printed object in both light and dark mode)
export const INK = {paper: "#f3e9d6", black: "#211d19", blue: "#2b56d1", pink: "#ff4d9b", orange: "#ff6a2b", yellow: "#ffcd38"};

export const CENTER = { lat: 51.046, lng: -114.07 };
const COS = Math.cos((CENTER.lat * Math.PI) / 180);
export const MAP = { cx: 500, cy: 560, radius: 440, reachKm: 9.5, power: 0.5 };

export function km(lat, lng) {
  return { x: (lng - CENTER.lng) * COS * 111.32, y: (lat - CENTER.lat) * 110.57 };
}
export function project(lat, lng) {
  const { x, y } = km(lat, lng);
  const r = Math.hypot(x, y);
  if (r < 1e-6) return [MAP.cx, MAP.cy];
  const rp = Math.pow(r / MAP.reachKm, MAP.power) * MAP.radius;
  return [MAP.cx + (x / r) * rp, MAP.cy - (y / r) * rp];
}
export function kmFromDowntown(s) {
  const { x, y } = km(s.lat, s.lng);
  return Math.hypot(x, y);
}

// Calgary is split into quadrants (NW/NE/SW/SE); the poster and tracklist group shops by them.
export const SIDES = [
  { key: 'NW', code: 'A', label: 'Northwest', ink: INK.blue },
  { key: 'SW', code: 'B', label: 'Southwest & Beltline', ink: INK.pink },
  { key: 'SE', code: 'C', label: 'Southeast & Inglewood', ink: INK.orange },
  { key: 'NE', code: 'D', label: 'Northeast', ink: INK.yellow },
];
export function quadrant(s) {
  const m = /\b(NW|NE|SW|SE)\b/.exec(s.address || '');
  if (m) return m[1];
  // no suffix: Centre St (lng -114.0626) splits W/E; the Bow (~lat 51.05) splits N/S
  return `${s.lat > 51.05 ? 'N' : 'S'}${s.lng < -114.0626 ? 'W' : 'E'}`;
}

/** Stores with poster numbers 1–12, grouped by quadrant, by distance from downtown within each. */
export function trackify(stores) {
  const out = [];
  let n = 0;
  SIDES.forEach((side) => {
    stores.filter((s) => s.lat && quadrant(s) === side.key)
      .sort((a, b) => kmFromDowntown(a) - kmFromDowntown(b))
      .forEach((s, i) => out.push({ store: s, side, code: String(++n), km: kmFromDowntown(s) }));
  });
  return out;
}

export const shortName = (name) => name
  .replace(/\s*\((Downtown)\)/i, ' DT').replace(/\s*\((Marlborough)\)/i, ' MB')
  .replace(/ Records & Hi-Fi| Records & Books| Posters & Music| Records| Myoozik/gi, '')
  .toUpperCase();

// Smooth SVG path through points (Catmull–Rom → cubic Bézier)
export function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
