import type { TableSkin } from './skins';

type Ctx = CanvasRenderingContext2D;
type Fn = (g: Ctx, s: TableSkin, W: number, H: number) => void;

// Seeded RNG: patterns are identical on every redraw (no flicker)
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const TAU = Math.PI * 2;
const stroke = (g: Ctx, c: string | CanvasGradient, w: number, a: number) => {
  g.strokeStyle = c; g.lineWidth = w; g.globalAlpha = a; g.stroke();
};
const radial = (g: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][]) => {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
};
const sparkle = (g: Ctx, x: number, y: number, r: number) => {
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r); g.fill();
};

// ───────────── VOLCANIC EMBER: cracked basalt, glowing magma veins, crater ─────────────
const volcanic: Fn = (g, s, W, H) => {
  const r = rng(7), cx = W / 2, cy = H / 2, m = Math.min(W, H);
  g.globalAlpha = 1;
  g.fillStyle = radial(g, cx, cy, 0, m * 0.8, [[0, 'rgba(234,88,12,0.28)'], [0.5, 'rgba(154,52,18,0.1)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(0, 0, W, H);
  // dark basalt blotches
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = r() * H, rad = m * (0.06 + r() * 0.12);
    g.fillStyle = radial(g, x, y, 0, rad, [[0, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]);
    g.globalAlpha = 1; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const cracks: number[][][] = [];
  const grow = (x: number, y: number, a: number, len: number, d: number) => {
    const pts = [[x, y]]; let px = x, py = y, pa = a;
    for (let i = 0, n = Math.ceil(len / 14); i < n; i++) {
      pa += (r() - 0.5) * 0.9; px += Math.cos(pa) * 14; py += Math.sin(pa) * 14;
      pts.push([px, py]);
      if (d < 2 && r() < 0.18) grow(px, py, pa + (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.6), len * 0.55, d + 1);
    }
    cracks.push(pts);
  };
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU + r() * 0.4;
    grow(cx + Math.cos(a) * m * 0.14, cy + Math.sin(a) * m * 0.14, a, m * 0.62, 0);
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [w, c, a] of [[8, '#ea580c', 0.14], [3.5, '#f97316', 0.4], [1.2, '#fde68a', 0.95]] as [number, string, number][]) {
    g.beginPath();
    for (const p of cracks) { g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); }
    stroke(g, c, w, a);
  }
  // crater
  g.globalAlpha = 1;
  g.fillStyle = radial(g, cx, cy, 0, m * 0.14, [[0, '#fff1b8'], [0.35, '#fb923c'], [0.75, '#b91c1c'], [1, '#2a0f0a']]);
  g.beginPath(); g.arc(cx, cy, m * 0.14, 0, TAU); g.fill();
  g.beginPath(); g.arc(cx, cy, m * 0.15, 0, TAU); stroke(g, '#1c0d09', 7, 0.9);
  g.beginPath(); g.arc(cx, cy, m * 0.17, 0, TAU); stroke(g, s.bumperRing, 1.5, 0.5);
  // embers
  g.fillStyle = '#fdba74';
  for (let i = 0; i < 70; i++) { g.globalAlpha = 0.25 + r() * 0.6; g.beginPath(); g.arc(r() * W, r() * H, 0.6 + r() * 1.6, 0, TAU); g.fill(); }
};

// ───────────── PRISM HEX: faceted crystal, refracted colour, light streak ─────────────
const prism: Fn = (g, s, W, H) => {
  const r = rng(11), cols = 6, cw = W / cols, rows = Math.ceil(H / cw);
  const P: number[][][] = [];
  for (let j = 0; j <= rows; j++) {
    P[j] = [];
    for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || j === 0 || i === cols || j === rows;
      P[j][i] = [i * cw + (edge ? 0 : (r() - 0.5) * cw * 0.7), j * cw + (edge ? 0 : (r() - 0.5) * cw * 0.7)];
    }
  }
  const pal = [s.redZone, s.blueZone, s.lines, s.bumperRing];
  const tri = (a: number[], b: number[], c: number[]) => {
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath();
    g.fillStyle = pal[Math.floor(r() * pal.length)]; g.globalAlpha = 0.03 + r() * 0.12; g.fill();
    stroke(g, s.lines, 1, 0.3);
  };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i], d = P[j + 1][i + 1];
    if ((i + j) % 2) { tri(a, b, c); tri(b, d, c); } else { tri(a, b, d); tri(a, d, c); }
  }
  const lg = g.createLinearGradient(0, 0, W, H);
  lg.addColorStop(0.3, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.14)'); lg.addColorStop(0.7, 'rgba(255,255,255,0)');
  g.globalAlpha = 1; g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.fillStyle = s.bumperRing;
  for (let j = 1; j < rows; j++) for (let i = 1; i < cols; i++) if (r() < 0.35) { g.globalAlpha = 0.8; sparkle(g, P[j][i][0], P[j][i][1], 3 + r() * 3); }
};

// ───────────── CAPSULE PULSE: flowing waveforms + heartbeat + sonar rings ─────────────
const pulse: Fn = (g, s, W, H) => {
  g.translate(W / 2, H / 2);
  if (H > W) g.rotate(Math.PI / 2);
  const L = Math.max(W, H), T = Math.min(W, H);
  for (let i = 1; i <= 5; i++) {
    g.beginPath(); g.ellipse(0, 0, T * 0.1 * i, T * 0.1 * i, 0, 0, TAU);
    stroke(g, s.lines, 1.2, 0.35 - i * 0.05);
  }
  for (let k = -3; k <= 3; k++) {
    g.beginPath();
    for (let x = -L / 2; x <= L / 2; x += 3) {
      const u = (x + L / 2) / L, env = Math.sin(Math.PI * u);
      const y = Math.sin(u * TAU * 3 + k * 0.55) * T * 0.11 * env * (1 - Math.abs(k) * 0.12) + k * T * 0.045;
      x === -L / 2 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    stroke(g, s.lines, 2.4 - Math.abs(k) * 0.3, 0.7 - Math.abs(k) * 0.12);
  }
  // heartbeat spike
  g.beginPath(); g.moveTo(-L * 0.45, 0); g.lineTo(-L * 0.12, 0); g.lineTo(-L * 0.08, -T * 0.16); g.lineTo(-L * 0.03, T * 0.2);
  g.lineTo(L * 0.01, -T * 0.08); g.lineTo(L * 0.04, 0); g.lineTo(L * 0.45, 0);
  stroke(g, s.bumperRing, 2.2, 0.9);
  g.fillStyle = s.bumperRing; g.globalAlpha = 0.9;
  g.beginPath(); g.arc(-L * 0.03, T * 0.2, 3.5, 0, TAU); g.fill();
};

// ───────────── CYBER CIRCUIT: PCB — parallel trace buses, 45° jogs, IC, vias ─────────────
const pcb: Fn = (g, s, W, H) => {
  const r = rng(23), pitch = Math.max(5, W * 0.016);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = s.dots; g.globalAlpha = 0.5;
  for (let y = pitch * 2; y < H; y += pitch * 4) for (let x = pitch * 2; x < W; x += pitch * 4) g.fillRect(x, y, 1.2, 1.2);
  const vias: number[][] = [];
  const bus = (y0: number, x1f: number, x2f: number, dir: number, lanes: number, hot: boolean) => {
    const d = pitch * 2 * dir;
    g.beginPath();
    for (let k = 0; k < lanes; k++) {
      const y = y0 + k * pitch * 1.4, x1 = W * x1f + k * pitch * 0.6, x2 = W * x2f;
      g.moveTo(0, y); g.lineTo(x1, y); g.lineTo(x1 + d, y + d); g.lineTo(x2 - d, y + d); g.lineTo(x2, y); g.lineTo(W, y);
      vias.push([x1 + d, y + d], [x2 - d, y + d]);
    }
    stroke(g, hot ? s.lines : s.dots, hot ? 1.8 : 2.2, hot ? 0.75 : 0.9);
  };
  bus(H * 0.12, 0.22, 0.78, 1, 5, false);
  bus(H * 0.26, 0.3, 0.7, -1, 3, true);
  bus(H * 0.68, 0.3, 0.7, 1, 3, true);
  bus(H * 0.8, 0.22, 0.78, -1, 5, false);
  // IC package
  const cw = W * 0.24, ch = H * 0.11, cx = W / 2 - cw / 2, cy = H / 2 - ch / 2;
  g.beginPath();
  for (let i = 0; i < 9; i++) {
    const px = cx + (cw / 8) * i;
    g.moveTo(px, cy - 7); g.lineTo(px, cy); g.moveTo(px, cy + ch); g.lineTo(px, cy + ch + 7);
  }
  stroke(g, s.lines, 1.5, 0.8);
  g.fillStyle = s.goalSlot; g.globalAlpha = 0.9; g.fillRect(cx, cy, cw, ch);
  g.beginPath(); g.rect(cx, cy, cw, ch); stroke(g, s.lines, 1.5, 0.9);
  g.beginPath(); g.arc(cx + 8, cy + 8, 3, 0, TAU); stroke(g, s.bumperRing, 1.2, 0.9);
  g.beginPath(); g.rect(cx + cw * 0.3, cy + ch * 0.3, cw * 0.4, ch * 0.4); stroke(g, s.bumperRing, 1, 0.5);
  // vias
  for (const [x, y] of vias) {
    g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fillStyle = s.surface; g.globalAlpha = 1; g.fill(); stroke(g, s.bumperRing, 1.4, 0.8);
    g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fillStyle = s.lines; g.fill();
  }
  // corner capacitors
  g.fillStyle = s.dots; g.globalAlpha = 0.7;
  for (const [x, y] of [[0.08, 0.05], [0.92, 0.05], [0.08, 0.95], [0.92, 0.95]]) g.fillRect(W * x - 6, H * y - 3, 12, 6);
  void r;
};

// ───────────── CYBER REACTOR: containment rings, rotor segments, hazard core ─────────────
const reactor: Fn = (g, s, W, H) => {
  const cx = W / 2, cy = H / 2, m = Math.min(W, H);
  g.fillStyle = radial(g, cx, cy, 0, m * 0.5, [[0, 'rgba(245,158,11,0.28)'], [0.5, 'rgba(6,182,212,0.08)'], [1, 'rgba(0,0,0,0)']]);
  g.globalAlpha = 1; g.fillRect(0, 0, W, H);
  const seg = (rad: number, n: number, gap: number, w: number, col: string, a: number, off: number) => {
    for (let i = 0; i < n; i++) {
      const a0 = off + (i / n) * TAU + gap, a1 = off + ((i + 1) / n) * TAU - gap;
      g.beginPath(); g.arc(cx, cy, rad, a0, a1); stroke(g, col, w, a);
    }
  };
  g.lineCap = 'butt';
  seg(m * 0.46, 3, 0.25, 6, s.dots, 0.9, 0.3);
  seg(m * 0.40, 12, 0.06, 3, s.lines, 0.75, 0);
  seg(m * 0.33, 6, 0.18, 8, s.bumperRing, 0.55, 0.5);
  seg(m * 0.25, 24, 0.03, 2, s.lines, 0.8, 0);
  // hex containment
  g.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; const x = cx + Math.cos(a) * m * 0.19, y = cy + Math.sin(a) * m * 0.19; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); stroke(g, s.bumperRing, 2, 0.85);
  // coil spokes
  g.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.moveTo(cx + Math.cos(a) * m * 0.19, cy + Math.sin(a) * m * 0.19); g.lineTo(cx + Math.cos(a) * m * 0.46, cy + Math.sin(a) * m * 0.46); }
  stroke(g, s.lines, 1.5, 0.5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, x = cx + Math.cos(a) * m * 0.43, y = cy + Math.sin(a) * m * 0.43;
    g.fillStyle = s.bumperRing; g.globalAlpha = 0.9; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
  }
  // core + hazard ring
  g.save(); g.beginPath(); g.arc(cx, cy, m * 0.13, 0, TAU); g.clip();
  g.fillStyle = s.goalSlot; g.globalAlpha = 1; g.fillRect(cx - m, cy - m, m * 2, m * 2);
  g.strokeStyle = s.bumperRing; g.lineWidth = 6; g.globalAlpha = 0.6; g.beginPath();
  for (let d = -m; d < m; d += 16) { g.moveTo(cx + d, cy - m * 0.15); g.lineTo(cx + d + m * 0.15, cy + m * 0.15); }
  g.stroke(); g.restore();
  g.fillStyle = radial(g, cx, cy, 0, m * 0.07, [[0, '#fff'], [0.5, s.bumperRing], [1, 'rgba(245,158,11,0)']]);
  g.globalAlpha = 1; g.beginPath(); g.arc(cx, cy, m * 0.07, 0, TAU); g.fill();
  g.beginPath(); g.arc(cx, cy, m * 0.13, 0, TAU); stroke(g, s.bumperRing, 2.5, 0.95);
};

// ───────────── GLACIER MINT: layered ice shards, fracture lines, frost crystals ─────────────
const glacier: Fn = (g, s, W, H) => {
  const r = rng(31), m = Math.min(W, H);
  g.lineJoin = 'round';
  for (let i = 0; i < 20; i++) {
    const x = r() * W, y = r() * H, n = 3 + Math.floor(r() * 3), R = m * (0.1 + r() * 0.16), rot = r() * TAU;
    g.beginPath();
    for (let k = 0; k < n; k++) { const a = rot + (k / n) * TAU + (r() - 0.5) * 0.7, rr = R * (0.6 + r() * 0.6); k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath();
    g.fillStyle = i % 2 ? '#ffffff' : s.dots; g.globalAlpha = i % 2 ? 0.16 : 0.3; g.fill();
    stroke(g, '#ffffff', 1.2, 0.5);
  }
  // fracture lines
  g.beginPath();
  for (let i = 0; i < 7; i++) {
    let x = r() * W, y = r() * H, a = r() * TAU; g.moveTo(x, y);
    for (let k = 0; k < 9; k++) { a += (r() - 0.5) * 0.8; x += Math.cos(a) * 20; y += Math.sin(a) * 20; g.lineTo(x, y); }
  }
  stroke(g, s.rail, 1, 0.35);
  // frost crystals
  const flake = (x: number, y: number, L: number) => {
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      g.moveTo(x, y); g.lineTo(x + ca * L, y + sa * L);
      for (const t of [0.5, 0.75]) {
        const bx = x + ca * L * t, by = y + sa * L * t;
        for (const sg of [-1, 1]) { const b = a + sg * 0.9; g.moveTo(bx, by); g.lineTo(bx + Math.cos(b) * L * 0.28, by + Math.sin(b) * L * 0.28); }
      }
    }
    stroke(g, '#ffffff', 1.4, 0.85);
  };
  flake(W * 0.5, H * 0.5, m * 0.14); flake(W * 0.2, H * 0.2, m * 0.07); flake(W * 0.8, H * 0.8, m * 0.07);
  flake(W * 0.8, H * 0.18, m * 0.05); flake(W * 0.2, H * 0.82, m * 0.05);
};

// ───────────── ASTRAL SANCTUM: mandala rose, nebula, constellations ─────────────
const astral: Fn = (g, s, W, H) => {
  const r = rng(41), cx = W / 2, cy = H / 2, m = Math.min(W, H);
  g.globalAlpha = 1;
  g.fillStyle = radial(g, W * 0.2, H * 0.2, 0, m * 0.6, [[0, 'rgba(244,114,182,0.16)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, W, H);
  g.fillStyle = radial(g, W * 0.8, H * 0.8, 0, m * 0.6, [[0, 'rgba(251,146,60,0.14)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, W, H);
  const stars: number[][] = [];
  g.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H; stars.push([x, y]); g.globalAlpha = 0.2 + r() * 0.6; g.beginPath(); g.arc(x, y, 0.5 + r() * 1.1, 0, TAU); g.fill(); }
  g.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = stars[i]; let best = -1, bd = 1e9;
    for (let j = 0; j < stars.length; j++) if (j !== i) { const d = (a[0] - stars[j][0]) ** 2 + (a[1] - stars[j][1]) ** 2; if (d < bd) { bd = d; best = j; } }
    g.moveTo(a[0], a[1]); g.lineTo(stars[best][0], stars[best][1]);
  }
  stroke(g, s.lines, 0.8, 0.4);
  g.fillStyle = s.bumperRing;
  for (let i = 0; i < 14; i++) { g.globalAlpha = 0.9; sparkle(g, stars[i][0], stars[i][1], 4); }
  // mandala
  const petals = (n: number, R: number, ry: number, col: string, a: number) => {
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU; g.beginPath();
      g.ellipse(cx + Math.cos(t) * R / 2, cy + Math.sin(t) * R / 2, R / 2, ry, t, 0, TAU); stroke(g, col, 1.4, a);
    }
  };
  petals(16, m * 0.4, m * 0.05, s.lines, 0.5);
  petals(12, m * 0.3, m * 0.07, s.bumperRing, 0.6);
  petals(8, m * 0.18, m * 0.05, s.lines, 0.8);
  g.beginPath(); g.arc(cx, cy, m * 0.44, 0, TAU); stroke(g, s.lines, 1.5, 0.6);
  g.beginPath();
  for (let i = 0; i < 72; i++) { const a = (i / 72) * TAU, l = i % 6 === 0 ? 10 : 5; g.moveTo(cx + Math.cos(a) * m * 0.44, cy + Math.sin(a) * m * 0.44); g.lineTo(cx + Math.cos(a) * (m * 0.44 + l), cy + Math.sin(a) * (m * 0.44 + l)); }
  stroke(g, s.lines, 1, 0.5);
  g.fillStyle = radial(g, cx, cy, 0, m * 0.06, [[0, '#fff'], [0.5, s.bumperRing], [1, 'rgba(0,0,0,0)']]);
  g.globalAlpha = 1; g.beginPath(); g.arc(cx, cy, m * 0.06, 0, TAU); g.fill();
};

// ───────────── MYTHIC CELESTIAL: orrery — tilted orbits, planets, eclipse sun ─────────────
const celestial: Fn = (g, s, W, H) => {
  const r = rng(53), cx = W / 2, cy = H / 2, m = Math.min(W, H);
  g.fillStyle = '#fff';
  for (let i = 0; i < 70; i++) { g.globalAlpha = 0.15 + r() * 0.5; g.beginPath(); g.arc(r() * W, r() * H, 0.4 + r() * 1.1, 0, TAU); g.fill(); }
  const tilt = -0.35;
  const orbits: [number, number, number][] = [[0.22, 0.09, 0.8], [0.34, 0.14, 2.6], [0.46, 0.19, 4.4], [0.58, 0.24, 1.3]];
  orbits.forEach(([rx, ry, ph], i) => {
    g.beginPath(); g.ellipse(cx, cy, m * rx, m * ry, tilt, 0, TAU); stroke(g, s.lines, 1.3, 0.55);
    const px = Math.cos(ph) * m * rx, py = Math.sin(ph) * m * ry;
    const x = cx + px * Math.cos(tilt) - py * Math.sin(tilt), y = cy + px * Math.sin(tilt) + py * Math.cos(tilt);
    g.fillStyle = i % 2 ? '#c084fc' : s.bumperRing; g.globalAlpha = 1; g.beginPath(); g.arc(x, y, 3 + i * 1.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(x, y, 6 + i * 1.6, 0, TAU); stroke(g, s.bumperRing, 1, 0.5);
  });
  // zodiac ring
  g.beginPath(); g.arc(cx, cy, m * 0.62, 0, TAU); stroke(g, s.lines, 1, 0.4);
  g.beginPath();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.moveTo(cx + Math.cos(a) * m * 0.62, cy + Math.sin(a) * m * 0.62); g.lineTo(cx + Math.cos(a) * m * 0.66, cy + Math.sin(a) * m * 0.66); }
  stroke(g, s.lines, 2, 0.6);
  // eclipse sun: corona rays + dark disc
  g.beginPath();
  for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU, l = i % 2 ? 0.13 : 0.18; g.moveTo(cx + Math.cos(a) * m * 0.09, cy + Math.sin(a) * m * 0.09); g.lineTo(cx + Math.cos(a) * m * l, cy + Math.sin(a) * m * l); }
  stroke(g, s.bumperRing, 1.5, 0.7);
  g.fillStyle = radial(g, cx, cy, m * 0.07, m * 0.14, [[0, 'rgba(250,204,21,0.9)'], [1, 'rgba(250,204,21,0)']]);
  g.globalAlpha = 1; g.beginPath(); g.arc(cx, cy, m * 0.14, 0, TAU); g.fill();
  g.fillStyle = s.goalSlot; g.beginPath(); g.arc(cx + m * 0.012, cy, m * 0.085, 0, TAU); g.fill();
};

// ───────────── OBSIDIAN MATRIX: shattered volcanic glass, impact point, green sheen ─────────────
const obsidian: Fn = (g, s, W, H) => {
  const r = rng(61), cx = W * 0.5, cy = H * 0.5, m = Math.min(W, H), n = 16;
  const ang = Array.from({ length: n }, (_, i) => (i / n) * TAU + (r() - 0.5) * 0.3);
  const rings = 8, pts: number[][][] = [];
  for (let j = 0; j < rings; j++) {
    pts[j] = ang.map((a) => { const rad = m * 0.05 * Math.pow(1.5, j) * (0.85 + r() * 0.3); return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; });
  }
  for (let j = 0; j < rings - 1; j++) for (let i = 0; i < n; i++) {
    if (r() < 0.3) {
      const i2 = (i + 1) % n; g.beginPath();
      g.moveTo(pts[j][i][0], pts[j][i][1]); g.lineTo(pts[j][i2][0], pts[j][i2][1]);
      g.lineTo(pts[j + 1][i2][0], pts[j + 1][i2][1]); g.lineTo(pts[j + 1][i][0], pts[j + 1][i][1]); g.closePath();
      g.fillStyle = r() < 0.5 ? s.lines : '#000'; g.globalAlpha = 0.06 + r() * 0.08; g.fill();
    }
  }
  g.beginPath();
  for (let j = 0; j < rings; j++) { g.moveTo(pts[j][0][0], pts[j][0][1]); for (let i = 1; i <= n; i++) g.lineTo(pts[j][i % n][0], pts[j][i % n][1]); }
  stroke(g, s.lines, 1, 0.5);
  g.beginPath();
  for (const a of ang) { g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (W + H), cy + Math.sin(a) * (W + H)); }
  stroke(g, s.lines, 0.8, 0.3);
  for (let k = 0; k < 3; k++) {
    const lg = g.createLinearGradient(0, 0, W, H), o = 0.2 + k * 0.28;
    lg.addColorStop(Math.max(0, o - 0.04), 'rgba(110,255,170,0)'); lg.addColorStop(o, 'rgba(110,255,170,0.12)'); lg.addColorStop(Math.min(1, o + 0.04), 'rgba(110,255,170,0)');
    g.globalAlpha = 1; g.fillStyle = lg; g.fillRect(0, 0, W, H);
  }
  g.fillStyle = radial(g, cx, cy, 0, m * 0.07, [[0, '#d1fae5'], [0.4, s.bumperRing], [1, 'rgba(0,0,0,0)']]);
  g.globalAlpha = 1; g.beginPath(); g.arc(cx, cy, m * 0.07, 0, TAU); g.fill();
};

// ───────────── COBALT STADIUM: running lanes, floodlight cones, crowd ring ─────────────
const cobalt: Fn = (g, s, W, H) => {
  const m = Math.min(W, H);
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    g.fillStyle = radial(g, x, y, 0, Math.max(W, H) * 0.75, [[0, 'rgba(186,230,253,0.22)'], [1, 'rgba(56,189,248,0)']]);
    g.globalAlpha = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(W / 2 + (x ? 1 : -1) * W * 0.12, H / 2 - (y ? -1 : 1) * H * 0.05);
    g.lineTo(x ? 0 : W, y ? 0 : H); g.closePath(); g.globalAlpha = 0.5; g.fill();
  }
  const rr = (inset: number) => { g.beginPath(); g.roundRect(inset, inset, W - inset * 2, H - inset * 2, Math.max(8, (m - inset * 2) / 2)); };
  // crowd band
  g.fillStyle = s.bumperRing;
  const r = rng(71);
  for (let i = 0; i < 260; i++) {
    const t = r() * TAU, inset = m * 0.025 + r() * m * 0.05, ex = (W / 2 - inset), ey = (H / 2 - inset);
    g.globalAlpha = 0.15 + r() * 0.35; g.beginPath(); g.arc(W / 2 + Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), 0.4) * ex, H / 2 + Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), 0.4) * ey, 1.1, 0, TAU); g.fill();
  }
  for (let i = 0; i < 5; i++) { rr(m * (0.1 + i * 0.035)); stroke(g, s.lines, i === 0 ? 2.5 : 1, i === 0 ? 0.8 : 0.35); }
  g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); stroke(g, s.lines, 1.5, 0.45);
  g.beginPath(); g.arc(W / 2, H / 2, m * 0.16, 0, TAU); stroke(g, s.bumperRing, 2, 0.7);
  g.beginPath(); g.arc(W / 2, H / 2, m * 0.04, 0, TAU); g.fillStyle = s.bumperRing; g.globalAlpha = 0.8; g.fill();
};

// ───────────── CRIMSON ARENA: colosseum arches, crossed blades, claw marks, sand glow ─────────────
const crimson: Fn = (g, s, W, H) => {
  const cx = W / 2, cy = H / 2, m = Math.min(W, H);
  g.globalAlpha = 1;
  g.fillStyle = radial(g, cx, cy, 0, m * 0.7, [[0, 'rgba(240,69,45,0.22)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, W, H);
  // arch rows top & bottom
  const n = 7, aw = W / n;
  for (const [y0, dir] of [[0, 1], [H, -1]] as [number, number][]) for (let row = 0; row < 2; row++) {
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const x = i * aw + aw * 0.12, w = aw * 0.76, base = y0 + dir * (m * 0.02 + row * m * 0.09 + m * 0.09);
      g.moveTo(x, base); g.lineTo(x, base - dir * m * 0.035); g.arc(x + w / 2, base - dir * m * 0.035, w / 2, Math.PI, 0, dir < 0 ? true : false); g.lineTo(x + w, base);
    }
    stroke(g, s.lines, 1.4, 0.5 - row * 0.15);
  }
  // crossed blades
  const blade = (rot: number) => {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.beginPath(); g.moveTo(0, -m * 0.3); g.lineTo(m * 0.028, -m * 0.04); g.lineTo(0, m * 0.2); g.lineTo(-m * 0.028, -m * 0.04); g.closePath();
    g.fillStyle = s.lines; g.globalAlpha = 0.18; g.fill(); stroke(g, s.bumperRing, 1.6, 0.8);
    g.beginPath(); g.moveTo(-m * 0.07, m * 0.2); g.lineTo(m * 0.07, m * 0.2); g.moveTo(0, m * 0.2); g.lineTo(0, m * 0.29); stroke(g, s.bumperRing, 3, 0.8);
    g.restore();
  };
  blade(Math.PI / 4.5); blade(-Math.PI / 4.5);
  g.beginPath(); g.arc(cx, cy, m * 0.36, 0, TAU); stroke(g, s.lines, 2, 0.55);
  g.beginPath(); g.arc(cx, cy, m * 0.39, 0, TAU); g.setLineDash([4, 8]); stroke(g, s.lines, 1.2, 0.4); g.setLineDash([]);
  // claw marks
  for (const [x, y, f] of [[0.18, 0.3, 1], [0.82, 0.7, -1]] as number[][]) {
    g.beginPath();
    for (let k = 0; k < 3; k++) { g.moveTo(W * x + k * 9 * f, H * y); g.quadraticCurveTo(W * x + (k * 9 + 6) * f, H * y + 24, W * x + (k * 9 + 2) * f, H * y + 52); }
    stroke(g, s.bumperRing, 2.2, 0.55);
  }
};

// ───────────── ARCTIC SLATE: staggered slate tiles, bevels, frost cracks ─────────────
const slate: Fn = (g, s, W, H) => {
  const r = rng(83), tw = W / 4, th = tw * 0.55;
  for (let row = 0, y = 0; y < H; y += th, row++) {
    for (let x = row % 2 ? -tw / 2 : 0; x < W; x += tw) {
      const v = r();
      g.fillStyle = v < 0.5 ? '#0f172a' : '#ffffff'; g.globalAlpha = 0.03 + r() * 0.07; g.fillRect(x + 2, y + 2, tw - 4, th - 4);
      g.beginPath(); g.moveTo(x + 2, y + th - 2); g.lineTo(x + 2, y + 2); g.lineTo(x + tw - 2, y + 2); stroke(g, '#ffffff', 1.5, 0.55);
      g.beginPath(); g.moveTo(x + tw - 2, y + 2); g.lineTo(x + tw - 2, y + th - 2); g.lineTo(x + 2, y + th - 2); stroke(g, s.rail, 1.5, 0.28);
      if (r() < 0.25) { // chisel cracks
        g.beginPath(); const sx = x + r() * tw, sy = y + r() * th; g.moveTo(sx, sy); g.lineTo(sx + 10 + r() * 14, sy + (r() - 0.5) * 14); g.lineTo(sx + 24 + r() * 14, sy + (r() - 0.5) * 20);
        stroke(g, s.rail, 1, 0.3);
      }
    }
  }
  // aurora sweep
  const lg = g.createLinearGradient(0, 0, W, H);
  lg.addColorStop(0, 'rgba(14,165,233,0)'); lg.addColorStop(0.5, 'rgba(14,165,233,0.12)'); lg.addColorStop(1, 'rgba(225,29,72,0.06)');
  g.globalAlpha = 1; g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  for (let i = 0; i < 40; i++) { g.globalAlpha = 0.4 + r() * 0.5; g.beginPath(); g.arc(r() * W, r() * H, 0.8 + r() * 0.8, 0, TAU); g.fill(); }
};

// ───────────── EMERALD CLUB: gold-stitched argyle, buttons, club crest ─────────────
const emerald: Fn = (g, s, W, H) => {
  const cx = W / 2, cy = H / 2, m = Math.min(W, H), dx = W / 5, dy = dx * 1.5;
  for (let j = -1, y = 0; y < H + dy; y += dy, j++) for (let i = -1; i < 6; i++) {
    const x = i * dx + (j % 2 ? dx / 2 : 0);
    g.beginPath(); g.moveTo(x, y - dy / 2); g.lineTo(x + dx / 2, y); g.lineTo(x, y + dy / 2); g.lineTo(x - dx / 2, y); g.closePath();
    if ((i + j) % 2 === 0) { g.fillStyle = s.dots; g.globalAlpha = 0.55; g.fill(); }
    stroke(g, s.lines, 1, 0.35);
    g.beginPath(); g.moveTo(x, y - dy / 3); g.lineTo(x + dx / 3.5, y); g.lineTo(x, y + dy / 3); g.lineTo(x - dx / 3.5, y); g.closePath();
    g.setLineDash([3, 4]); stroke(g, s.bumperRing, 0.8, 0.4); g.setLineDash([]);
    g.fillStyle = s.bumperRing; g.globalAlpha = 0.7; g.beginPath(); g.arc(x, y - dy / 2, 1.8, 0, TAU); g.fill();
  }
  // crest medallion
  g.fillStyle = s.surface; g.globalAlpha = 0.92; g.beginPath(); g.arc(cx, cy, m * 0.22, 0, TAU); g.fill();
  for (const [rad, w] of [[0.22, 2.5], [0.2, 1], [0.15, 1.5]]) { g.beginPath(); g.arc(cx, cy, m * rad, 0, TAU); stroke(g, s.bumperRing, w, 0.85); }
  // laurel
  for (const sg of [-1, 1]) for (let i = 0; i < 9; i++) {
    const t = Math.PI * (0.62 + i * 0.1), x = cx + sg * Math.cos(t) * m * 0.175, y = cy + Math.sin(t) * m * 0.175 * 1.0 - m * 0.02;
    g.save(); g.translate(x, y); g.rotate(sg * (t - Math.PI / 2) * 0.4 + (sg > 0 ? 0.6 : -0.6)); g.beginPath(); g.ellipse(0, 0, 7, 2.8, 0, 0, TAU);
    g.fillStyle = s.bumperRing; g.globalAlpha = 0.8; g.fill(); g.restore();
  }
  // diamond suit
  g.beginPath(); g.moveTo(cx, cy - m * 0.09); g.lineTo(cx + m * 0.06, cy); g.lineTo(cx, cy + m * 0.09); g.lineTo(cx - m * 0.06, cy); g.closePath();
  g.fillStyle = s.bumperRing; g.globalAlpha = 0.9; g.fill();
};

// ───────────── APEX LEGEND: the crown jewel — gold foil, guilloche, wings, jewel ─────────────
const apex: Fn = (g, s, W, H) => {
  const r = rng(97), cx = W / 2, cy = H / 2, m = Math.min(W, H);
  const gold = g.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, '#7c5a10'); gold.addColorStop(0.3, '#fde047'); gold.addColorStop(0.5, '#fff7c2');
  gold.addColorStop(0.7, '#facc15'); gold.addColorStop(1, '#6b4a0c');
  g.globalAlpha = 1;
  g.fillStyle = radial(g, cx, cy, 0, Math.max(W, H) * 0.7, [[0, 'rgba(250,204,21,0.16)'], [0.5, 'rgba(180,83,9,0.07)'], [1, 'rgba(0,0,0,0.35)']]);
  g.fillRect(0, 0, W, H);
  // sunburst
  const rays = 72, R = Math.max(W, H);
  for (let i = 0; i < rays; i += 2) {
    const a0 = (i / rays) * TAU, a1 = ((i + 1) / rays) * TAU;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); g.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); g.closePath();
    g.fillStyle = gold; g.globalAlpha = 0.045; g.fill();
  }
  // guilloche rosettes
  for (let L = 0; L < 3; L++) {
    g.beginPath();
    const base = m * (0.3 - L * 0.045), amp = m * 0.035, nn = 14 + L * 4;
    for (let t = 0; t <= TAU + 0.02; t += 0.01) {
      const rad = base + amp * Math.sin(nn * t + L) * Math.cos(3 * t);
      const x = cx + Math.cos(t) * rad, y = cy + Math.sin(t) * rad; t === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    stroke(g, gold, 0.9, 0.5);
  }
  // engraved rings
  for (const [rad, w, a, dash] of [[0.46, 2.5, 0.8, 0], [0.49, 1, 0.6, 0], [0.43, 3, 0.55, 1]] as number[][]) {
    g.beginPath(); g.arc(cx, cy, m * rad, 0, TAU); if (dash) g.setLineDash([12, 8]); stroke(g, gold, w, a); g.setLineDash([]);
  }
  // wings
  for (const sg of [-1, 1]) for (let i = 0; i < 7; i++) {
    const t = i / 6, sx = cx + sg * m * 0.1, sy = cy + (t - 0.5) * m * 0.05;
    const tx = cx + sg * m * (0.22 + 0.26 * (1 - Math.abs(t - 0.35)) ), ty = cy - m * 0.22 + t * m * 0.34;
    g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(cx + sg * m * 0.3, sy - m * 0.12 * (1 - t) - 4, tx, ty);
    g.quadraticCurveTo(cx + sg * m * 0.28, sy + 6, sx, sy + 4);
    g.fillStyle = gold; g.globalAlpha = 0.1; g.fill(); stroke(g, gold, 1.4, 0.75);
  }
  // central jewel
  const d = m * 0.085;
  g.beginPath(); g.moveTo(cx, cy - d * 1.3); g.lineTo(cx + d, cy); g.lineTo(cx, cy + d * 1.3); g.lineTo(cx - d, cy); g.closePath();
  g.fillStyle = radial(g, cx, cy - d * 0.3, 0, d * 1.4, [[0, '#ffffff'], [0.4, '#fde047'], [1, '#b45309']]); g.globalAlpha = 0.95; g.fill();
  stroke(g, gold, 2.5, 1);
  g.beginPath(); g.moveTo(cx - d, cy); g.lineTo(cx + d, cy); g.moveTo(cx, cy - d * 1.3); g.lineTo(cx - d * 0.35, cy); g.lineTo(cx, cy + d * 1.3); g.moveTo(cx, cy - d * 1.3); g.lineTo(cx + d * 0.35, cy); g.lineTo(cx, cy + d * 1.3);
  stroke(g, '#fff7c2', 1, 0.7);
  g.fillStyle = radial(g, cx, cy, 0, d * 3, [[0, 'rgba(255,240,150,0.35)'], [1, 'rgba(255,240,150,0)']]); g.globalAlpha = 1; g.beginPath(); g.arc(cx, cy, d * 3, 0, TAU); g.fill();
  // cardinal gems
  g.fillStyle = s.bumperRing;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, x = cx + Math.cos(a) * m * 0.46, y = cy + Math.sin(a) * m * 0.46, big = i % 2 === 0;
    g.globalAlpha = 0.95; sparkle(g, x, y, big ? 9 : 5);
  }
  // corner filigree
  const cs = m * 0.13;
  for (const [x, y, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [W, H, -1, -1], [0, H, 1, -1]] as number[][]) {
    g.save(); g.translate(x, y); g.scale(sx, sy);
    for (let k = 0; k < 2; k++) {
      const o = 10 + k * 7; g.beginPath(); g.moveTo(o, o + cs); g.lineTo(o, o); g.lineTo(o + cs, o); stroke(g, gold, 1.6 - k * 0.5, 0.8 - k * 0.2);
    }
    g.beginPath(); g.arc(10 + cs * 0.55, 10 + cs * 0.55, 4, 0, TAU); g.fillStyle = gold; g.globalAlpha = 0.9; g.fill();
    g.restore();
  }
  // foil sparkles
  g.fillStyle = '#fff7c2';
  for (let i = 0; i < 28; i++) { g.globalAlpha = 0.25 + r() * 0.6; sparkle(g, r() * W, r() * H, 1.5 + r() * 3); }
};

const REGISTRY: Record<string, Fn> = {
  volcanic_crust: volcanic,
  prism_facets: prism,
  pulse_waves: pulse,
  pcb_board: pcb,
  reactor_core: reactor,
  glacier_crystal: glacier,
  astral_mandala: astral,
  orrery: celestial,
  obsidian_shatter: obsidian,
  cobalt_arena: cobalt,
  crimson_colosseum: crimson,
  slate_tiles: slate,
  emerald_argyle: emerald,
  apex_throne: apex,
};

export const isSkinPattern = (p: string) => p in REGISTRY;

export function drawSkinPattern(g: Ctx, s: TableSkin, W: number, H: number): boolean {
  const fn = REGISTRY[s.pattern as string];
  if (!fn) return false;
  g.save();
  fn(g, s, W, H);
  g.restore();
  return true;
}