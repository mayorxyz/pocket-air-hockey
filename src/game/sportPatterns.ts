import type { TablePattern } from './skins';

export type SportPattern = Extract<
  TablePattern,
  | 'football_pitch'
  | 'basketball_court'
  | 'table_tennis'
  | 'volleyball_court'
  | 'tennis_clay'
  | 'ice_rink'
  | 'futsal_court'
  | 'boxing_ring'
  | 'fight_cage'
  | 'cricket_ground'
  | 'baseball_diamond'
  | 'handball_court'
  | 'pool_table'
  | 'badminton_court'
  | 'rugby_field'
  | 'running_track'
>;

const SPORT_PATTERN_IDS: readonly SportPattern[] = [
  'football_pitch',
  'basketball_court',
  'table_tennis',
  'volleyball_court',
  'tennis_clay',
  'ice_rink',
  'futsal_court',
  'boxing_ring',
  'fight_cage',
  'cricket_ground',
  'baseball_diamond',
  'handball_court',
  'pool_table',
  'badminton_court',
  'rugby_field',
  'running_track',
];

export function isSportPattern(pattern: TablePattern): pattern is SportPattern {
  return SPORT_PATTERN_IDS.includes(pattern as SportPattern);
}

/** Draw after the surface fill, before goals, bumpers and puck. Portrait table: goals top and bottom. */
export function drawSportPattern(
  ctx: CanvasRenderingContext2D,
  pattern: SportPattern,
  w: number,
  h: number,
  skin: { lines: string; surfaceHighlight: string },
) {
  const cx = w / 2, cy = h / 2, accent = skin.surfaceHighlight;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };
  const arc = (x: number, y: number, r: number, a = 0, b = Math.PI * 2) => {
    ctx.beginPath(); ctx.arc(x, y, r, a, b); ctx.stroke();
  };
  const rect = (x: number, y: number, rw: number, rh: number) => ctx.strokeRect(x, y, rw, rh);
  // draws once for the top half, then mirrored for the bottom half
  const bothEnds = (draw: () => void) => {
    draw();
    ctx.save(); ctx.translate(0, h); ctx.scale(1, -1); draw(); ctx.restore();
  };
  const path = (pts: number[][], close = false) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (close) ctx.closePath();
  };
  const oval = (x: number, y: number, rx: number, ry = rx, a = 0, b = Math.PI * 2, fill?: string) => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, a, b);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.stroke();
  };
  const box = (x: number, y: number, bw: number, bh: number, fill?: string) => {
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, bw, bh); }
    ctx.strokeRect(x, y, bw, bh);
  };
  const octagon = (rx: number, ry: number) =>
    path(Array.from({ length: 8 }, (_, i) => {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    }), true);
  const m = w * 0.05; // margin, first set
  const g = w * 0.06; // margin, second set

  ctx.save();
  ctx.strokeStyle = skin.lines;
  ctx.fillStyle = skin.surfaceHighlight;
  ctx.lineWidth = Math.max(2, w * 0.008);

  switch (pattern) {
    case 'football_pitch':
      for (let i = 0; i < 10; i += 2) ctx.fillRect(0, (i * h) / 10, w, h / 10);
      rect(m, m, w - 2 * m, h - 2 * m);
      line(m, cy, w - m, cy);
      arc(cx, cy, w * 0.18);
      bothEnds(() => {
        rect(w * 0.2, m, w * 0.6, h * 0.14);
        rect(w * 0.34, m, w * 0.32, h * 0.055);
        arc(cx, m + h * 0.095, w * 0.15, 0.3 * Math.PI, 0.7 * Math.PI);
        arc(m, m, w * 0.04, 0, Math.PI / 2);
        arc(w - m, m, w * 0.04, Math.PI / 2, Math.PI);
      });
      break;

    case 'basketball_court':
      for (let x = 0; x < w; x += w / 6) ctx.fillRect(x, 0, w / 12, h);
      rect(m, m, w - 2 * m, h - 2 * m);
      line(m, cy, w - m, cy);
      arc(cx, cy, w * 0.17);
      bothEnds(() => {
        rect(w * 0.32, m, w * 0.36, h * 0.19);
        arc(cx, m + h * 0.19, w * 0.18, 0, Math.PI);
        line(w * 0.11, m, w * 0.11, h * 0.12);
        line(w * 0.89, m, w * 0.89, h * 0.12);
        ctx.beginPath();
        ctx.ellipse(cx, h * 0.12, w * 0.39, h * 0.18, 0, 0, Math.PI);
        ctx.stroke();
      });
      break;

    case 'table_tennis':
      rect(m, m, w - 2 * m, h - 2 * m);
      line(cx, m, cx, h - m);
      ctx.lineWidth *= 2.5;
      line(0, cy, w, cy);
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += w / 30) line(x, cy - h * 0.015, x, cy + h * 0.015);
      break;

    case 'volleyball_court':
      rect(w * 0.1, h * 0.07, w * 0.8, h * 0.86);
      bothEnds(() => line(w * 0.1, h * 0.355, w * 0.9, h * 0.355));
      ctx.lineWidth *= 2.5;
      line(0, cy, w, cy);
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += w / 24) line(x, cy - h * 0.018, x, cy + h * 0.018);
      break;

    case 'tennis_clay':
      rect(m, m, w - 2 * m, h - 2 * m);
      line(w * 0.17, m, w * 0.17, h - m);
      line(w * 0.83, m, w * 0.83, h - m);
      bothEnds(() => {
        line(w * 0.17, h * 0.27, w * 0.83, h * 0.27);
        line(cx, h * 0.27, cx, cy);
        line(cx, m, cx, m + h * 0.015);
      });
      ctx.lineWidth *= 2;
      line(0, cy, w, cy);
      break;

    case 'ice_rink':
      arc(cx, cy, w * 0.18);
      line(0, cy, w, cy);
      bothEnds(() => {
        ctx.save(); ctx.strokeStyle = 'rgba(21, 101, 192, 0.7)'; ctx.lineWidth *= 2;
        line(0, h * 0.33, w, h * 0.33);
        ctx.restore();
        arc(w * 0.25, h * 0.18, w * 0.12);
        arc(w * 0.75, h * 0.18, w * 0.12);
        arc(cx, m, w * 0.17, 0, Math.PI);
      });
      break;

    case 'futsal_court':
      box(g, g, w - 2 * g, h - 2 * g);
      bothEnds(() => oval(cx, g, w * 0.3, h * 0.15, 0, Math.PI, accent));
      line(g, cy, w - g, cy);
      oval(cx, cy, w * 0.16);
      break;

    case 'boxing_ring':
      box(w * 0.18, h * 0.13, w * 0.64, h * 0.74, accent);
      [0.07, 0.11, 0.15].forEach(f => box(w * f, h * f * 0.65, w * (1 - 2 * f), h * (1 - 1.3 * f)));
      bothEnds(() => {
        box(w * 0.18, h * 0.13, w * 0.1, w * 0.1, '#c62828');
        box(w * 0.72, h * 0.13, w * 0.1, w * 0.1, '#1565c0');
      });
      line(w * 0.18, cy, w * 0.82, cy);
      oval(cx, cy, w * 0.14);
      break;

    case 'fight_cage':
      ctx.save();
      octagon(w * 0.47, h * 0.45); ctx.clip();
      ctx.strokeStyle = accent; ctx.lineWidth = 1;
      for (let d = -h; d < w + h; d += w / 18) { line(d, 0, d + h, h); line(d, 0, d - h, h); }
      octagon(w * 0.38, h * 0.37); ctx.fillStyle = '#a3a8ad'; ctx.fill();
      ctx.restore();
      ctx.lineWidth *= 2;
      octagon(w * 0.38, h * 0.37); ctx.stroke();
      line(w * 0.15, cy, w * 0.85, cy);
      octagon(w * 0.15, w * 0.15); ctx.stroke();
      break;

    case 'cricket_ground':
      oval(cx, cy, w * 0.46, h * 0.46);
      ctx.setLineDash([8, 8]); oval(cx, cy, w * 0.32, h * 0.29); ctx.setLineDash([]);
      box(w * 0.38, h * 0.3, w * 0.24, h * 0.4, accent);
      bothEnds(() => {
        line(w * 0.34, h * 0.35, w * 0.66, h * 0.35);
        [-1, 0, 1].forEach(i => line(cx + i * w * 0.03, h * 0.31, cx + i * w * 0.03, h * 0.33));
      });
      line(0, cy, w, cy);
      break;

    case 'baseball_diamond': {
      const d = [[cx, h * 0.2], [w * 0.88, cy], [cx, h * 0.8], [w * 0.12, cy]];
      path(d, true); ctx.fillStyle = accent; ctx.fill(); ctx.stroke();
      path(d.map(([x, y]) => [cx + (x - cx) * 0.62, cy + (y - cy) * 0.62]), true);
      ctx.fillStyle = '#2e7d46'; ctx.fill(); ctx.stroke();
      d.forEach(([x, y]) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
        box(-w * 0.025, -w * 0.025, w * 0.05, w * 0.05, '#ffffff');
        ctx.restore();
      });
      oval(cx, cy, w * 0.1, w * 0.1, 0, Math.PI * 2, accent);
      break;
    }

    case 'handball_court':
      box(g, g, w - 2 * g, h - 2 * g);
      bothEnds(() => {
        oval(cx, g, w * 0.32, h * 0.17, 0, Math.PI, accent);
        ctx.setLineDash([8, 8]); oval(cx, g, w * 0.42, h * 0.25, 0, Math.PI); ctx.setLineDash([]);
        line(w * 0.46, h * 0.29, w * 0.54, h * 0.29);
      });
      line(g, cy, w - g, cy);
      break;

    case 'pool_table':
      box(g, g, w - 2 * g, h - 2 * g);
      [g, cy, h - g].forEach(y => [g, w - g].forEach(x => oval(x, y, w * 0.045, w * 0.045, 0, Math.PI * 2, accent)));
      bothEnds(() => line(g, h * 0.25, w - g, h * 0.25));
      oval(cx, h * 0.75, w * 0.14, w * 0.14, 0, Math.PI);
      [[0, 0], [-1, 1], [1, 1], [-2, 2], [0, 2], [2, 2]].forEach(([i, j]) =>
        oval(cx + i * w * 0.03, h * 0.27 - j * w * 0.052, w * 0.027));
      break;

    case 'badminton_court':
      box(g, g, w - 2 * g, h - 2 * g);
      [0.14, 0.86].forEach(f => line(w * f, g, w * f, h - g));
      bothEnds(() => {
        line(g, h * 0.1, w - g, h * 0.1);
        line(g, h * 0.37, w - g, h * 0.37);
        line(cx, g, cx, h * 0.37);
      });
      ctx.lineWidth *= 2.5; line(0, cy, w, cy);
      break;

    case 'rugby_field':
      ctx.fillStyle = accent;
      for (let i = 0; i < 8; i += 2) ctx.fillRect(0, (i * h) / 8, w, h / 8);
      box(g, g, w - 2 * g, h - 2 * g);
      bothEnds(() => {
        line(g, h * 0.11, w - g, h * 0.11);
        line(g, h * 0.27, w - g, h * 0.27);
        ctx.setLineDash([10, 8]); line(g, h * 0.4, w - g, h * 0.4); ctx.setLineDash([]);
        line(w * 0.38, h * 0.11, w * 0.62, h * 0.11);
        [0.38, 0.62].forEach(f => line(w * f, h * 0.07, w * f, h * 0.14));
      });
      line(g, cy, w - g, cy);
      break;

    case 'running_track': {
      const stadium = (inset: number) => {
        const r = cx - inset;
        ctx.beginPath();
        ctx.arc(cx, cx, r, Math.PI, 0);
        ctx.arc(cx, h - cx, r, 0, Math.PI);
        ctx.closePath();
      };
      [0.03, 0.08, 0.13, 0.18].forEach(f => { stadium(w * f); ctx.stroke(); });
      stadium(w * 0.23); ctx.fillStyle = accent; ctx.fill(); ctx.stroke();
      line(w * 0.23, cy, w * 0.77, cy);
      oval(cx, cy, w * 0.13);
      break;
    }
  }
  ctx.restore();
}