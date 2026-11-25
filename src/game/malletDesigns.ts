import type { EXTRA_MALLETS } from './malletSkins';

export type MalletDesign = keyof typeof EXTRA_MALLETS;

type Colors = { body: string; ring: string; accent: string; accent2: string };

/** Draws a full mallet centred at x, y. Pass teamColor to add a player ring. */
export function drawMalletDesign(
  ctx: CanvasRenderingContext2D,
  design: MalletDesign,
  x: number,
  y: number,
  r: number,
  c: Colors,
  teamColor?: string,
) {
  const TAU = Math.PI * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r / 100, r / 100); // design space: radius 100
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const circle = (px: number, py: number, rad: number, fill?: string | CanvasGradient, stroke?: string, width = 4) => {
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
  const ngon = (n: number, rad: number, turn = -Math.PI / 2) =>
    Array.from({ length: n }, (_, i) => polar(rad, turn + (i * TAU) / n));
  const spin = (n: number, draw: (i: number) => void) => {
    for (let i = 0; i < n; i++) { ctx.save(); ctx.rotate((i * TAU) / n); draw(i); ctx.restore(); }
  };
  const path = (d: () => void, color: string, width: number) => {
    ctx.beginPath(); d(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  };

  circle(0, 0, 100, c.body);

  switch (design) {
    case 'turbine':
      spin(10, i => {
        ctx.beginPath(); ctx.moveTo(28, -6); ctx.quadraticCurveTo(58, -34, 80, -8); ctx.quadraticCurveTo(56, -8, 36, 14); ctx.closePath();
        ctx.fillStyle = i % 2 ? c.accent : c.accent2; ctx.fill();
      });
      break;
    case 'gearhead':
      spin(12, () => poly([[-13, -58], [-9, -80], [9, -80], [13, -58]], c.accent));
      circle(0, 0, 62, c.accent);
      circle(0, 0, 49, c.body, c.accent2, 3);
      spin(6, () => circle(0, -41, 5, c.accent2));
      break;
    case 'gem_core': {
      const outer = ngon(8, 80), inner = ngon(8, 48, -Math.PI / 2 + Math.PI / 8);
      outer.forEach((p, i) => {
        const q = outer[(i + 1) % 8];
        poly([p, q, inner[i]], i % 2 ? c.accent : c.ring, c.accent2, 2);
        poly([p, inner[(i + 7) % 8], inner[i]], i % 2 ? c.ring : c.accent, c.accent2, 2);
      });
      break;
    }
    case 'soccer_star':
      spin(5, () => {
        path(() => { ctx.moveTo(0, -30); ctx.lineTo(0, -58); }, c.accent, 5);
        poly([[0, -52], [19, -64], [14, -83], [-14, -83], [-19, -64]], c.accent);
        path(() => { ctx.moveTo(19, -64); ctx.lineTo(...(polar(60, -Math.PI / 2 + TAU / 10) as [number, number])); }, c.accent, 5);
      });
      break;
    case 'slam_dunk':
      [[-68, -40], [-50, 56], [62, -50], [48, 62], [-76, 14], [76, 10]].forEach(([px, py]) => circle(px, py, 3, c.accent2));
      path(() => { ctx.moveTo(0, -85); ctx.lineTo(0, 85); ctx.moveTo(-85, 0); ctx.lineTo(85, 0); }, c.accent, 6);
      [-1, 1].forEach(s => path(() => { ctx.moveTo(s * 56, -64); ctx.quadraticCurveTo(s * 14, 0, s * 56, 64); }, c.accent, 6));
      break;
    case 'vinyl':
      [76, 69, 62, 55].forEach(v => circle(0, 0, v, undefined, 'rgba(255, 255, 255, 0.18)', 2));
      circle(0, 0, 47, c.accent);
      path(() => ctx.arc(0, 0, 39, 0.3, 2.2), c.accent2, 6);
      [-0.8, 2.34].forEach(a => path(() => ctx.arc(0, 0, 66, a - 0.25, a + 0.25), 'rgba(255, 255, 255, 0.5)', 12));
      break;
    case 'reactor':
      circle(0, 0, 72, undefined, c.ring, 4);
      spin(3, () => {
        ctx.beginPath(); ctx.arc(0, 0, 66, -2.0, -1.14); ctx.arc(0, 0, 40, -1.14, -2.0, true); ctx.closePath();
        ctx.fillStyle = c.accent; ctx.fill();
      });
      spin(12, () => circle(0, -79, 4, c.accent2));
      break;
    case 'tiger':
      spin(7, i => {
        poly([[-14, -86], [2, -58], [-3, -34], [10, -60], [12, -86]], c.accent);
        if (i % 2) poly([[34, -70], [24, -48], [44, -64]], c.accent);
      });
      circle(0, 0, 40, undefined, c.accent2, 4);
      break;
    case 'sunburst':
      spin(16, i => poly([[-9, -38], [0, i % 2 ? -66 : -84], [9, -38]], i % 2 ? c.accent2 : c.accent));
      circle(0, 0, 42, c.accent2, c.accent, 5);
      break;
    case 'spider_web':
      spin(8, () => path(() => { ctx.moveTo(0, 0); ctx.lineTo(0, -85); }, c.accent, 3));
      [42, 60, 78].forEach(v => spin(8, () => {
        const [ax, ay] = polar(v, -Math.PI / 2), [bx, by] = polar(v, -Math.PI / 4);
        const [mx, my] = polar(v * 0.76, -Math.PI * 0.375);
        path(() => { ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); }, c.accent, 3);
      }));
      break;
    case 'tidal':
      spin(6, () => {
        ctx.beginPath(); ctx.moveTo(0, -36); ctx.bezierCurveTo(8, -86, 66, -78, 60, -42);
        ctx.bezierCurveTo(52, -62, 30, -58, 32, -18); ctx.closePath();
        ctx.fillStyle = c.accent; ctx.fill(); ctx.strokeStyle = c.accent2; ctx.lineWidth = 3; ctx.stroke();
      });
      break;
    case 'royal_shield':
      poly([[0, -80], [62, -56], [52, 26], [0, 82], [-52, 26], [-62, -56]], c.accent, c.ring, 7);
      path(() => { ctx.moveTo(0, -74); ctx.lineTo(0, 74); ctx.moveTo(-54, -18); ctx.lineTo(54, -18); }, c.ring, 8);
      [[-32, -46], [32, -46], [-26, 20], [26, 20]].forEach(([px, py]) => poly(ngon(4, 9).map(([a, b]) => [a + px, b + py]), c.accent2));
      break;
  }

  // outer rim and optional player ring
  circle(0, 0, 92, undefined, c.ring, 13);
  circle(0, 0, 84, undefined, 'rgba(0, 0, 0, 0.35)', 3);
  if (teamColor) circle(0, 0, 93, undefined, teamColor, 6);

  // raised handle knob
  circle(3, 6, 34, 'rgba(0, 0, 0, 0.4)');
  const knob = ctx.createRadialGradient(-12, -14, 2, 0, 0, 34);
  knob.addColorStop(0, '#ffffff');
  knob.addColorStop(0.35, c.ring);
  knob.addColorStop(1, c.body);
  circle(0, 0, 32, knob, c.ring, 4);
  circle(0, 0, 12, c.accent2, 'rgba(0, 0, 0, 0.35)', 3);
  ctx.restore();
}
