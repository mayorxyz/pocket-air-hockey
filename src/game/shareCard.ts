import { getMalletSkin, getPuckSkin, getTableSkin } from './skins';
import { buildTableGeometry, tracePolygonPath } from './tableGeometry';

export interface ShareCardPayload {
  title: string;
  subtitle: string;
  tableSkinId: string;
  puckSkinId: string;
  malletSkinId: string;
  stats: Array<{ label: string; value: string }>;
}

const FONT_STACK = '"Outfit", "Plus Jakarta Sans", "Avenir Next", Arial, sans-serif';

export async function shareResultCard(
  payload: ShareCardPayload
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'cancelled';

  const tableSkin = getTableSkin(payload.tableSkinId);
  const puckSkin = getPuckSkin(payload.puckSkinId);
  const malletSkin = getMalletSkin(payload.malletSkinId);

  // Background gradient
  ctx.fillStyle = '#101922';
  ctx.fillRect(0, 0, W, H);

  const glowTop = ctx.createRadialGradient(W * 0.5, 220, 40, W * 0.5, 220, 560);
  glowTop.addColorStop(0, `${tableSkin.p1Banner}33`);
  glowTop.addColorStop(1, 'rgba(16, 25, 34, 0)');
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, H);

  // Outer card frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(36, 36, W - 72, H - 72, 44);
  ctx.stroke();

  // Header brand + title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a9bac6';
  ctx.font = `800 28px ${FONT_STACK}`;
  ctx.fillText('AIR HOCKEY ARCADE', W / 2, 118);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 68px ${FONT_STACK}`;
  ctx.fillText(payload.title, W / 2, 198);

  ctx.fillStyle = '#fbbf24';
  ctx.font = `700 32px ${FONT_STACK}`;
  ctx.fillText(payload.subtitle, W / 2, 252);

  // Center table silhouette showcase
  const tw = 400;
  const th = 560;
  const gx = (tw - 150) / 2;
  const scale = 0.86;
  const ox = (W - tw * scale) / 2;
  const oy = 304;
  const geom = buildTableGeometry(tableSkin.shape, tw, th, 150, 8);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  const polyPath = new Path2D();
  tracePolygonPath(polyPath, geom.polygonPoints);
  ctx.save();
  ctx.clip(polyPath);

  ctx.fillStyle = tableSkin.surface;
  ctx.fillRect(0, 0, tw, th);

  ctx.strokeStyle = tableSkin.lines;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, th / 2);
  ctx.lineTo(tw, th / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(tw / 2, th / 2, 68, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = tableSkin.blueZone;
  ctx.beginPath();
  ctx.arc(tw / 2, 0, 112, 0, Math.PI);
  ctx.stroke();

  ctx.strokeStyle = tableSkin.redZone;
  ctx.beginPath();
  ctx.arc(tw / 2, th, 112, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Outer rail
  ctx.lineWidth = 16;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = tableSkin.rail;
  ctx.stroke(polyPath);

  // Goals
  ctx.fillStyle = tableSkin.goalSlot;
  ctx.beginPath();
  ctx.roundRect(gx, -10, 150, 28, 10);
  ctx.roundRect(gx, th - 18, 150, 28, 10);
  ctx.fill();

  // P2 Mallet
  ctx.fillStyle = malletSkin.p2;
  ctx.beginPath();
  ctx.arc(tw / 2, 128, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = malletSkin.ring;
  ctx.beginPath();
  ctx.arc(tw / 2, 128, 25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = malletSkin.p2dark;
  ctx.beginPath();
  ctx.arc(tw / 2, 128, 15, 0, Math.PI * 2);
  ctx.fill();

  // P1 Mallet
  ctx.fillStyle = malletSkin.p1;
  ctx.beginPath();
  ctx.arc(tw / 2, th - 128, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = malletSkin.ring;
  ctx.beginPath();
  ctx.arc(tw / 2, th - 128, 25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = malletSkin.p1dark;
  ctx.beginPath();
  ctx.arc(tw / 2, th - 128, 15, 0, Math.PI * 2);
  ctx.fill();

  // Puck
  ctx.fillStyle = puckSkin.body;
  ctx.beginPath();
  ctx.arc(tw / 2, th / 2, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = puckSkin.ring;
  ctx.beginPath();
  ctx.arc(tw / 2, th / 2, 16, 0, Math.PI * 2);
  ctx.stroke();

  if (puckSkin.emblem === 'crown') {
    ctx.fillStyle = puckSkin.ring;
    ctx.beginPath();
    ctx.moveTo(tw / 2 - 7, th / 2 + 5);
    ctx.lineTo(tw / 2 - 8, th / 2 - 3);
    ctx.lineTo(tw / 2 - 3, th / 2 + 1);
    ctx.lineTo(tw / 2, th / 2 - 6);
    ctx.lineTo(tw / 2 + 3, th / 2 + 1);
    ctx.lineTo(tw / 2 + 8, th / 2 - 3);
    ctx.lineTo(tw / 2 + 7, th / 2 + 5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();

  // Stats grid (up to 3 cards)
  const items = payload.stats.slice(0, 3);
  const cardGap = 24;
  const totalRowW = W - 144;
  const cardW = (totalRowW - cardGap * (items.length - 1)) / Math.max(1, items.length);
  const cardY = 850;
  const cardH = 190;

  items.forEach((st, idx) => {
    const cx = 72 + idx * (cardW + cardGap);
    ctx.fillStyle = '#182532';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx, cardY, cardW, cardH, 28);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#a9bac6';
    ctx.font = `700 24px ${FONT_STACK}`;
    ctx.fillText(st.label.toUpperCase(), cx + cardW / 2, cardY + 62);

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 50px ${FONT_STACK}`;
    ctx.fillText(st.value, cx + cardW / 2, cardY + 132);
  });

  // Equipped skin caption + footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cbd8e2';
  ctx.font = `600 26px ${FONT_STACK}`;
  ctx.fillText(
    `${tableSkin.name} · ${puckSkin.name} Puck · ${malletSkin.name} Mallets`,
    W / 2,
    1140
  );

  ctx.fillStyle = '#7e93a4';
  ctx.font = `700 24px ${FONT_STACK}`;
  ctx.fillText('120Hz Arcade Physics · Play Offline', W / 2, 1236);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) return 'cancelled';

  const file = new File([blob], 'air-hockey-card.png', { type: 'image/png' });
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav && typeof nav.share === 'function') {
    const canShareFiles =
      typeof nav.canShare !== 'function' || nav.canShare({ files: [file] });
    if (canShareFiles) {
      try {
        await nav.share({
          files: [file],
          title: 'Air Hockey',
          text: `${payload.title} — ${payload.subtitle}`,
        });
        return 'shared';
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return 'cancelled';
        }
        // Fallback to download if share fails for non-abort reasons
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'air-hockey-card.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
