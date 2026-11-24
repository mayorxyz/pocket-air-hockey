import type { MalletPattern } from './skins';

const TAU = Math.PI * 2;

/**
 * Draws a decorative mallet pattern centred on the current transform origin,
 * clipped to the mallet disc. The caller should translate to the mallet centre
 * and pass its radius + accent colour.
 */
export function drawMalletPattern(
  ctx: CanvasRenderingContext2D,
  pattern: MalletPattern,
  accent: string,
  radius: number
): void {
  const r = radius;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (pattern) {
    case 'carbon_edge': {
      ctx.lineWidth = Math.max(1, r * 0.04);
      ctx.save();
      ctx.rotate(Math.PI / 4);
      ctx.globalAlpha = 0.22;
      for (let x = -r; x <= r; x += r * 0.5) {
        ctx.beginPath();
        ctx.moveTo(x, -r);
        ctx.lineTo(x, r);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.14;
      ctx.rotate(-Math.PI / 2);
      for (let x = -r; x <= r; x += r * 0.5) {
        ctx.beginPath();
        ctx.moveTo(x, -r);
        ctx.lineTo(x, r);
        ctx.stroke();
      }
      ctx.restore();

      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.82, -Math.PI * 0.85, -Math.PI * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.82, Math.PI * 0.15, Math.PI * 0.45);
      ctx.stroke();
      break;
    }
    case 'flame_sweep': {
      const tongues = [-1, 0, 1];
      for (let i = 0; i < tongues.length; i++) {
        const x = tongues[i] * r * 0.34;
        ctx.globalAlpha = i === 1 ? 0.4 : 0.3;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.2, r);
        ctx.quadraticCurveTo(x - r * 0.5, r * 0.2, x, -r * 0.85);
        ctx.quadraticCurveTo(x + r * 0.5, r * 0.2, x + r * 0.2, r);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'scale_mesh': {
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = Math.max(1, r * 0.035);
      const stepX = r * 0.34;
      const stepY = r * 0.26;
      for (let row = -4; row <= 4; row++) {
        for (let col = -5; col <= 5; col++) {
          const x = col * stepX + (row % 2 !== 0 ? stepX / 2 : 0);
          const y = row * stepY;
          if (Math.hypot(x, y) > r * 0.98) continue;
          ctx.beginPath();
          ctx.arc(x, y, stepX * 0.62, 0, Math.PI);
          ctx.stroke();
        }
      }
      break;
    }
    case 'diamond_harlequin': {
      ctx.globalAlpha = 0.32;
      const step = r * 0.5;
      const half = r * 0.22;
      for (let i = -4; i <= 4; i++) {
        for (let j = -4; j <= 4; j++) {
          if ((i + j) % 2 !== 0) continue;
          const cx = i * step;
          const cy = j * step;
          if (Math.hypot(cx, cy) > r * 0.98) continue;
          ctx.beginPath();
          ctx.moveTo(cx, cy - half);
          ctx.lineTo(cx + half, cy);
          ctx.lineTo(cx, cy + half);
          ctx.lineTo(cx - half, cy);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }
    case 'frost_crack': {
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = Math.max(1, r * 0.05);
      const angles = [0.4, 1.1, 2.0, 2.9, 4.0, 5.2];
      for (let a = 0; a < angles.length; a++) {
        const angle = angles[a];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let i = 1; i <= 4; i++) {
          const dist = r * (i / 4) * 0.92;
          const jitter = (i % 2 === 0 ? 1 : -1) * r * 0.1;
          const px = Math.cos(angle) * dist + Math.cos(angle + Math.PI / 2) * jitter;
          const py = Math.sin(angle) * dist + Math.sin(angle + Math.PI / 2) * jitter;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      break;
    }
    case 'toxin_drip': {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1.5, r * 0.09);
      const xs = [-0.55, -0.18, 0.2, 0.55];
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i] * r;
        const len = (0.5 + 0.35 * Math.abs(Math.sin(i * 1.7))) * r;
        ctx.beginPath();
        ctx.moveTo(x, -r);
        ctx.lineTo(x, -r + len);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, -r + len, Math.max(1.4, r * 0.08), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 0.35;
      ctx.fillRect(-r, -r, r * 2, r * 0.18);
      break;
    }
    case 'circuit_plate': {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1, r * 0.045);
      const traces: number[][] = [
        [-0.75, -0.5, -0.2, -0.5, -0.2, 0.1, 0.4, 0.1, 0.4, 0.55],
        [0.75, -0.3, 0.3, -0.3, 0.3, 0.25, -0.4, 0.25, -0.4, 0.65],
        [-0.6, 0.65, -0.1, 0.65, -0.1, 0.35, 0.55, 0.35],
      ];
      for (let t = 0; t < traces.length; t++) {
        const p = traces[t];
        ctx.beginPath();
        ctx.moveTo(p[0] * r, p[1] * r);
        for (let i = 2; i < p.length; i += 2) {
          ctx.lineTo(p[i] * r, p[i + 1] * r);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.75;
      const nodes: number[][] = [
        [-0.75, -0.5],
        [0.4, 0.55],
        [0.75, -0.3],
        [-0.4, 0.65],
        [0.55, 0.35],
      ];
      for (let n = 0; n < nodes.length; n++) {
        ctx.beginPath();
        ctx.arc(nodes[n][0] * r, nodes[n][1] * r, Math.max(1.2, r * 0.055), 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'scar_etch': {
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(1, r * 0.05);
      const scars = [
        [-0.7, -0.4, 0.5, 0.55],
        [-0.55, -0.6, 0.65, 0.35],
        [-0.75, -0.15, 0.35, 0.75],
        [-0.45, 0.7, 0.6, -0.5],
      ];
      for (let s = 0; s < scars.length; s++) {
        const v = scars[s];
        ctx.beginPath();
        ctx.moveTo(v[0] * r, v[1] * r);
        ctx.lineTo(v[2] * r, v[3] * r);
        ctx.stroke();
      }
      break;
    }
    case 'aurora_wave': {
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      const bands = [-0.45, 0, 0.45];
      for (let b = 0; b < bands.length; b++) {
        const base = bands[b] * r;
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const x = -r + 2 * r * (i / 12);
          const y = base + Math.sin((i / 12) * Math.PI * 2 + b * 1.6) * r * 0.14;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'eclipse_ring': {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.58, 0, TAU);
      ctx.stroke();

      ctx.globalAlpha = 0.3;
      ctx.lineWidth = Math.max(1, r * 0.05);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
        ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
        ctx.stroke();
      }
      break;
    }
    case 'candy_swirl': {
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * TAU * 2.5;
        const rad = r * 0.9 * (i / steps);
        const x = Math.cos(t) * rad;
        const y = Math.sin(t) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;
    }
    case 'forged_metal': {
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = Math.max(1, r * 0.03);
      for (let i = 0; i < 10; i++) {
        const y = -r + 2 * r * (i / 9) + Math.sin(i * 2.3) * r * 0.03;
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, y);
        ctx.lineTo(r * 0.9, y + Math.sin(i) * r * 0.02);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, Math.max(1.2, r * 0.06), 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'void_slash': {
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = Math.max(2, r * 0.14);
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.7);
      ctx.lineTo(r * 0.5, r * 0.72);
      ctx.stroke();

      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.95);
      ctx.lineTo(r * 0.95, r * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, r * 0.1);
      ctx.lineTo(-r * 0.2, r * 0.98);
      ctx.stroke();

      ctx.globalAlpha = 0.75;
      const sparks = [
        [-0.5, -0.2],
        [0.1, 0.3],
        [0.35, -0.05],
      ];
      for (let s = 0; s < sparks.length; s++) {
        ctx.beginPath();
        ctx.arc(sparks[s][0] * r, sparks[s][1] * r, Math.max(1.2, r * 0.05), 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'reef_wave': {
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(1.4, r * 0.08);
      const fronds = [-0.55, -0.05, 0.5];
      for (let b = 0; b < fronds.length; b++) {
        const bx = fronds[b] * r;
        ctx.beginPath();
        ctx.moveTo(bx, r * 0.95);
        for (let i = 1; i <= 10; i++) {
          const t = i / 10;
          const y = r * 0.95 - t * 1.8 * r;
          const x = bx + Math.sin(t * Math.PI * 2 + b) * r * 0.16;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 0.5;
      const bubbles = [
        [-0.35, -0.5],
        [0.25, -0.15],
        [-0.1, 0.35],
        [0.45, 0.55],
      ];
      for (let b = 0; b < bubbles.length; b++) {
        ctx.beginPath();
        ctx.arc(bubbles[b][0] * r, bubbles[b][1] * r, Math.max(1.2, r * 0.055), 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'lightning_arc': {
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = Math.max(2, r * 0.12);
      const bolt = [
        [-0.65, -0.95],
        [-0.2, -0.4],
        [-0.45, -0.1],
        [0.15, 0.05],
        [0.0, 0.4],
        [0.6, 0.95],
      ];
      ctx.beginPath();
      ctx.moveTo(bolt[0][0] * r, bolt[0][1] * r);
      for (let i = 1; i < bolt.length; i++) {
        ctx.lineTo(bolt[i][0] * r, bolt[i][1] * r);
      }
      ctx.stroke();

      ctx.globalAlpha = 0.4;
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(-0.2 * r, -0.4 * r);
      ctx.lineTo(0.35 * r, -0.55 * r);
      ctx.lineTo(0.72 * r, -0.2 * r);
      ctx.stroke();
      break;
    }
    case 'honeycomb': {
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = Math.max(1, r * 0.035);
      const hr = r * 0.26;
      const w = Math.sqrt(3) * hr;
      for (let row = -3; row <= 3; row++) {
        for (let col = -3; col <= 3; col++) {
          const cx = col * w + (row % 2 !== 0 ? w / 2 : 0);
          const cy = row * hr * 1.5;
          if (Math.hypot(cx, cy) > r * 1.05) continue;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k;
            const px = cx + Math.cos(a) * hr;
            const py = cy + Math.sin(a) * hr;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      break;
    }
    default:
      break;
  }

  ctx.restore();
}
