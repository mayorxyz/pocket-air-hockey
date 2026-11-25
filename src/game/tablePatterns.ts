import { isLightSurface, TableSkin } from './skins';
import { drawSportPattern, isSportPattern } from './sportPatterns';

export function drawTablePattern(
  g: CanvasRenderingContext2D,
  tableSkin: TableSkin,
  W: number,
  H: number
): void {
  const pattern = tableSkin.pattern;

  if (isSportPattern(pattern)) {
    drawSportPattern(g, pattern, W, H, tableSkin);
    return;
  }

  if (pattern === 'air_dots') {
    g.fillStyle = tableSkin.dots;
    for (let r = 0, y = 10; y < H; y += 16, r++) {
      for (let x = r % 2 ? 18 : 10; x < W; x += 16) {
        g.beginPath();
        g.arc(x, y, 1.3, 0, Math.PI * 2);
        g.fill();
      }
    }
    return;
  }

  if (pattern === 'neon_grid') {
    const step = 40;
    g.save();
    g.lineWidth = 1;
    g.strokeStyle = tableSkin.dots;
    g.beginPath();
    for (let x = step; x < W; x += step) {
      g.moveTo(x, 0);
      g.lineTo(x, H);
    }
    for (let y = step; y < H; y += step) {
      g.moveTo(0, y);
      g.lineTo(W, y);
    }
    g.stroke();

    // Subtle glowing node crosshairs at grid intersections
    g.globalAlpha = 0.28;
    g.fillStyle = tableSkin.lines;
    for (let y = step; y < H; y += step) {
      for (let x = step; x < W; x += step) {
        g.beginPath();
        g.arc(x, y, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
    return;
  }

  if (pattern === 'wood_planks') {
    const plankW = 40;
    g.save();
    for (let idx = 0, x = 0; x < W; x += plankW, idx++) {
      if (idx % 2 === 1) {
        g.fillStyle = 'rgba(0, 0, 0, 0.045)';
        g.fillRect(x, 0, plankW, H);
      } else {
        g.fillStyle = 'rgba(255, 248, 232, 0.045)';
        g.fillRect(x, 0, plankW, H);
      }
    }

    // Vertical plank seams & staggered end-joints
    g.lineWidth = 1.2;
    g.strokeStyle = tableSkin.dots;
    g.globalAlpha = 0.55;
    g.beginPath();
    for (let x = plankW; x < W; x += plankW) {
      g.moveTo(x, 0);
      g.lineTo(x, H);
    }
    for (let idx = 0, x = 0; x < W; x += plankW, idx++) {
      const offset = (idx % 3) * 44 + 28;
      for (let y = offset; y < H; y += 132) {
        g.moveTo(x, y);
        g.lineTo(x + plankW, y);
      }
    }
    g.stroke();

    // Fine wood-grain streaks
    g.globalAlpha = 0.25;
    g.lineWidth = 1;
    g.beginPath();
    for (let idx = 0, x = 10; x < W; x += 20, idx++) {
      const y0 = (idx * 37) % 90;
      for (let y = y0; y < H; y += 96) {
        g.moveTo(x, y);
        g.lineTo(x, Math.min(H, y + 36));
      }
    }
    g.stroke();
    g.restore();
    return;
  }

  if (pattern === 'hex_mesh') {
    const r = 18;
    const dx = r * 1.5;
    const dy = Math.sqrt(3) * r;
    g.save();
    g.lineWidth = 1.15;
    g.strokeStyle = tableSkin.dots;
    g.globalAlpha = 0.85;
    g.beginPath();
    for (let col = -1; col * dx < W + r * 2; col++) {
      const cx = col * dx;
      const yOffset = col % 2 === 0 ? 0 : dy * 0.5;
      for (let row = -1; row * dy < H + r * 2; row++) {
        const cy = row * dy + yOffset;
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k;
          const px = cx + Math.cos(ang) * r;
          const py = cy + Math.sin(ang) * r;
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
      }
    }
    g.stroke();
    g.restore();
    return;
  }

  if (pattern === 'circuit_traces') {
    g.save();
    const midY = H * 0.5;
    const busX = [56, 108, 154, 246, 292, 344];
    g.strokeStyle = tableSkin.dots;
    g.lineWidth = 1.6;
    g.lineJoin = 'round';
    g.globalAlpha = 0.9;

    g.beginPath();
    // Vertical + 45-degree PCB trace pairs mirrored symmetrically top/bottom
    for (let i = 0; i < busX.length; i++) {
      const x = busX[i];
      const jog = i % 2 === 0 ? 18 : -18;
      const y1 = H * 0.16;
      const y2 = H * 0.34;
      const y3 = H * 0.66;
      const y4 = H * 0.84;

      // Top half trace
      g.moveTo(x, 24);
      g.lineTo(x, y1);
      g.lineTo(x + jog, y1 + 18);
      g.lineTo(x + jog, y2);

      // Bottom half mirror trace
      g.moveTo(x, H - 24);
      g.lineTo(x, y4);
      g.lineTo(x + jog, y4 - 18);
      g.lineTo(x + jog, y3);
    }

    // Horizontal bus traces near midfield
    const midOffsets = [-76, -42, 42, 76];
    for (let i = 0; i < midOffsets.length; i++) {
      const y = midY + midOffsets[i];
      g.moveTo(32, y);
      g.lineTo(116, y);
      g.lineTo(134, y + (midOffsets[i] < 0 ? 12 : -12));
      g.moveTo(W - 32, y);
      g.lineTo(W - 116, y);
      g.lineTo(W - 134, y + (midOffsets[i] < 0 ? 12 : -12));
    }
    g.stroke();

    // PCB via pads and glowing accent nodes
    const nodes: Array<[number, number]> = [
      [56 + 18, H * 0.34],
      [108 - 18, H * 0.34],
      [154 + 18, H * 0.34],
      [246 - 18, H * 0.34],
      [292 + 18, H * 0.34],
      [344 - 18, H * 0.34],
      [56 + 18, H * 0.66],
      [108 - 18, H * 0.66],
      [154 + 18, H * 0.66],
      [246 - 18, H * 0.66],
      [292 + 18, H * 0.66],
      [344 - 18, H * 0.66],
      [134, midY - 64],
      [W - 134, midY - 64],
      [134, midY + 64],
      [W - 134, midY + 64],
    ];

    g.fillStyle = tableSkin.surface;
    g.strokeStyle = tableSkin.lines;
    g.lineWidth = 1.4;
    g.globalAlpha = 0.45;
    for (let i = 0; i < nodes.length; i++) {
      const [nx, ny] = nodes[i];
      g.beginPath();
      g.arc(nx, ny, 3.6, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.restore();
    return;
  }

  if (pattern === 'chevron_lanes') {
    g.save();
    const laneXs = [104, 200, 296];
    const light = isLightSurface(tableSkin.surface);
    g.strokeStyle = tableSkin.dots;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 2.6;
    g.globalAlpha = light ? 0.78 : 0.65;

    const chevsTop = [0.41, 0.31, 0.21];
    const chevsBot = [0.59, 0.69, 0.79];

    g.beginPath();
    for (let li = 0; li < laneXs.length; li++) {
      const lx = laneXs[li];
      const halfW = li === 1 ? 22 : 15;
      const tipH = li === 1 ? 12 : 9;

      // Top half chevrons pointing UP toward top goal
      for (let i = 0; i < chevsTop.length; i++) {
        const cy = H * chevsTop[i];
        g.moveTo(lx - halfW, cy + tipH);
        g.lineTo(lx, cy);
        g.lineTo(lx + halfW, cy + tipH);
      }

      // Bottom half chevrons pointing DOWN toward bottom goal
      for (let i = 0; i < chevsBot.length; i++) {
        const cy = H * chevsBot[i];
        g.moveTo(lx - halfW, cy - tipH);
        g.lineTo(lx, cy);
        g.lineTo(lx + halfW, cy - tipH);
      }
    }
    g.stroke();

    // Subtle dashed lane divider rails
    g.setLineDash([8, 12]);
    g.lineWidth = 1.25;
    g.globalAlpha = 0.35;
    g.strokeStyle = tableSkin.lines;
    g.beginPath();
    g.moveTo(152, H * 0.16);
    g.lineTo(152, H * 0.84);
    g.moveTo(248, H * 0.16);
    g.lineTo(248, H * 0.84);
    g.stroke();
    g.restore();
    return;
  }

  // royal_crest: subtle diagonal trellis + centered crest emblem
  g.save();
  const step = 48;
  g.lineWidth = 1;
  g.strokeStyle = tableSkin.dots;
  g.globalAlpha = 0.6;
  g.beginPath();
  for (let d = -H; d < W + H; d += step) {
    g.moveTo(d, 0);
    g.lineTo(d + H, H);
    g.moveTo(d, 0);
    g.lineTo(d - H, H);
  }
  g.stroke();

  // Ornate center crest medallion
  const cx = W * 0.5;
  const cy = H * 0.5;
  g.globalAlpha = 0.42;
  g.strokeStyle = tableSkin.lines;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, 46, 0, Math.PI * 2);
  g.stroke();

  // 8-point crest diamond ring
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    g.moveTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46);
    g.lineTo(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62);
  }
  g.stroke();

  // Center crown motif
  g.fillStyle = tableSkin.lines;
  g.beginPath();
  g.moveTo(cx - 18, cy + 11);
  g.lineTo(cx - 21, cy - 7);
  g.lineTo(cx - 9, cy + 1);
  g.lineTo(cx, cy - 15);
  g.lineTo(cx + 9, cy + 1);
  g.lineTo(cx + 21, cy - 7);
  g.lineTo(cx + 18, cy + 11);
  g.closePath();
  g.fill();
  g.restore();
}
