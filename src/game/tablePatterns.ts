import { isLightSurface, TableSkin } from './skins';
import { drawSportPattern, isSportPattern } from './sportPatterns';
import { drawSkinPattern } from './skinPatterns';


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

  if (drawSkinPattern(g, tableSkin, W, H)) return;
  
  if (pattern === 'air_dots') {
    g.save();
    const step = 14;
    const maxDist = Math.sqrt((W / 2) ** 2 + (H / 2) ** 2);
    
    // Primary dots with elegant radial falloff from center
    for (let y = step; y < H; y += step) {
      for (let x = step; x < W; x += step) {
        const dist = Math.sqrt((x - W / 2) ** 2 + (y - H / 2) ** 2);
        const alpha = Math.max(0.08, 0.55 * (1 - dist / maxDist));
        const radius = 1.0 + 1.2 * (1 - dist / maxDist);
        
        g.globalAlpha = alpha;
        g.fillStyle = tableSkin.dots;
        g.beginPath();
        g.arc(x, y, radius, 0, Math.PI * 2);
        g.fill();
      }
    }
    
    // Secondary micro-dot grid for premium texture
    g.globalAlpha = 0.12;
    g.fillStyle = tableSkin.lines;
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) {
        if ((x + y) % (step * 2) !== 0) {
          g.beginPath();
          g.arc(x, y, 0.6, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    g.restore();
    return;
  }

  if (pattern === 'neon_grid') {
    g.save();
    const step = Math.max(32, Math.floor(W / 12));
    
    // Base grid
    g.lineWidth = 1;
    g.strokeStyle = tableSkin.dots;
    g.globalAlpha = 0.35;
    g.beginPath();
    for (let x = 0; x <= W; x += step) {
      g.moveTo(x, 0);
      g.lineTo(x, H);
    }
    for (let y = 0; y <= H; y += step) {
      g.moveTo(0, y);
      g.lineTo(W, y);
    }
    g.stroke();

    // Fine inner micro-grid for depth
    g.lineWidth = 0.5;
    g.globalAlpha = 0.12;
    g.beginPath();
    const fineStep = step / 4;
    for (let x = 0; x <= W; x += fineStep) {
      g.moveTo(x, 0);
      g.lineTo(x, H);
    }
    for (let y = 0; y <= H; y += fineStep) {
      g.moveTo(0, y);
      g.lineTo(W, y);
    }
    g.stroke();

    // Elaborate glowing nodes at major intersections
    g.globalAlpha = 0.65;
    g.fillStyle = tableSkin.surface;
    g.strokeStyle = tableSkin.lines;
    g.lineWidth = 1.5;
    
    for (let y = step; y < H; y += step) {
      for (let x = step; x < W; x += step) {
        // Outer glow ring
        g.beginPath();
        g.arc(x, y, 4.5, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        
        // Inner illuminated crosshair
        g.globalAlpha = 0.85;
        g.beginPath();
        g.moveTo(x - 2.5, y);
        g.lineTo(x + 2.5, y);
        g.moveTo(x, y - 2.5);
        g.lineTo(x, y + 2.5);
        g.stroke();
        g.globalAlpha = 0.65;
      }
    }
    
    // Subtle vignette overlay for cinematic depth
    const grad = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    g.globalAlpha = 1;
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    
    g.restore();
    return;
  }

  if (pattern === 'wood_planks') {
    g.save();
    const plankW = Math.max(30, W / 12);
    for (let idx = 0, x = 0; x < W; x += plankW, idx++) {
      g.fillStyle = idx % 2 === 1 ? 'rgba(0, 0, 0, 0.045)' : 'rgba(255, 248, 232, 0.045)';
      g.fillRect(x, 0, plankW, H);
    }

    g.lineWidth = 1.2;
    g.strokeStyle = tableSkin.dots;
    g.globalAlpha = 0.55;
    g.beginPath();
    for (let x = plankW; x < W; x += plankW) {
      g.moveTo(x, 0);
      g.lineTo(x, H);
    }
    // Staggered end-joints scaled to height
    for (let idx = 0, x = 0; x < W; x += plankW, idx++) {
      const offset = (idx % 3) * (H / 6) + (H / 12);
      for (let y = offset; y < H; y += H / 4) {
        g.moveTo(x, y);
        g.lineTo(x + plankW, y);
      }
    }
    g.stroke();

    // Fine wood-grain streaks
    g.globalAlpha = 0.22;
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
    g.save();
    const r = Math.max(12, Math.floor(W / 22));
    const dx = r * 1.5;
    const dy = Math.sqrt(3) * r;
    
    // Secondary subtle rotated mesh for woven depth
    g.lineWidth = 0.75;
    g.strokeStyle = tableSkin.lines;
    g.globalAlpha = 0.15;
    g.beginPath();
    for (let col = -1; col * dx < W + r * 2; col++) {
      const cx = col * dx;
      const yOffset = col % 2 === 0 ? 0 : dy * 0.5;
      for (let row = -1; row * dy < H + r * 2; row++) {
        const cy = row * dy + yOffset;
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k + (Math.PI / 6);
          const px = cx + Math.cos(ang) * (r * 0.6);
          const py = cy + Math.sin(ang) * (r * 0.6);
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
      }
    }
    g.stroke();

    // Primary hex mesh
    g.lineWidth = 1.3;
    g.strokeStyle = tableSkin.dots;
    g.globalAlpha = 0.75;
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
    
    // Vertex accents for a premium tech/honeycomb feel
    g.fillStyle = tableSkin.lines;
    g.globalAlpha = 0.5;
    for (let col = -1; col * dx < W + r * 2; col++) {
      const cx = col * dx;
      const yOffset = col % 2 === 0 ? 0 : dy * 0.5;
      for (let row = -1; row * dy < H + r * 2; row++) {
        const cy = row * dy + yOffset;
        g.beginPath();
        g.arc(cx, cy, 1.8, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
    return;
  }

  if (pattern === 'circuit_traces') {
    g.save();
    const midY = H * 0.5;
    // Dynamic bus positions scaled to width
    const busX = [W * 0.15, W * 0.3, W * 0.45, W * 0.55, W * 0.7, W * 0.85];
    
    g.strokeStyle = tableSkin.dots;
    g.lineWidth = 2;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.globalAlpha = 0.85;

    g.beginPath();
    for (let i = 0; i < busX.length; i++) {
      const x = busX[i];
      const jog = i % 2 === 0 ? W * 0.04 : -W * 0.04;
      const y1 = H * 0.15;
      const y2 = H * 0.35;
      const y3 = H * 0.65;
      const y4 = H * 0.85;

      // Top half trace
      g.moveTo(x, H * 0.05);
      g.lineTo(x, y1);
      g.lineTo(x + jog, y1 + (H * 0.05));
      g.lineTo(x + jog, y2);

      // Bottom half mirror trace
      g.moveTo(x, H * 0.95);
      g.lineTo(x, y4);
      g.lineTo(x + jog, y4 - (H * 0.05));
      g.lineTo(x + jog, y3);
    }
    g.stroke();

    // Horizontal bus traces near midfield
    const midOffsets = [-H * 0.15, -H * 0.08, H * 0.08, H * 0.15];
    g.beginPath();
    for (let i = 0; i < midOffsets.length; i++) {
      const y = midY + midOffsets[i];
      const dir = midOffsets[i] < 0 ? -1 : 1;
      g.moveTo(W * 0.05, y);
      g.lineTo(W * 0.25, y);
      g.lineTo(W * 0.25 + (W * 0.05), y + (H * 0.03 * dir));
      
      g.moveTo(W * 0.95, y);
      g.lineTo(W * 0.75, y);
      g.lineTo(W * 0.75 - (W * 0.05), y + (H * 0.03 * dir));
    }
    g.stroke();

    // Elaborate PCB via pads
    const nodes: Array<[number, number]> = [];
    busX.forEach((x, i) => {
      const jog = i % 2 === 0 ? W * 0.04 : -W * 0.04;
      nodes.push([x + jog, H * 0.35]);
      nodes.push([x + jog, H * 0.65]);
    });
    nodes.push([W * 0.25, midY - H * 0.15]);
    nodes.push([W * 0.75, midY - H * 0.15]);
    nodes.push([W * 0.25, midY + H * 0.15]);
    nodes.push([W * 0.75, midY + H * 0.15]);

    g.fillStyle = tableSkin.surface;
    g.strokeStyle = tableSkin.lines;
    g.lineWidth = 1.5;
    g.globalAlpha = 0.65;
    
    for (let i = 0; i < nodes.length; i++) {
      const [nx, ny] = nodes[i];
      g.beginPath();
      g.arc(nx, ny, 4.5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      
      g.fillStyle = tableSkin.lines;
      g.beginPath();
      g.arc(nx, ny, 1.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = tableSkin.surface;
    }
    
    // Corner microchip accents
    g.globalAlpha = 0.35;
    g.strokeStyle = tableSkin.dots;
    g.lineWidth = 1;
    const chipW = W * 0.08;
    const chipH = H * 0.06;
    const corners = [
      [W * 0.05, H * 0.05], 
      [W * 0.95 - chipW, H * 0.05], 
      [W * 0.05, H * 0.95 - chipH], 
      [W * 0.95 - chipW, H * 0.95 - chipH]
    ];
    for (const [cx, cy] of corners) {
      g.strokeRect(cx, cy, chipW, chipH);
      for (let p = 0; p < 4; p++) {
         g.beginPath();
         g.moveTo(cx + (chipW / 4) * p + chipW / 8, cy - 4);
         g.lineTo(cx + (chipW / 4) * p + chipW / 8, cy);
         g.moveTo(cx + (chipW / 4) * p + chipW / 8, cy + chipH);
         g.lineTo(cx + (chipW / 4) * p + chipW / 8, cy + chipH + 4);
         g.stroke();
      }
    }

    g.restore();
    return;
  }

  if (pattern === 'chevron_lanes') {
    g.save();
    const laneXs = [W * 0.25, W * 0.5, W * 0.75];
    const light = isLightSurface(tableSkin.surface);
    
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.globalAlpha = light ? 0.7 : 0.6;

    const chevsTop = [0.35, 0.25, 0.15];
    const chevsBot = [0.65, 0.75, 0.85];

    // Layer 1: Main bold chevrons
    g.strokeStyle = tableSkin.dots;
    g.lineWidth = 3;
    g.beginPath();
    for (let li = 0; li < laneXs.length; li++) {
      const lx = laneXs[li];
      const halfW = li === 1 ? W * 0.06 : W * 0.04;
      const tipH = H * 0.025;

      for (let i = 0; i < chevsTop.length; i++) {
        const cy = H * chevsTop[i];
        g.moveTo(lx - halfW, cy + tipH);
        g.lineTo(lx, cy);
        g.lineTo(lx + halfW, cy + tipH);
      }

      for (let i = 0; i < chevsBot.length; i++) {
        const cy = H * chevsBot[i];
        g.moveTo(lx - halfW, cy - tipH);
        g.lineTo(lx, cy);
        g.lineTo(lx + halfW, cy - tipH);
      }
    }
    g.stroke();

    // Layer 2: Subtle trailing motion lines for depth
    g.globalAlpha = 0.25;
    g.lineWidth = 1.5;
    g.beginPath();
    for (let li = 0; li < laneXs.length; li++) {
      const lx = laneXs[li];
      const halfW = li === 1 ? W * 0.06 : W * 0.04;
      const tipH = H * 0.025;
      const offset = 8;

      for (let i = 0; i < chevsTop.length; i++) {
        const cy = H * chevsTop[i];
        g.moveTo(lx - halfW - offset, cy + tipH + offset);
        g.lineTo(lx, cy + offset);
        g.lineTo(lx + halfW + offset, cy + tipH + offset);
      }

      for (let i = 0; i < chevsBot.length; i++) {
        const cy = H * chevsBot[i];
        g.moveTo(lx - halfW - offset, cy - tipH - offset);
        g.lineTo(lx, cy - offset);
        g.lineTo(lx + halfW + offset, cy - tipH - offset);
      }
    }
    g.stroke();

    // Central runway divider
    g.setLineDash([W * 0.02, W * 0.03]);
    g.lineWidth = 2;
    g.globalAlpha = 0.4;
    g.strokeStyle = tableSkin.lines;
    g.beginPath();
    g.moveTo(W * 0.5, H * 0.1);
    g.lineTo(W * 0.5, H * 0.9);
    g.stroke();
    
    // Side runway dividers
    g.setLineDash([W * 0.015, W * 0.04]);
    g.lineWidth = 1;
    g.globalAlpha = 0.25;
    g.beginPath();
    g.moveTo(W * 0.25, H * 0.15);
    g.lineTo(W * 0.25, H * 0.85);
    g.moveTo(W * 0.75, H * 0.15);
    g.lineTo(W * 0.75, H * 0.85);
    g.stroke();
    
    g.restore();
    return;
  }

  // royal_crest: elaborate diagonal trellis + highly detailed centered crest emblem
  g.save();
  const step = Math.max(32, Math.floor(W / 15));
  g.lineWidth = 1;
  g.strokeStyle = tableSkin.dots;
  g.globalAlpha = 0.45;
  g.beginPath();
  for (let d = -H; d < W + H; d += step) {
    g.moveTo(d, 0);
    g.lineTo(d + H, H);
    g.moveTo(d, 0);
    g.lineTo(d - H, H);
  }
  g.stroke();

  const cx = W * 0.5;
  const cy = H * 0.5;
  const baseR = Math.min(W, H) * 0.18; // Fully scalable radius

  // Outer ornate ring with precision tick marks
  g.globalAlpha = 0.6;
  g.strokeStyle = tableSkin.lines;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, baseR, 0, Math.PI * 2);
  g.stroke();
  
  g.lineWidth = 1;
  g.globalAlpha = 0.4;
  for (let i = 0; i < 32; i++) {
    const a = (Math.PI / 16) * i;
    const innerR = i % 4 === 0 ? baseR - 9 : baseR - 4;
    g.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
    g.lineTo(cx + Math.cos(a) * baseR, cy + Math.sin(a) * baseR);
  }

  // Middle geometric filigree (interlaced 8-pointed star)
  g.globalAlpha = 0.5;
  g.lineWidth = 1.5;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a1 = (Math.PI / 4) * i;
    const a2 = (Math.PI / 4) * (i + 1);
    const midA = a1 + (Math.PI / 8);
    
    const px1 = cx + Math.cos(a1) * (baseR * 0.75);
    const py1 = cy + Math.sin(a1) * (baseR * 0.75);
    const px2 = cx + Math.cos(a2) * (baseR * 0.75);
    const py2 = cy + Math.sin(a2) * (baseR * 0.75);
    
    const mix = cx + Math.cos(midA) * (baseR * 0.4);
    const miy = cy + Math.sin(midA) * (baseR * 0.4);
    
    if (i === 0) g.moveTo(px1, py1);
    g.lineTo(mix, miy);
    g.lineTo(px2, py2);
  }
  g.closePath();
  g.stroke();

  // Inner core circle
  g.globalAlpha = 0.7;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, baseR * 0.35, 0, Math.PI * 2);
  g.stroke();

  // Center crown motif (scaled and highly detailed)
  g.fillStyle = tableSkin.lines;
  g.globalAlpha = 0.85;
  const crownW = baseR * 0.4;
  const crownH = baseR * 0.35;
  const crownY = cy - crownH * 0.3;
  
  g.beginPath();
  g.moveTo(cx - crownW, crownY + crownH);
  g.lineTo(cx - crownW, crownY + crownH * 0.4);
  g.lineTo(cx - crownW * 0.6, crownY + crownH * 0.6);
  g.lineTo(cx - crownW * 0.3, crownY); // left peak
  g.lineTo(cx, crownY + crownH * 0.5); // center dip
  g.lineTo(cx + crownW * 0.3, crownY); // right peak
  g.lineTo(cx + crownW * 0.6, crownY + crownH * 0.6);
  g.lineTo(cx + crownW, crownY + crownH * 0.4);
  g.lineTo(cx + crownW, crownY + crownH);
  g.closePath();
  g.fill();
  
  // Crown jewels/dots
  g.fillStyle = tableSkin.surface;
  g.globalAlpha = 0.9;
  g.beginPath();
  g.arc(cx, crownY + crownH * 0.5, 2.5, 0, Math.PI * 2);
  g.arc(cx - crownW * 0.3, crownY, 2, 0, Math.PI * 2);
  g.arc(cx + crownW * 0.3, crownY, 2, 0, Math.PI * 2);
  g.fill();

  g.restore();
}

