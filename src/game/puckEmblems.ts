import type { PuckEmblem } from './skins';

const TAU = Math.PI * 2;

/**
 * Draws a puck emblem centred on the current transform origin. The canonical
 * design box is roughly 16x16 units (matches the original crown geometry), so
 * the caller should translate/rotate to the puck centre and pass its ring/body
 * colours.
 */
export function drawPuckEmblem(
  ctx: CanvasRenderingContext2D,
  emblem: PuckEmblem,
  baseColor: string,
  accentColor: string
): void {
  ctx.save();
  ctx.fillStyle = baseColor;
  ctx.strokeStyle = baseColor;

  switch (emblem) {
    case 'crown': {
      ctx.beginPath();
      ctx.moveTo(-6.5, 4.5);
      ctx.lineTo(-7.5, -2.5);
      ctx.lineTo(-3, 0.5);
      ctx.lineTo(0, -5.5);
      ctx.lineTo(3, 0.5);
      ctx.lineTo(7.5, -2.5);
      ctx.lineTo(6.5, 4.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'star': {
      const outer = 7.2;
      const inner = 3.1;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'clown': {
      // Light face with painted features
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, TAU);
      ctx.fill();

      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(-2.4, -1.6, 1.2, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.4, -1.6, 1.2, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 1, 1.6, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 1, 3.8, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      break;
    }
    case 'skull': {
      ctx.beginPath();
      ctx.arc(0, -1.2, 5.6, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-3.6, 3);
      ctx.lineTo(3.6, 3);
      ctx.lineTo(2.8, 6.4);
      ctx.lineTo(-2.8, 6.4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(-2.2, -1.6, 1.5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.2, -1.6, 1.5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 1.2);
      ctx.lineTo(-1, 3);
      ctx.lineTo(1, 3);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'heart': {
      ctx.beginPath();
      ctx.moveTo(0, 6.2);
      ctx.bezierCurveTo(-8, 0.5, -8, -6, -4, -6);
      ctx.bezierCurveTo(-1.5, -6, 0, -4.2, 0, -2.6);
      ctx.bezierCurveTo(0, -4.2, 1.5, -6, 4, -6);
      ctx.bezierCurveTo(8, -6, 8, 0.5, 0, 6.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'bolt': {
      ctx.beginPath();
      ctx.moveTo(1, -7.5);
      ctx.lineTo(-4, 1);
      ctx.lineTo(-0.5, 1);
      ctx.lineTo(-1.5, 7.5);
      ctx.lineTo(4.5, -1);
      ctx.lineTo(1, -1);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'eye': {
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.quadraticCurveTo(0, -6.5, 7, 0);
      ctx.quadraticCurveTo(0, 6.5, -7, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(0, 0, 2.3, 0, TAU);
      ctx.fill();
      break;
    }
    case 'seven': {
      ctx.beginPath();
      ctx.moveTo(-5, -5.5);
      ctx.lineTo(5, -5.5);
      ctx.lineTo(5, -3);
      ctx.lineTo(1, 5.5);
      ctx.lineTo(-1.5, 5.5);
      ctx.lineTo(2.5, -3);
      ctx.lineTo(-5, -3);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'moon': {
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, TAU);
      ctx.fill();

      // Carve a crescent by covering with the puck body colour
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(2.6, -1.2, 5.6, 0, TAU);
      ctx.fill();
      break;
    }
    case 'devil': {
      // Horns
      ctx.beginPath();
      ctx.moveTo(-6, -2);
      ctx.lineTo(-7, -7.2);
      ctx.lineTo(-2.4, -4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, -2);
      ctx.lineTo(7, -7.2);
      ctx.lineTo(2.4, -4);
      ctx.closePath();
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(0, 1, 4.6, 0, TAU);
      ctx.fill();

      // Angry eyes
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(-1.8, 0.2, 1.1, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(1.8, 0.2, 1.1, 0, TAU);
      ctx.fill();
      break;
    }
    case 'smile': {
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, TAU);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-2.2, -1.8, 1, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.2, -1.8, 1, 0, TAU);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0.5, 3.5, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      break;
    }
    case 'phoenix': {
      // Swept wings
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.quadraticCurveTo(-5, -6, -8, -2);
      ctx.quadraticCurveTo(-6, -1, -3, 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.quadraticCurveTo(5, -6, 8, -2);
      ctx.quadraticCurveTo(6, -1, 3, 1.5);
      ctx.closePath();
      ctx.fill();

      // Rising body + tail
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(3, -2, 2, 2.5);
      ctx.lineTo(0, 6);
      ctx.lineTo(-2, 2.5);
      ctx.quadraticCurveTo(-3, -2, 0, -6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'dragon': {
      // Dragon head in profile, facing right
      ctx.beginPath();
      ctx.moveTo(-7, 4);
      ctx.lineTo(-5, -1);
      ctx.lineTo(-3, -3.5);
      ctx.lineTo(-4.5, -7);
      ctx.lineTo(-1, -4.5);
      ctx.lineTo(1, -5);
      ctx.lineTo(2.5, -2.5);
      ctx.lineTo(7.5, -1.5);
      ctx.lineTo(7, 1.5);
      ctx.lineTo(2, 1.5);
      ctx.lineTo(3, 4.5);
      ctx.lineTo(0.5, 2);
      ctx.lineTo(-1, 4);
      ctx.lineTo(-4, 6);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(-0.5, -1.5, 1, 0, TAU);
      ctx.fill();
      break;
    }
    case 'scythe': {
      ctx.lineCap = 'round';
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, 7);
      ctx.lineTo(2.5, -3.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(5, -8.5, 8.5, -4);
      ctx.quadraticCurveTo(4.5, -4.5, 1.5, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'jester': {
      // Three-pronged cap with drooping tips
      ctx.beginPath();
      ctx.moveTo(-5, 4);
      ctx.lineTo(5, 4);
      ctx.quadraticCurveTo(7.5, 1, 7.5, -4);
      ctx.quadraticCurveTo(4.5, -1.5, 3.5, 1);
      ctx.lineTo(2.2, 0.5);
      ctx.quadraticCurveTo(3.5, -4, 0, -8);
      ctx.quadraticCurveTo(-3.5, -4, -2.2, 0.5);
      ctx.lineTo(-3.5, 1);
      ctx.quadraticCurveTo(-4.5, -1.5, -7.5, -4);
      ctx.quadraticCurveTo(-7.5, 1, -5, 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(-7.5, -4, 1.2, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -8, 1.2, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(7.5, -4, 1.2, 0, TAU);
      ctx.fill();
      break;
    }
    case 'robot': {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, -5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -8.5, 1.2, 0, TAU);
      ctx.fill();

      ctx.fillRect(-6, -5, 12, 10);

      // Ears
      ctx.fillRect(-7, -2, 1.5, 4);
      ctx.fillRect(5.5, -2, 1.5, 4);

      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(-3, -1, 1.4, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3, -1, 1.4, 0, TAU);
      ctx.fill();
      ctx.fillRect(-3, 2.2, 6, 1.3);
      break;
    }
    case 'cat': {
      // Ears
      ctx.beginPath();
      ctx.moveTo(-5.5, 1);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-2, -4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5.5, 1);
      ctx.lineTo(7, -7);
      ctx.lineTo(2, -4);
      ctx.closePath();
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(0, 1.5, 4.6, 0, TAU);
      ctx.fill();

      // Features
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(-1.8, 0.5, 1, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(1.8, 0.5, 1, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 2.2);
      ctx.lineTo(-0.9, 3.2);
      ctx.lineTo(0.9, 3.2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-2, 3.2);
      ctx.lineTo(-6, 2.2);
      ctx.moveTo(-2, 3.8);
      ctx.lineTo(-6, 4.6);
      ctx.moveTo(2, 3.2);
      ctx.lineTo(6, 2.2);
      ctx.moveTo(2, 3.8);
      ctx.lineTo(6, 4.6);
      ctx.stroke();
      break;
    }
    case 'snowflake': {
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = baseColor;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const cx = Math.cos(angle);
        const cy = Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cx * 7.5, cy * 7.5);

        const bx = cx * 4.8;
        const by = cy * 4.8;
        for (const dir of [-1, 1]) {
          const ba = angle + dir * 0.55;
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ba) * 2.6, by + Math.sin(ba) * 2.6);
        }
        ctx.stroke();
      }
      break;
    }
    case 'flame': {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.bezierCurveTo(5, -3, 6, 1, 3, 4);
      ctx.bezierCurveTo(2, 5.6, 1, 6, 0, 6.5);
      ctx.bezierCurveTo(-1, 6, -2, 5.6, -3, 4);
      ctx.bezierCurveTo(-6, 1, -5, -3, 0, -8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.moveTo(0, -1.5);
      ctx.bezierCurveTo(2.2, 0.5, 2.4, 2.5, 1, 4);
      ctx.bezierCurveTo(0.4, 4.7, -0.4, 4.7, -1, 4);
      ctx.bezierCurveTo(-2.4, 2.5, -2.2, 0.5, 0, -1.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'fang': {
      ctx.beginPath();
      ctx.moveTo(-5.5, -4);
      ctx.lineTo(-1.2, -4);
      ctx.lineTo(-3.4, 6.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(1.2, -4);
      ctx.lineTo(5.5, -4);
      ctx.lineTo(3.4, 6.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'orbit': {
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 3, -0.38, 0, TAU);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 4.4, 0, TAU);
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(5.8, -3.8, 1.3, 0, TAU);
      ctx.fill();
      break;
    }
    default:
      break;
  }

  ctx.restore();
}
