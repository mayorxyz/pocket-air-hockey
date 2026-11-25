import type { EXTRA_PUCKS } from './puckSkins';

export type PuckEmblem = keyof typeof EXTRA_PUCKS;

type Colors = { body: string; ring: string; accent: string; accent2: string };

/** Draws a full puck (body, design, rim) centred at x, y. */
export function drawPuckDesign(
  ctx: CanvasRenderingContext2D,
  emblem: PuckEmblem,
  x: number,
  y: number,
  r: number,
  c: Colors,
) {
  const TAU = Math.PI * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r / 100, r / 100); // design space: radius 100
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const circle = (px: number, py: number, rad: number, fill?: string, stroke?: string, width = 4) => {
    ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  };
  const poly = (pts: number[][], fill?: string, stroke?: string, width = 4) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  };
  const polar = (rad: number, a: number) => [rad * Math.cos(a), rad * Math.sin(a)];
  const star = (points: number, outer: number, inner: number, turn = -Math.PI / 2) =>
    Array.from({ length: points * 2 }, (_, i) => polar(i % 2 ? inner : outer, turn + (i * Math.PI) / points));
  const spin = (n: number, draw: (i: number) => void) => {
    for (let i = 0; i < n; i++) { ctx.save(); ctx.rotate((i * TAU) / n); draw(i); ctx.restore(); }
  };
  const path = (d: () => void, color: string, width: number) => {
    ctx.beginPath(); d(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  };

  circle(0, 0, 100, c.body);

  switch (emblem) {
    case 'vortex':
      spin(6, i => path(() => { ctx.moveTo(6, 0); ctx.bezierCurveTo(35, -5, 70, 20, 62, 62); }, i % 2 ? c.accent : c.accent2, 11));
      circle(0, 0, 13, '#ffffff');
      break;
    case 'shuriken':
      poly(star(4, 82, 24), c.ring);
      spin(4, () => poly([[0, 0], [0, -82], [17, -17]], c.accent));
      circle(0, 0, 18, c.body, c.accent2, 7);
      break;
    case 'dragon_eye':
      ctx.beginPath(); ctx.moveTo(-80, 0); ctx.quadraticCurveTo(0, -78, 80, 0); ctx.quadraticCurveTo(0, 78, -80, 0);
      ctx.fillStyle = c.accent; ctx.fill(); ctx.strokeStyle = c.accent2; ctx.lineWidth = 7; ctx.stroke();
      circle(0, 0, 33, c.accent2);
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 34, 0, 0, TAU); ctx.fillStyle = '#050505'; ctx.fill();
      circle(-13, -13, 6, '#ffffff');
      break;
    case 'lotus':
      [[8, 80, c.accent, 0], [8, 58, c.ring, Math.PI / 8], [6, 36, c.accent, 0]].forEach(([n, len, col, turn]) => {
        ctx.save(); ctx.rotate(turn as number);
        spin(n as number, () => {
          const l = len as number;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(l * 0.38, -l * 0.55, 0, -l); ctx.quadraticCurveTo(-l * 0.38, -l * 0.55, 0, 0);
          ctx.fillStyle = col as string; ctx.fill(); ctx.strokeStyle = c.body; ctx.lineWidth = 3; ctx.stroke();
        });
        ctx.restore();
      });
      circle(0, 0, 13, c.accent2);
      break;
    case 'atom':
      spin(3, () => path(() => ctx.ellipse(0, 0, 78, 28, 0, 0, TAU), c.accent, 5));
      spin(3, () => circle(78, 0, 8, c.accent2));
      circle(0, 0, 18, c.accent2, '#ffffff', 4);
      break;
    case 'planet':
      [[-58, -42], [48, -58], [62, 40], [-40, 60], [-70, 12], [18, 72]].forEach(([px, py]) => circle(px, py, 4, '#ffffff'));
      path(() => ctx.ellipse(0, 0, 80, 24, -0.4, Math.PI, TAU), c.accent2, 8);
      circle(0, 0, 40, c.accent);
      path(() => { ctx.arc(0, 0, 26, 0.5, 2.4); }, c.accent2, 6);
      path(() => ctx.ellipse(0, 0, 80, 24, -0.4, 0, Math.PI), c.accent2, 8);
      break;
    case 'storm':
      spin(12, i => path(() => { ctx.moveTo(0, -70); ctx.lineTo(0, i % 2 ? -78 : -84); }, c.accent2, 6));
      circle(0, 0, 58, undefined, c.accent2, 4);
      poly([[12, -66], [-34, 10], [-4, 10], [-14, 66], [36, -14], [5, -14]], c.accent, '#ffffff', 4);
      break;
    case 'hive': {
      const hex = (px: number, py: number, fill: string) =>
        poly(Array.from({ length: 6 }, (_, i) => { const [a, b] = polar(25, (i * Math.PI) / 3); return [px + a, py + b]; }), fill, c.body, 5);
      hex(0, 0, c.accent2);
      for (let i = 0; i < 6; i++) { const [px, py] = polar(45, Math.PI / 6 + (i * Math.PI) / 3); hex(px, py, i % 2 ? c.accent : c.ring); }
      break;
    }
    case 'compass':
      circle(0, 0, 68, undefined, c.ring, 3);
      ctx.save(); ctx.rotate(Math.PI / 4); poly(star(4, 56, 13), c.ring); ctx.restore();
      poly(star(4, 84, 16), c.accent);
      spin(4, i => poly([[0, 0], [0, -84], [11, -11]], i ? c.ring : c.accent2));
      circle(0, 0, 9, c.body, c.accent, 4);
      break;
    case 'snowflake':
      spin(6, () => {
        path(() => {
          ctx.moveTo(0, 0); ctx.lineTo(0, -80);
          [[-34, 22], [-57, 17]].forEach(([py, s]) => { ctx.moveTo(-s, py - s); ctx.lineTo(0, py); ctx.lineTo(s, py - s); });
        }, c.accent, 7);
        circle(0, -80, 5, c.accent2);
      });
      poly(star(6, 22, 14), c.accent2);
      break;
    case 'magma':
      spin(5, i => {
        const crack = () => { ctx.moveTo(0, 0); ctx.lineTo(10, -28); ctx.lineTo(-8, -50); ctx.lineTo(i % 2 ? 14 : 4, -92); ctx.moveTo(-8, -50); ctx.lineTo(-30, -64); };
        path(crack, c.accent, 12);
        path(crack, c.accent2, 4);
      });
      circle(0, 0, 17, c.accent2, c.accent, 7);
      break;
    case 'target':
      [28, 52, 76].forEach(v => circle(0, 0, v, undefined, c.ring, 3));
      path(() => { ctx.moveTo(-80, 0); ctx.lineTo(80, 0); ctx.moveTo(0, -80); ctx.lineTo(0, 80); }, c.ring, 2);
      for (let i = 0; i < 12; i++) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 76, -1.2 + i * 0.08, -1.12 + i * 0.08); ctx.closePath();
        ctx.globalAlpha = (i + 1) / 16; ctx.fillStyle = c.accent; ctx.fill();
      }
      ctx.globalAlpha = 1;
      circle(34, 30, 7, c.accent2); circle(-42, -18, 5, c.accent2);
      break;
  }

  circle(0, 0, 93, undefined, c.ring, 11);
  circle(0, 0, 85, undefined, 'rgba(0, 0, 0, 0.35)', 3);
  path(() => ctx.arc(0, 0, 76, Math.PI * 1.08, Math.PI * 1.45), 'rgba(255, 255, 255, 0.3)', 8);
  ctx.restore();
}
