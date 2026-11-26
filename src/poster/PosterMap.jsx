import React, { useMemo } from 'react';
import { project, smoothPath, shortName, INK } from './geo.js';

// Screen-printed "gig poster" map of Calgary's record shops.
// Riso-style inks (overprinted with multiply), rough ink edges, paper grain, halftone dots,
// fisheye street grid, and a spinning record for every shop. Hover/click syncs with the tracklist.

const BOW = [[51.1, -114.26], [51.093, -114.215], [51.087, -114.19], [51.077, -114.155], [51.064, -114.125], [51.056, -114.098], [51.0545, -114.075], [51.0535, -114.055], [51.047, -114.04], [51.035, -114.032], [51.02, -114.025], [51.0, -114.02], [50.97, -114.0]];
const ELBOW = [[50.98, -114.125], [51.0, -114.105], [51.015, -114.09], [51.028, -114.073], [51.037, -114.062], [51.045, -114.048]];
const HOODS = [
  ['KENSINGTON', 51.0625, -114.112, -6], ['BELTLINE', 51.0305, -114.084, 0], ['INGLEWOOD', 51.0255, -114.03, 4],
  ['BOWNESS', 51.103, -114.175, -4], ['BRENTWOOD', 51.098, -114.118, 3], ['MOUNT PLEASANT', 51.0795, -114.052, -2],
  ['MARLBOROUGH', 51.062, -113.982, 5], ['DOWNTOWN', 51.0515, -114.0705, 0], ['KILLARNEY', 51.026, -114.135, -3],
];
// where each label sits relative to its marker, to avoid collisions in the dense core
const LABEL_DIR = {
  's-hotwax': 'up', 's-heritage': 'up', 's-blackbyrd': 'down', 's-melodiya': 'left', 's-sunrise-mb': 'left',
  's-neontaste': 'up', 's-sunrise-dt': 'down', 's-sloth': 'right', 's-recordland': 'right', 's-turnitup': 'right',
  's-cdtrader': 'right', 's-bowness': 'down',
};

function gridLines() {
  const lines = [];
  // avenues (constant latitude) and streets (constant longitude) bend under the fisheye
  for (let lat = 50.97; lat <= 51.13; lat += 0.009) {
    const pts = []; for (let lng = -114.28; lng <= -113.92; lng += 0.006) pts.push(project(lat, lng));
    lines.push(smoothPath(pts));
  }
  for (let lng = -114.28; lng <= -113.92; lng += 0.014) {
    const pts = []; for (let lat = 50.96; lat <= 51.13; lat += 0.004) pts.push(project(lat, lng));
    lines.push(smoothPath(pts));
  }
  return lines;
}
const road = (lat0, lng0, lat1, lng1, n = 40) => smoothPath(Array.from({ length: n + 1 }, (_, i) => project(lat0 + (lat1 - lat0) * (i / n), lng0 + (lng1 - lng0) * (i / n))));

export default function PosterMap({ tracks, hovered, onHover, onSelect, matches }) {
  const geo = useMemo(() => {
    const blocks = [];
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) { // downtown blocks
      const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 0.8) * 62;
      blocks.push({ x: 500 + Math.cos(a) * r * 1.35, y: 548 + Math.sin(a) * r * 0.75, w: 6 + rnd() * 12, h: 6 + rnd() * 16 });
    }
    return {
      grid: gridLines(),
      bow: smoothPath(BOW.map(([a, b]) => project(a, b))),
      elbow: smoothPath(ELBOW.map(([a, b]) => project(a, b))),
      ave17: road(51.0378, -114.16, 51.0378, -114.0),
      ave16: road(51.067, -114.2, 51.067, -113.96),
      centre: road(51.13, -114.0626, 50.97, -114.0626),
      blocks,
      hoods: HOODS.map(([t, la, ln, rot]) => { const [x, y] = project(la, ln); return { t, x, y, rot }; }),
      markers: tracks.map((tr) => { const [x, y] = project(tr.store.lat, tr.store.lng); return { ...tr, x, y }; }),
    };
  }, [tracks]);

  const filtering = matches != null;

  return (
    <figure className="poster" aria-label="Illustrated map of Calgary record shops">
      <svg viewBox="0 0 1000 1080" role="img" aria-labelledby="poster-title" className="poster-svg">
        <title id="poster-title">Calgary record shop tour — illustrated map with {tracks.length} shops</title>
        <defs>
          <filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
          </filter>
          <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer><feFuncA type="table" tableValues="0 0.55" /></feComponentTransfer>
          </filter>
          <pattern id="halftone-pink" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <circle cx="4.5" cy="4.5" r="2.1" fill={INK.pink} />
          </pattern>
          <pattern id="halftone-yellow" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
            <circle cx="5.5" cy="5.5" r="3" fill={INK.yellow} />
          </pattern>
          <pattern id="halftone-blue" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="3.5" cy="3.5" r="1.3" fill={INK.blue} />
          </pattern>
          <clipPath id="map-clip"><rect x="34" y="232" width="932" height="660" rx="6" /></clipPath>
          <radialGradient id="sun" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={INK.orange} stopOpacity=".95" /><stop offset="1" stopColor={INK.orange} stopOpacity=".7" />
          </radialGradient>
        </defs>

        {/* paper */}
        <rect width="1000" height="1080" fill={INK.paper} />

        {/* ===== title block ===== */}
        <g className="poster-title-block">
          <circle cx="840" cy="118" r="92" fill="url(#halftone-yellow)" className="ink" />
          <g filter="url(#ink-rough)">
            <text x="46" y="194" className="p-title ink" fill={INK.pink} transform="translate(6 5)">CALGARY</text>
            <text x="46" y="194" className="p-title ink" fill={INK.blue}>CALGARY</text>
          </g>
          <text x="96" y="46" className="p-kicker">VINYLSCOUT PRESENTS</text>
          <text x="50" y="222" className="p-sub">RECORD SHOP TOUR · {tracks.length} SHOPS · 4 QUADRANTS · ONE CITY</text>
          <g transform="translate(840 118)"><g className="p-badge">
            <circle r="56" fill={INK.black} />
            <circle r="40" fill="none" stroke={INK.paper} strokeOpacity=".18" />
            <circle r="30" fill="none" stroke={INK.paper} strokeOpacity=".18" />
            <circle r="17" fill={INK.orange} />
            <text y="-4" className="p-badge-t">VOL.1</text>
            <text y="10" className="p-badge-t">2026</text>
          </g></g>
        </g>

        {/* ===== map ===== */}
        <g clipPath="url(#map-clip)">
          <rect x="34" y="232" width="932" height="660" fill={INK.paper} />
          {/* halftone blobs */}
          <ellipse cx="500" cy="560" rx="150" ry="95" fill="url(#halftone-pink)" className="ink" opacity=".55" />
          <circle cx="170" cy="330" r="120" fill="url(#halftone-blue)" className="ink" opacity=".35" />
          <circle cx="860" cy="760" r="160" fill="url(#halftone-yellow)" className="ink" opacity=".5" />
          {/* fisheye street grid */}
          <g className="p-grid">{geo.grid.map((d, i) => <path key={i} d={d} />)}</g>
          {/* major roads */}
          <path id="ave17" d={geo.ave17} className="p-road" />
          <path id="ave16" d={geo.ave16} className="p-road" />
          <path d={geo.centre} className="p-road thin" />
          <text className="p-roadname"><textPath href="#ave17" startOffset="10%">17 AVENUE S.W. ·····</textPath></text>
          <text className="p-roadname"><textPath href="#ave16" startOffset="58%">16 AVENUE N. · TRANS-CANADA ·····</textPath></text>
          {/* rivers: blue + misregistered pink overprint */}
          <g filter="url(#ink-rough)" className="ink">
            <path d={geo.bow} className="p-river" stroke={INK.pink} transform="translate(4 3)" opacity=".55" />
            <path d={geo.bow} className="p-river" stroke={INK.blue} />
            <path d={geo.elbow} className="p-river elbow" stroke={INK.blue} />
          </g>
          <text className="p-water" x={geo.markers.length ? 210 : 0} y="392" transform="rotate(-24 210 392)">BOW RIVER</text>
          <text className="p-water" x="455" y="760" transform="rotate(-62 455 760)">ELBOW</text>
          {/* downtown blocks */}
          <g className="p-blocks">{geo.blocks.map((b, i) => <rect key={i} x={b.x - b.w / 2} y={b.y - b.h / 2} width={b.w} height={b.h} />)}</g>
          {/* neighbourhood names */}
          <g className="p-hoods">{geo.hoods.map((h) => <text key={h.t} x={h.x} y={h.y} transform={`rotate(${h.rot} ${h.x} ${h.y})`}>{h.t}</text>)}</g>

          {/* shops */}
          {geo.markers.map((m) => {
            const isHover = hovered === m.store.id;
            const count = filtering ? (matches[m.store.id] || 0) : null;
            const dim = filtering && !count;
            const dir = LABEL_DIR[m.store.id] || 'right';
            const name = shortName(m.store.name);
            const tagW = 30 + name.length * 10.5;
            const tag = { right: [30, -14], left: [-30 - tagW, -14], up: [-tagW / 2, -58], down: [-tagW / 2, 30] }[dir];
            return (
              <a key={m.store.id} href={`#/store/${m.store.id}`} className={`p-marker ${isHover ? 'hover' : ''} ${dim ? 'dim' : ''}`}
                 transform={`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`}
                 onMouseEnter={() => onHover?.(m.store.id)} onMouseLeave={() => onHover?.(null)}
                 onFocus={() => onHover?.(m.store.id)} onBlur={() => onHover?.(null)}
                 onClick={(e) => { if (onSelect) { e.preventDefault(); onSelect(m.store.id); } }}
                 aria-label={`${m.code} ${m.store.name}, ${m.store.neighbourhood}`}>
                {count > 0 && <circle r="30" className="p-pulse" style={{ stroke: m.side.ink }} />}
                <g className="p-scale">
                  <g className="p-disc">
                    <circle r="21" fill={INK.black} />
                    <circle r="16" className="p-groove" /><circle r="12" className="p-groove" />
                    <circle r="8.5" fill={m.side.ink} />
                    <rect x="-1.2" y="-8" width="2.4" height="5" fill={INK.black} opacity=".5" />
                    <circle r="1.8" fill={INK.paper} />
                  </g>
                  <g transform={`translate(${tag[0]} ${tag[1]})`} className="p-tag">
                    <rect width={tagW} height="28" rx="3" className="p-tag-bg" />
                    <rect width="30" height="28" rx="3" fill={m.side.ink} />
                    <text x="15" y="20" className="p-tag-code">{m.code}</text>
                    <text x="38" y="20" className="p-tag-name">{name}</text>
                    {count > 0 && <g transform={`translate(${tagW - 2} -6)`}><circle r="11" fill={INK.orange} /><text y="4" className="p-count">{count}</text></g>}
                  </g>
                </g>
              </a>
            );
          })}
        </g>
        <rect x="34" y="232" width="932" height="660" rx="6" fill="none" stroke={INK.black} strokeWidth="3" />

        {/* compass + scale joke */}
        <g transform="translate(905 290)" className="p-compass">
          <circle r="26" fill={INK.paper} stroke={INK.black} strokeWidth="2" />
          <path d="M0,-20 L7,4 L0,0 L-7,4 Z" fill={INK.black} />
          <text y="18" className="p-compass-t">N</text>
        </g>

        {/* ===== footer band ===== */}
        <g transform="translate(0 912)">
          <rect x="34" width="932" height="132" fill={INK.black} />
          <text x="62" y="62" className="p-foot-big">NW</text>
          <text x="282" y="62"><tspan className="p-foot-big">SW</tspan><tspan className="p-foot-small" dx="10">&amp; BELTLINE</tspan></text>
          <text x="502" y="62"><tspan className="p-foot-big">SE</tspan><tspan className="p-foot-small" dx="10">&amp; INGLEWOOD</tspan></text>
          <text x="722" y="62" className="p-foot-big">NE</text>
          <rect x="62" y="56" width="0" height="0" />
          {[INK.blue, INK.pink, INK.orange, INK.yellow].map((c, i) => <rect key={c} x={62 + i * 220} y="92" width="190" height="8" fill={c} />)}
          <text x="62" y="122" className="p-foot-tiny">MAP NOT TO SCALE · DOWNTOWN ENLARGED FOR YOUR DIGGING PLEASURE · DROP THE NEEDLE ON ANY SHOP</text>
        </g>

        {/* paper grain over everything */}
        <rect width="1000" height="1080" filter="url(#paper-grain)" className="p-grain" />
      </svg>
    </figure>
  );
}
