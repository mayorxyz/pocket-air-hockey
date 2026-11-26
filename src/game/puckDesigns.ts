import { isExtraPuck, type EXTRA_PUCKS } from './puckSkins';

export type CorePuckId =
  | 'classic'
  | 'neon'
  | 'gold'
  | 'champion_crown'
  | 'crimson_core'
  | 'frost_prism'
  | 'obsidian_blaze'
  | 'amber_reactor'
  | 'emerald_pulse'
  | 'magenta_nova'
  | 'titanium_ring'
  | 'mythic_celestial'
  | 'plasma_violet'
  | 'immortal_crown';

export type PuckEmblem = keyof typeof EXTRA_PUCKS | CorePuckId;

const CORE_PUCK_IDS = new Set<string>([
  'classic',
  'neon',
  'gold',
  'champion_crown',
  'crimson_core',
  'frost_prism',
  'obsidian_blaze',
  'amber_reactor',
  'emerald_pulse',
  'magenta_nova',
  'titanium_ring',
  'mythic_celestial',
  'plasma_violet',
  'immortal_crown',
]);

export function hasPuckDesign(id: string): id is PuckEmblem {
  return isExtraPuck(id) || CORE_PUCK_IDS.has(id);
}

type Colors = {
  body: string;
  ring: string;
  accent?: string;
  accent2?: string;
};

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
  const accent = c.accent ?? c.ring;
  const accent2 = c.accent2 ?? '#ffffff';

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r / 100, r / 100); // design space: radius 100
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const circle = (
    px: number,
    py: number,
    rad: number,
    fill?: string,
    stroke?: string,
    width = 4,
  ) => {
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, TAU);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  };
  const poly = (pts: number[][], fill?: string, stroke?: string, width = 4) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  };
  const polar = (rad: number, a: number): [number, number] => [
    rad * Math.cos(a),
    rad * Math.sin(a),
  ];
  const star = (points: number, outer: number, inner: number, turn = -Math.PI / 2) =>
    Array.from({ length: points * 2 }, (_, i) =>
      polar(i % 2 ? inner : outer, turn + (i * Math.PI) / points),
    );
  const spin = (n: number, draw: (i: number) => void) => {
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / n);
      draw(i);
      ctx.restore();
    }
  };
  const path = (d: () => void, color: string, width: number) => {
    ctx.beginPath();
    d();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  circle(0, 0, 100, c.body);

  switch (emblem) {
    // --- Core 14 puck skins ---
    case 'classic':
      circle(0, 0, 56, undefined, accent, 5);
      circle(0, 0, 22, undefined, accent, 4);
      spin(8, () =>
        path(() => {
          ctx.moveTo(26, 0);
          ctx.lineTo(52, 0);
        }, accent, 3),
      );
      circle(0, 0, 8, accent);
      break;

    case 'neon':
      circle(0, 0, 64, undefined, accent, 4.5);
      circle(0, 0, 38, undefined, accent, 3);
      spin(4, () => {
        path(() => {
          ctx.moveTo(38, 0);
          ctx.lineTo(64, 0);
        }, accent, 4);
        circle(64, 0, 6, accent2);
      });
      circle(0, 0, 12, c.body, accent, 4);
      break;

    case 'gold':
      poly(star(8, 72, 34), accent, c.body, 3);
      circle(0, 0, 24, c.body, accent2, 5);
      circle(0, 0, 9, accent2);
      break;

    case 'champion_crown':
      poly(
        [
          [-54, 34],
          [-64, -22],
          [-26, 4],
          [0, -48],
          [26, 4],
          [64, -22],
          [54, 34],
        ],
        accent,
        c.body,
        4,
      );
      [-34, 0, 34].forEach((gx) => circle(gx, 14, 6, c.body));
      break;

    case 'crimson_core':
      spin(3, () => {
        poly(
          [
            [0, -76],
            [24, -28],
            [0, -40],
            [-24, -28],
          ],
          accent,
        );
      });
      circle(0, 0, 28, accent, c.body, 5);
      circle(0, 0, 11, accent2);
      break;

    case 'frost_prism':
      poly(star(6, 74, 42), undefined, accent, 5);
      spin(3, () =>
        path(() => {
          ctx.moveTo(-58, 0);
          ctx.lineTo(58, 0);
        }, accent, 4),
      );
      poly(star(6, 26, 14), accent, c.body, 3);
      break;

    case 'obsidian_blaze':
      spin(6, (i) => {
        ctx.save();
        ctx.rotate(i * 0.2);
        poly(
          [
            [0, -16],
            [20, -48],
            [4, -82],
            [-14, -52],
          ],
          i % 2 ? accent : accent2,
        );
        ctx.restore();
      });
      circle(0, 0, 18, accent2, accent, 5);
      break;

    case 'amber_reactor':
      circle(0, 0, 62, undefined, accent, 6);
      spin(4, () => {
        poly(
          [
            [-11, -40],
            [11, -40],
            [16, -76],
            [-16, -76],
          ],
          c.body,
          accent,
          4,
        );
      });
      circle(0, 0, 22, accent, c.body, 4);
      circle(0, 0, 9, accent2);
      break;

    case 'emerald_pulse':
      circle(0, 0, 64, undefined, accent, 3);
      circle(0, 0, 42, undefined, accent, 3);
      path(() => {
        ctx.moveTo(-64, 0);
        ctx.lineTo(-30, 0);
        ctx.lineTo(-16, -32);
        ctx.lineTo(-2, 36);
        ctx.lineTo(14, -22);
        ctx.lineTo(26, 0);
        ctx.lineTo(64, 0);
      }, accent, 6);
      break;

    case 'magenta_nova':
      spin(10, (i) =>
        path(() => {
          ctx.moveTo(0, -24);
          ctx.lineTo(0, i % 2 ? -74 : -52);
        }, accent, i % 2 ? 5 : 3),
      );
      circle(0, 0, 22, accent, c.body, 4);
      circle(0, 0, 9, accent2);
      break;

    case 'titanium_ring':
      circle(0, 0, 68, undefined, accent, 9);
      circle(0, 0, 44, undefined, accent, 3.5);
      spin(12, () =>
        path(() => {
          ctx.moveTo(58, 0);
          ctx.lineTo(76, 0);
        }, accent, 4),
      );
      path(() => {
        ctx.moveTo(-24, 0);
        ctx.lineTo(24, 0);
        ctx.moveTo(0, -24);
        ctx.lineTo(0, 24);
      }, accent, 3);
      break;

    case 'mythic_celestial':
      circle(0, 0, 66, undefined, accent, 2.5);
      ctx.beginPath();
      ctx.arc(8, 0, 42, Math.PI * 0.22, Math.PI * 1.78);
      ctx.quadraticCurveTo(-12, 0, 8, Math.PI * 0.22 + TAU);
      ctx.fillStyle = accent;
      ctx.fill();
      [
        [-44, -34, 12],
        [44, -26, 10],
        [34, 42, 11],
      ].forEach(([sx, sy, sr]) => {
        ctx.save();
        ctx.translate(sx, sy);
        poly(star(4, sr, sr * 0.35), accent2);
        ctx.restore();
      });
      break;

    case 'plasma_violet':
      spin(2, () => {
        path(() => ctx.ellipse(0, 0, 68, 28, 0, 0, TAU), accent, 6);
      });
      circle(0, 0, 18, accent, c.body, 4);
      circle(-5, -5, 6, accent2);
      break;

    case 'immortal_crown':
      circle(0, 0, 70, undefined, accent, 3.5);
      poly(
        [
          [-50, 28],
          [-60, -22],
          [-28, 4],
          [-14, -40],
          [0, -10],
          [14, -40],
          [28, 4],
          [60, -22],
          [50, 28],
        ],
        accent,
        c.body,
        3.5,
      );
      [-28, 0, 28].forEach((gx) => circle(gx, 12, 5.5, accent2));
      break;

    // --- Extra pucks ---
    case 'vortex':
      spin(6, (i) =>
        path(() => {
          ctx.moveTo(6, 0);
          ctx.bezierCurveTo(35, -5, 70, 20, 62, 62);
        }, i % 2 ? accent : accent2, 11),
      );
      circle(0, 0, 13, '#ffffff');
      break;
    case 'shuriken':
      poly(star(4, 82, 24), c.ring);
      spin(4, () => poly([[0, 0], [0, -82], [17, -17]], accent));
      circle(0, 0, 18, c.body, accent2, 7);
      break;
    case 'dragon_eye':
      ctx.beginPath();
      ctx.moveTo(-80, 0);
      ctx.quadraticCurveTo(0, -78, 80, 0);
      ctx.quadraticCurveTo(0, 78, -80, 0);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.strokeStyle = accent2;
      ctx.lineWidth = 7;
      ctx.stroke();
      circle(0, 0, 33, accent2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 34, 0, 0, TAU);
      ctx.fillStyle = '#050505';
      ctx.fill();
      circle(-13, -13, 6, '#ffffff');
      break;
    case 'lotus':
      [
        [8, 80, accent, 0],
        [8, 58, c.ring, Math.PI / 8],
        [6, 36, accent, 0],
      ].forEach(([n, len, col, turn]) => {
        ctx.save();
        ctx.rotate(turn as number);
        spin(n as number, () => {
          const l = len as number;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(l * 0.38, -l * 0.55, 0, -l);
          ctx.quadraticCurveTo(-l * 0.38, -l * 0.55, 0, 0);
          ctx.fillStyle = col as string;
          ctx.fill();
          ctx.strokeStyle = c.body;
          ctx.lineWidth = 3;
          ctx.stroke();
        });
        ctx.restore();
      });
      circle(0, 0, 13, accent2);
      break;
    case 'atom':
      spin(3, () => path(() => ctx.ellipse(0, 0, 78, 28, 0, 0, TAU), accent, 5));
      spin(3, () => circle(78, 0, 8, accent2));
      circle(0, 0, 18, accent2, '#ffffff', 4);
      break;
    case 'planet':
      [
        [-58, -42],
        [48, -58],
        [62, 40],
        [-40, 60],
        [-70, 12],
        [18, 72],
      ].forEach(([px, py]) => circle(px, py, 4, '#ffffff'));
      path(() => ctx.ellipse(0, 0, 80, 24, -0.4, Math.PI, TAU), accent2, 8);
      circle(0, 0, 40, accent);
      path(() => {
        ctx.arc(0, 0, 26, 0.5, 2.4);
      }, accent2, 6);
      path(() => ctx.ellipse(0, 0, 80, 24, -0.4, 0, Math.PI), accent2, 8);
      break;
    case 'storm':
      spin(12, (i) =>
        path(() => {
          ctx.moveTo(0, -70);
          ctx.lineTo(0, i % 2 ? -78 : -84);
        }, accent2, 6),
      );
      circle(0, 0, 58, undefined, accent2, 4);
      poly(
        [
          [12, -66],
          [-34, 10],
          [-4, 10],
          [-14, 66],
          [36, -14],
          [5, -14],
        ],
        accent,
        '#ffffff',
        4,
      );
      break;
    case 'hive': {
      const hex = (px: number, py: number, fill: string) =>
        poly(
          Array.from({ length: 6 }, (_, i) => {
            const [a, b] = polar(25, (i * Math.PI) / 3);
            return [px + a, py + b];
          }),
          fill,
          c.body,
          5,
        );
      hex(0, 0, accent2);
      for (let i = 0; i < 6; i++) {
        const [px, py] = polar(45, Math.PI / 6 + (i * Math.PI) / 3);
        hex(px, py, i % 2 ? accent : c.ring);
      }
      break;
    }
    case 'compass':
      circle(0, 0, 68, undefined, c.ring, 3);
      ctx.save();
      ctx.rotate(Math.PI / 4);
      poly(star(4, 56, 13), c.ring);
      ctx.restore();
      poly(star(4, 84, 16), accent);
      spin(4, (i) => poly([[0, 0], [0, -84], [11, -11]], i ? c.ring : accent2));
      circle(0, 0, 9, c.body, accent, 4);
      break;
    case 'snowflake':
      spin(6, () => {
        path(() => {
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -80);
          [
            [-34, 22],
            [-57, 17],
          ].forEach(([py, s]) => {
            ctx.moveTo(-s, py - s);
            ctx.lineTo(0, py);
            ctx.lineTo(s, py - s);
          });
        }, accent, 7);
        circle(0, -80, 5, accent2);
      });
      poly(star(6, 22, 14), accent2);
      break;
    case 'magma':
      spin(5, (i) => {
        const crack = () => {
          ctx.moveTo(0, 0);
          ctx.lineTo(10, -28);
          ctx.lineTo(-8, -50);
          ctx.lineTo(i % 2 ? 14 : 4, -92);
          ctx.moveTo(-8, -50);
          ctx.lineTo(-30, -64);
        };
        path(crack, accent, 12);
        path(crack, accent2, 4);
      });
      circle(0, 0, 17, accent2, accent, 7);
      break;
    case 'target':
      [28, 52, 76].forEach((v) => circle(0, 0, v, undefined, c.ring, 3));
      path(() => {
        ctx.moveTo(-80, 0);
        ctx.lineTo(80, 0);
        ctx.moveTo(0, -80);
        ctx.lineTo(0, 80);
      }, c.ring, 2);
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 76, -1.2 + i * 0.08, -1.12 + i * 0.08);
        ctx.closePath();
        ctx.globalAlpha = (i + 1) / 16;
        ctx.fillStyle = accent;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      circle(34, 30, 7, accent2);
      circle(-42, -18, 5, accent2);
      break;
  }

  circle(0, 0, 93, undefined, c.ring, 11);
  circle(0, 0, 85, undefined, 'rgba(0, 0, 0, 0.35)', 3);
  path(
    () => ctx.arc(0, 0, 76, Math.PI * 1.08, Math.PI * 1.45),
    'rgba(255, 255, 255, 0.3)',
    8,
  );
  ctx.restore();
}
