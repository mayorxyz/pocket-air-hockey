import React, { useEffect, useRef } from 'react';
import { getMalletSkin, getPuckSkin, getTableSkin, isLightSurface } from '../game/skins';
import { buildTableGeometry, tracePolygonPath } from '../game/tableGeometry';
import { drawTablePattern } from '../game/tablePatterns';
import { drawPuckEmblem } from '../game/puckEmblems';
import { drawMalletPattern } from '../game/malletPatterns';

interface LiveArenaPreviewProps {
  tableSkinId: string;
  puckSkinId: string;
  malletSkinId: string;
  reduceMotion?: boolean;
  showBumpers?: boolean;
}

const VW = 400;
const VH = 560;
const WALL = 6;
const GOAL_W = 150;
const GX1 = (VW - GOAL_W) / 2;
const PR = 18;
const MR = 27;

const PREVIEW_BUMPERS = [
  { x: 112, y: 0.34, r: 16 },
  { x: 288, y: 0.66, r: 16 },
];

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export const LiveArenaPreview: React.FC<LiveArenaPreviewProps> = ({
  tableSkinId,
  puckSkinId,
  malletSkinId,
  reduceMotion = false,
  showBumpers = false,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tableSkin = getTableSkin(tableSkinId);
    const puckSkin = getPuckSkin(puckSkinId);
    const malletSkin = getMalletSkin(malletSkinId);
    const geom = buildTableGeometry(tableSkin.shape, VW, VH, GOAL_W, WALL);
    const lightSurface = isLightSurface(tableSkin.surface);

    const outerPath = new Path2D();
    tracePolygonPath(outerPath, geom.polygonPoints);

    // Offscreen cached arena surface so every frame only draws dynamic mallets/puck/trail
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = VW * 2;
    bgCanvas.height = VH * 2;
    const bgCtx = bgCanvas.getContext('2d');
    if (bgCtx) {
      bgCtx.setTransform(2, 0, 0, 2, 0, 0);
      bgCtx.save();
      bgCtx.clip(outerPath);
      bgCtx.fillStyle = tableSkin.surface;
      bgCtx.fillRect(0, 0, VW, VH);

      const grad = bgCtx.createLinearGradient(0, 0, 0, VH);
      grad.addColorStop(0, tableSkin.surfaceHighlight);
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(1, tableSkin.surfaceShadow);
      bgCtx.fillStyle = grad;
      bgCtx.fillRect(0, 0, VW, VH);

      drawTablePattern(bgCtx, tableSkin, VW, VH);

      // Center line & circle
      bgCtx.lineWidth = 3;
      bgCtx.strokeStyle = tableSkin.lines;
      bgCtx.beginPath();
      bgCtx.moveTo(0, VH / 2);
      bgCtx.lineTo(VW, VH / 2);
      bgCtx.stroke();

      bgCtx.beginPath();
      bgCtx.arc(VW / 2, VH / 2, 62, 0, Math.PI * 2);
      bgCtx.stroke();

      bgCtx.fillStyle = tableSkin.lines;
      bgCtx.beginPath();
      bgCtx.arc(VW / 2, VH / 2, 5, 0, Math.PI * 2);
      bgCtx.fill();

      // Goal creases
      bgCtx.strokeStyle = tableSkin.redZone;
      bgCtx.beginPath();
      bgCtx.arc(VW / 2, VH, 108, Math.PI, Math.PI * 2);
      bgCtx.stroke();

      bgCtx.strokeStyle = tableSkin.blueZone;
      bgCtx.beginPath();
      bgCtx.arc(VW / 2, 0, 108, 0, Math.PI);
      bgCtx.stroke();

      // Optional bumpers preview
      if (showBumpers) {
        for (let i = 0; i < PREVIEW_BUMPERS.length; i++) {
          const b = PREVIEW_BUMPERS[i];
          const by = b.y * VH;
          bgCtx.fillStyle = tableSkin.bumper;
          bgCtx.beginPath();
          bgCtx.arc(b.x, by, b.r, 0, Math.PI * 2);
          bgCtx.fill();

          bgCtx.lineWidth = 3;
          bgCtx.strokeStyle = tableSkin.bumperRing;
          bgCtx.beginPath();
          bgCtx.arc(b.x, by, Math.max(4, b.r - 4), 0, Math.PI * 2);
          bgCtx.stroke();

          bgCtx.lineWidth = 1.25;
          bgCtx.strokeStyle = lightSurface
            ? 'rgba(16, 25, 34, 0.35)'
            : 'rgba(255, 255, 255, 0.25)';
          bgCtx.beginPath();
          bgCtx.arc(b.x, by, b.r, 0, Math.PI * 2);
          bgCtx.stroke();
        }
      }

      // Rail & inner bevel
      bgCtx.lineWidth = WALL * 2;
      bgCtx.lineJoin = 'round';
      bgCtx.strokeStyle = tableSkin.rail;
      bgCtx.stroke(outerPath);

      bgCtx.lineWidth = 1.75;
      bgCtx.lineJoin = 'round';
      bgCtx.strokeStyle = lightSurface
        ? 'rgba(16, 25, 34, 0.22)'
        : 'rgba(255, 255, 255, 0.24)';
      bgCtx.beginPath();
      tracePolygonPath(bgCtx, geom.innerPolygonPoints);
      bgCtx.stroke();

      // Goal slots
      bgCtx.fillStyle = tableSkin.goalSlot;
      bgCtx.beginPath();
      drawRoundedRect(bgCtx, GX1, -18, GOAL_W, 18 + WALL + 12, 12);
      bgCtx.fill();
      bgCtx.beginPath();
      drawRoundedRect(bgCtx, GX1, VH - WALL - 12, GOAL_W, 18 + WALL + 12, 12);
      bgCtx.fill();

      bgCtx.lineWidth = 3;
      bgCtx.strokeStyle = tableSkin.blueZone;
      bgCtx.beginPath();
      drawRoundedRect(bgCtx, GX1, -18, GOAL_W, 18 + WALL + 12, 12);
      bgCtx.stroke();

      bgCtx.strokeStyle = tableSkin.redZone;
      bgCtx.beginPath();
      drawRoundedRect(bgCtx, GX1, VH - WALL - 12, GOAL_W, 18 + WALL + 12, 12);
      bgCtx.stroke();

      bgCtx.restore();
    }

    let cw = 240;
    let ch = 336;
    let dpr = 1;
    let paintNow: ((nowMs: number) => void) | null = null;

    const resizeCanvas = () => {
      const rect = wrap.getBoundingClientRect();
      cw = Math.max(120, rect.width);
      ch = Math.max(168, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      // Resizing the backing store clears the bitmap; repaint immediately so
      // static (reduced-motion) previews are never left blank.
      paintNow?.(performance.now());
    };

    resizeCanvas();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resizeCanvas) : null;
    ro?.observe(wrap);

    const osReduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isStatic = reduceMotion || osReduceMotion;

    const trail: Array<{ x: number; y: number }> = [];
    let rafId = 0;
    const startMs = performance.now();

    const drawMallet = (mx: number, my: number, fill: string, dark: string) => {
      ctx.fillStyle = lightSurface ? malletSkin.shadow : 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.arc(mx + 3, my + 6, MR, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      if (malletSkin.glow && !isStatic) {
        ctx.shadowColor = malletSkin.glow;
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(mx, my, MR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (malletSkin.pattern) {
        ctx.save();
        ctx.translate(mx, my);
        drawMalletPattern(ctx, malletSkin.pattern, malletSkin.accent ?? malletSkin.ring, MR);
        ctx.restore();
      }

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = lightSurface ? 'rgba(16, 25, 34, 0.28)' : 'rgba(255, 255, 255, 0.24)';
      ctx.beginPath();
      ctx.arc(mx, my, MR - 0.75, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.strokeStyle = malletSkin.ring;
      ctx.beginPath();
      ctx.arc(mx, my, MR * 0.74, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(mx, my, MR * 0.44, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = malletSkin.gloss;
      ctx.beginPath();
      ctx.arc(mx - 5, my - 6, MR * 0.14, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawPuck = (px: number, py: number, spinAngle: number) => {
      ctx.save();
      if (puckSkin.glow && !isStatic) {
        ctx.shadowColor = puckSkin.glow;
        ctx.shadowBlur = 12;
      }

      ctx.fillStyle = lightSurface ? 'rgba(16, 25, 34, 0.28)' : 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.arc(px + 2, py + 4, PR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = puckSkin.body;
      ctx.beginPath();
      ctx.arc(px, py, PR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = 1.4;
      ctx.strokeStyle = lightSurface ? 'rgba(16, 25, 34, 0.34)' : 'rgba(255, 255, 255, 0.26)';
      ctx.beginPath();
      ctx.arc(px, py, PR - 0.7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.strokeStyle = puckSkin.ring;
      ctx.beginPath();
      ctx.arc(px, py, PR - 5, 0, Math.PI * 2);
      ctx.stroke();

      if (puckSkin.emblem) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(isStatic ? 0 : spinAngle);
        drawPuckEmblem(ctx, puckSkin.emblem, puckSkin.ring, puckSkin.body);
        ctx.restore();
      }

      ctx.fillStyle = puckSkin.gloss;
      ctx.beginPath();
      ctx.arc(px - 6, py - 6.5, 3.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const paintFrame = (nowMs: number) => {
      const t = isStatic ? 0 : (nowMs - startMs) / 1000;

      // Figure-8 mini rally inside interior bounds
      const rawPx = VW * 0.5 + Math.sin(t * 2.1) * 92;
      const rawPy = VH * 0.5 + Math.sin(t * 4.2) * 145;
      const bounds = geom.xBoundsAtY(rawPy);
      const px = Math.max(bounds.minX + PR + 4, Math.min(bounds.maxX - PR - 4, rawPx));
      const py = rawPy;

      if (!isStatic) {
        trail.push({ x: px, y: py });
        if (trail.length > 10) trail.shift();
      }

      const p1Raw = geom.clampMalletPosition(
        VW * 0.5 + Math.sin(t * 2.1 + 0.35) * 76,
        VH * 0.8 + Math.cos(t * 4.2) * 26,
        MR,
        false
      );
      const p2Raw = geom.clampMalletPosition(
        VW * 0.5 + Math.sin(t * 2.1 - 0.35) * 76,
        VH * 0.2 - Math.cos(t * 4.2) * 26,
        MR,
        true
      );

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      const scale = Math.min((cw - 4) / VW, (ch - 4) / VH);
      const offX = (cw - VW * scale) / 2;
      const offY = (ch - VH * scale) / 2;

      ctx.save();
      ctx.translate(offX, offY);
      ctx.scale(scale, scale);
      ctx.clip(outerPath);
      ctx.drawImage(bgCanvas, 0, 0, VW, VH);

      // Puck trail
      if (!isStatic && trail.length > 1) {
        for (let i = 0; i < trail.length; i++) {
          const frac = i / trail.length;
          ctx.fillStyle = `rgba(${puckSkin.trailRgb}, ${(frac * 0.32).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(trail[i].x, trail[i].y, PR * (0.45 + 0.5 * frac), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      drawPuck(px, py, t * 2.6);
      drawMallet(p2Raw.x, p2Raw.y, malletSkin.p2, malletSkin.p2dark);
      drawMallet(p1Raw.x, p1Raw.y, malletSkin.p1, malletSkin.p1dark);

      ctx.restore();
    };

    paintNow = paintFrame;

    const loopFrame = (nowMs: number) => {
      paintFrame(nowMs);
      rafId = requestAnimationFrame(loopFrame);
    };

    if (isStatic) {
      paintFrame(startMs);
    } else {
      loopFrame(startMs);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [tableSkinId, puckSkinId, malletSkinId, reduceMotion, showBumpers]);

  return (
    <div
      ref={wrapRef}
      className="relative w-[min(30dvh,15.714rem)] h-[min(42dvh,22rem)] max-w-full aspect-[5/7] mx-auto flex items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        aria-label="Live arena skin combo preview"
        className="w-full h-full block"
      />
    </div>
  );
};
