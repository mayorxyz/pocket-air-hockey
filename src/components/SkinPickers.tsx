import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Bird,
  Bot,
  Cat,
  Check,
  ChevronLeft,
  Coins,
  Crown,
  Drama,
  Eye,
  Flame,
  Heart,
  Laugh,
  Lock,
  Moon,
  Orbit,
  RotateCcw,
  Share2,
  Skull,
  Smile,
  Snowflake,
  Sparkles,
  Star,
  Swords,
  Zap,
} from 'lucide-react';
import { describeSkinUnlock, isSkinUnlocked } from '../game/progression';
import {
  getMalletSkin,
  getPuckSkin,
  getTableSkin,
  MalletSkin,
  PuckSkin,
  SkinCategory,
  SKINS,
  TableSkin,
} from '../game/skins';
import { buildTableGeometry } from '../game/tableGeometry';
import { drawPuckDesign } from '../game/puckDesigns';
import { isExtraPuck } from '../game/puckSkins';
import { drawMalletDesign } from '../game/malletDesigns';
import { isExtraMallet } from '../game/malletSkins';
import { SaveDataV3 } from '../game/types';
import { ConfirmDialog } from './ConfirmDialog';
import { LiveArenaPreview } from './LiveArenaPreview';

interface SkinPickersProps {
  save: SaveDataV3;
  onSelectOrBuy: (category: SkinCategory, id: string) => { ok: boolean; reason?: string };
}

type FilterMode = 'all' | 'unlocked' | 'locked';

const PREVIEW_W = 400;
const PREVIEW_H = 560;
const PREVIEW_GOAL_W = 150;

const TablePreview: React.FC<{ skin: TableSkin }> = ({ skin }) => {
  const clipId = useId();
  const pointsAttr = useMemo(() => {
    const geom = buildTableGeometry(skin.shape, PREVIEW_W, PREVIEW_H, PREVIEW_GOAL_W, 18);
    return geom.polygonPoints.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  }, [skin.shape]);

  const gx1 = (PREVIEW_W - PREVIEW_GOAL_W) / 2;

  return (
    <div className="w-12 h-16 flex items-center justify-center shrink-0">
      <svg
        viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <polygon points={pointsAttr} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect x={0} y={0} width={PREVIEW_W} height={PREVIEW_H} fill={skin.surface} />

          {skin.pattern === 'football_pitch' && (
            <g fill="none" stroke={skin.lines} strokeWidth={8}>
              <rect x={20} y={20} width={360} height={520} />
              <circle cx={200} cy={280} r={66} />
              <rect x={100} y={20} width={200} height={72} />
              <rect x={132} y={20} width={136} height={38} />
              <rect x={100} y={468} width={200} height={72} />
              <rect x={132} y={502} width={136} height={38} />
            </g>
          )}
          {skin.pattern === 'basketball_court' && (
            <g fill="none" stroke={skin.lines} strokeWidth={8}>
              <rect x={20} y={20} width={360} height={520} />
              <rect x={110} y={20} width={180} height={105} />
              <rect x={110} y={435} width={180} height={105} />
              <path d="M 110 125 A 90 90 0 0 0 290 125 M 110 435 A 90 90 0 0 1 290 435" />
            </g>
          )}
          {skin.pattern === 'table_tennis' && (
            <g fill="none" stroke={skin.lines} strokeWidth={8}>
              <rect x={20} y={20} width={360} height={520} />
              <path d="M 200 20 V 540" strokeWidth={10} />
            </g>
          )}
          {skin.pattern === 'volleyball_court' && (
            <g fill="none" stroke={skin.lines} strokeWidth={8}>
              <rect x={40} y={38} width={320} height={484} />
              <path d="M 40 198 H 360 M 40 362 H 360" />
            </g>
          )}
          {skin.pattern === 'tennis_clay' && (
            <g fill="none" stroke={skin.lines} strokeWidth={8}>
              <rect x={20} y={20} width={360} height={520} />
              <path d="M 80 20 V 540 M 320 20 V 540 M 80 150 H 320 M 80 410 H 320 M 200 150 V 410" />
            </g>
          )}
          {skin.pattern === 'ice_rink' && (
            <g fill="none" stroke={skin.lines} strokeWidth={8}>
              <path d="M 0 185 H 400 M 0 375 H 400" stroke="#d32f2f" />
              <circle cx={200} cy={280} r={66} />
              <circle cx={100} cy={100} r={52} />
              <circle cx={300} cy={100} r={52} />
              <circle cx={100} cy={460} r={52} />
              <circle cx={300} cy={460} r={52} />
            </g>
          )}

          {skin.pattern === 'neon_grid' && (
            <g stroke={skin.dots} strokeWidth={5} opacity={0.8}>
              <line x1={100} y1={0} x2={100} y2={PREVIEW_H} />
              <line x1={200} y1={0} x2={200} y2={PREVIEW_H} />
              <line x1={300} y1={0} x2={300} y2={PREVIEW_H} />
              <line x1={0} y1={140} x2={PREVIEW_W} y2={140} />
              <line x1={0} y1={420} x2={PREVIEW_W} y2={420} />
            </g>
          )}
          {skin.pattern === 'wood_planks' && (
            <g fill={skin.dots} opacity={0.28}>
              <rect x={80} y={0} width={80} height={PREVIEW_H} />
              <rect x={240} y={0} width={80} height={PREVIEW_H} />
            </g>
          )}
          {skin.pattern === 'hex_mesh' && (
            <g stroke={skin.dots} strokeWidth={7} fill="none" opacity={0.9}>
              <polygon points="200,80 265,118 265,192 200,230 135,192 135,118" />
              <polygon points="200,330 265,368 265,442 200,480 135,442 135,368" />
            </g>
          )}
          {skin.pattern === 'royal_crest' && (
            <g stroke={skin.dots} strokeWidth={6} opacity={0.7}>
              <line x1={0} y1={0} x2={PREVIEW_W} y2={PREVIEW_H} />
              <line x1={PREVIEW_W} y1={0} x2={0} y2={PREVIEW_H} />
            </g>
          )}
          {skin.pattern === 'circuit_traces' && (
            <g stroke={skin.dots} strokeWidth={7} fill="none" opacity={0.92}>
              <polyline points="110,20 110,120 140,150 140,220" />
              <polyline points="290,20 290,120 260,150 260,220" />
              <polyline points="110,540 110,440 140,410 140,340" />
              <polyline points="290,540 290,440 260,410 260,340" />
            </g>
          )}
          {skin.pattern === 'chevron_lanes' && (
            <g stroke={skin.dots} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9}>
              <polyline points="150,195 200,145 250,195" />
              <polyline points="150,365 200,415 250,365" />
            </g>
          )}
          {skin.pattern === 'air_dots' && (
            <g fill={skin.dots} opacity={0.9}>
              <circle cx={120} cy={140} r={8} />
              <circle cx={280} cy={140} r={8} />
              <circle cx={120} cy={420} r={8} />
              <circle cx={280} cy={420} r={8} />
            </g>
          )}

          <line
            x1={0}
            y1={PREVIEW_H / 2}
            x2={PREVIEW_W}
            y2={PREVIEW_H / 2}
            stroke={skin.lines}
            strokeWidth={12}
          />
          <circle
            cx={PREVIEW_W / 2}
            cy={PREVIEW_H / 2}
            r={66}
            fill="none"
            stroke={skin.lines}
            strokeWidth={12}
          />
          <circle
            cx={PREVIEW_W / 2}
            cy={0}
            r={110}
            fill="none"
            stroke={skin.blueZone}
            strokeWidth={12}
          />
          <circle
            cx={PREVIEW_W / 2}
            cy={PREVIEW_H}
            r={110}
            fill="none"
            stroke={skin.redZone}
            strokeWidth={12}
          />

          <polygon
            points={pointsAttr}
            fill="none"
            stroke={skin.rail}
            strokeWidth={36}
            strokeLinejoin="round"
          />

          <rect
            x={gx1}
            y={-8}
            width={PREVIEW_GOAL_W}
            height={36}
            rx={12}
            fill={skin.goalSlot}
            stroke={skin.blueZone}
            strokeWidth={10}
          />
          <rect
            x={gx1}
            y={PREVIEW_H - 28}
            width={PREVIEW_GOAL_W}
            height={36}
            rx={12}
            fill={skin.goalSlot}
            stroke={skin.redZone}
            strokeWidth={10}
          />
        </g>
      </svg>
    </div>
  );
};

const PUCK_EMBLEM_ICONS: Partial<
  Record<
    NonNullable<PuckSkin['emblem']>,
    React.ComponentType<{ className?: string; style?: React.CSSProperties; 'aria-hidden'?: boolean }>
  >
> = {
  crown: Crown,
  star: Star,
  clown: Laugh,
  skull: Skull,
  heart: Heart,
  bolt: Zap,
  eye: Eye,
  moon: Moon,
  devil: Flame,
  smile: Smile,
  phoenix: Bird,
  dragon: Sparkles,
  scythe: Swords,
  jester: Drama,
  robot: Bot,
  cat: Cat,
  snowflake: Snowflake,
  flame: Flame,
  fang: Swords,
  orbit: Orbit,
};

const PuckPreview: React.FC<{ skin: PuckSkin }> = ({ skin }) => {
  const EmblemIcon = skin.emblem ? PUCK_EMBLEM_ICONS[skin.emblem] : undefined;
  const designEmblem =
    skin.emblem && isExtraPuck(skin.emblem) ? skin.emblem : undefined;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!designEmblem || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const size = 32;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const c = canvas.getContext('2d');
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);
    drawPuckDesign(c, designEmblem, size / 2, size / 2, size / 2 - 1, {
      body: skin.body,
      ring: skin.ring,
      accent: skin.accent ?? skin.ring,
      accent2: skin.accent2 ?? skin.body,
    });
  }, [designEmblem, skin.body, skin.ring, skin.accent, skin.accent2]);

  return (
    <div className="w-12 h-12 rounded-xl bg-[#0d151e]/70 border border-white/12 flex items-center justify-center shrink-0">
      {designEmblem ? (
        <canvas
          ref={canvasRef}
          className="w-8 h-8"
          style={{ width: 32, height: 32, filter: skin.glow ? `drop-shadow(0 0 5px ${skin.glow})` : undefined }}
        />
      ) : (
        <div
          className="relative w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-white/25"
          style={{
            backgroundColor: skin.body,
            boxShadow: skin.glow ? `0 0 10px ${skin.glow}` : undefined,
          }}
        >
          <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: skin.ring }} />
          {skin.emblem === 'seven' ? (
            <span
              className="absolute text-[10px] font-black leading-none"
              style={{ color: skin.ring }}
              aria-hidden="true"
            >
              7
            </span>
          ) : EmblemIcon ? (
            <EmblemIcon className="absolute w-3 h-3" style={{ color: skin.ring }} aria-hidden={true} />
          ) : null}
          <div
            className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: skin.gloss }}
          />
        </div>
      )}
    </div>
  );
};

const MalletDesignCanvas: React.FC<{ skin: MalletSkin; teamColor: string }> = ({
  skin,
  teamColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const design = skin.design && isExtraMallet(skin.design) ? skin.design : undefined;

  useEffect(() => {
    if (!design || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const size = 24;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const c = canvas.getContext('2d');
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);
    drawMalletDesign(
      c,
      design,
      size / 2,
      size / 2,
      size / 2 - 1,
      {
        body: skin.body ?? skin.p1dark,
        ring: skin.ring,
        accent: skin.accent ?? skin.ring,
        accent2: skin.accent2 ?? skin.p1dark,
      },
      teamColor,
    );
  }, [design, skin.body, skin.ring, skin.accent, skin.accent2, skin.p1dark, teamColor]);

  return <canvas ref={canvasRef} style={{ width: 24, height: 24 }} />;
};

const MalletPreview: React.FC<{ skin: MalletSkin }> = ({ skin }) => {
  const glowStyle = skin.glow ? { boxShadow: `0 0 8px ${skin.glow}` } : undefined;
  const isDesign = skin.design && isExtraMallet(skin.design);
  return (
    <div className="w-14 h-12 rounded-xl bg-[#0d151e]/70 border border-white/12 flex items-center justify-center gap-1.5 shrink-0">
      {isDesign ? (
        <>
          <MalletDesignCanvas skin={skin} teamColor={skin.p1} />
          <MalletDesignCanvas skin={skin} teamColor={skin.p2} />
        </>
      ) : (
        <>
          <div
            className="w-5.5 h-5.5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: skin.p1, border: `2px solid ${skin.ring}`, ...glowStyle }}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: skin.p1dark }} />
          </div>
          <div
            className="w-5.5 h-5.5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: skin.p2, border: `2px solid ${skin.ring}`, ...glowStyle }}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: skin.p2dark }} />
          </div>
        </>
      )}
    </div>
  );
};

function formatCompactRequirement(category: SkinCategory, id: string): string {
  const skin = SKINS[category][id];
  if (!skin || !skin.locked || !skin.unlock) return '';
  const rule = skin.unlock;
  if (rule.type === 'coins') return `${rule.price} coins`;
  if (rule.type === 'wins') return `Win ${rule.n} Matches`;
  if (rule.type === 'streak') return `${rule.n}-Win Streak`;
  if (rule.type === 'stage') return rule.label;
  return describeSkinUnlock(category, id);
}

export const SkinPickers: React.FC<SkinPickersProps> = ({ save, onSelectOrBuy }) => {
  const [pendingBuy, setPendingBuy] = useState<{
    category: SkinCategory;
    id: string;
    name: string;
    price: number;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleTap = (category: SkinCategory, id: string) => {
    setNotice(null);
    const skin = SKINS[category][id];
    if (!skin) return;

    if (isSkinUnlocked(save, category, id)) {
      onSelectOrBuy(category, id);
      return;
    }

    if (skin.unlock?.type === 'coins') {
      if (save.coins < skin.unlock.price) {
        setNotice(`${skin.name} requires ${skin.unlock.price} coins (you have ${save.coins}).`);
        return;
      }
      setPendingBuy({
        category,
        id,
        name: skin.name,
        price: skin.unlock.price,
      });
      return;
    }

    setNotice(`${skin.name} unlocks with: ${describeSkinUnlock(category, id)}`);
  };

  const renderSkinCard = (
    category: SkinCategory,
    id: string,
    name: string,
    equippedId: string,
    preview: React.ReactNode
  ) => {
    const unlocked = isSkinUnlocked(save, category, id);
    const active = id === equippedId;
    const req = !unlocked ? describeSkinUnlock(category, id) : '';

    return (
      <button
        key={id}
        type="button"
        onClick={() => handleTap(category, id)}
        aria-pressed={active}
        className={`relative min-w-[7.25rem] min-h-[7rem] p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-transform active:scale-[0.97] cursor-pointer shrink-0 ${
          active
            ? 'bg-white text-[#101922] border-2 border-[#f0452d] ring-2 ring-white shadow-lg'
            : unlocked
              ? 'bg-[#1c2b3b] text-white border border-white/15 hover:bg-[#24364a] hover:border-white/30'
              : 'bg-[#101922]/70 text-white/80 border border-white/8 hover:bg-[#182532]'
        }`}
      >
        {active && (
          <span
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#f0452d] text-white inline-flex items-center justify-center"
            aria-hidden="true"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </span>
        )}
        {!unlocked && (
          <span className="absolute top-2 right-2 text-[#b8c7d3]" aria-hidden="true">
            <Lock className="w-3.5 h-3.5" />
          </span>
        )}
        <div className={!unlocked ? 'opacity-75' : ''}>{preview}</div>
        <span className="text-xs sm:text-sm font-bold text-center leading-tight">{name}</span>
        {!unlocked && (
          <span className="text-[11px] text-[#fbbf24] font-semibold text-center leading-tight">
            {req}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {notice && (
        <div className="rounded-xl bg-[#0e1720] border border-white/18 px-3.5 py-2.5 text-sm text-[#e9f1f4]">
          {notice}
        </div>
      )}

      <div>
        <div className="text-sm font-bold text-[#b8c7d3] mb-2">Table skin</div>
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 touch-pan-x">
          {Object.values(SKINS.table).map((skin) =>
            renderSkinCard(
              'table',
              skin.id,
              skin.name,
              save.settings.tableSkin,
              <TablePreview skin={skin} />
            )
          )}
        </div>
      </div>

      <div>
        <div className="text-sm font-bold text-[#b8c7d3] mb-2">Puck skin</div>
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 touch-pan-x">
          {Object.values(SKINS.puck).map((skin) =>
            renderSkinCard(
              'puck',
              skin.id,
              skin.name,
              save.settings.puckSkin,
              <PuckPreview skin={skin} />
            )
          )}
        </div>
      </div>

      <div>
        <div className="text-sm font-bold text-[#b8c7d3] mb-2">Mallet skin</div>
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 touch-pan-x">
          {Object.values(SKINS.mallet).map((skin) =>
            renderSkinCard(
              'mallet',
              skin.id,
              skin.name,
              save.settings.malletSkin,
              <MalletPreview skin={skin} />
            )
          )}
        </div>
      </div>

      {pendingBuy && (
        <ConfirmDialog
          title={`Unlock ${pendingBuy.name}?`}
          message={`Spend ${pendingBuy.price} coins to unlock and equip this skin.`}
          confirmLabel={`Buy for ${pendingBuy.price} coins`}
          destructive={false}
          onConfirm={() => {
            onSelectOrBuy(pendingBuy.category, pendingBuy.id);
            setPendingBuy(null);
          }}
          onCancel={() => setPendingBuy(null)}
        />
      )}
    </div>
  );
};

interface SkinsScreenProps {
  save: SaveDataV3;
  onSelectOrBuy: (category: SkinCategory, id: string) => { ok: boolean; reason?: string };
  onShareLoadout: () => void;
  onBack: () => void;
}

export const SkinsScreen: React.FC<SkinsScreenProps> = ({
  save,
  onSelectOrBuy,
  onShareLoadout,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<SkinCategory>('table');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showBumpers, setShowBumpers] = useState(false);

  const [previewTableId, setPreviewTableId] = useState(save.settings.tableSkin);
  const [previewPuckId, setPreviewPuckId] = useState(save.settings.puckSkin);
  const [previewMalletId, setPreviewMalletId] = useState(save.settings.malletSkin);

  const [pendingBuy, setPendingBuy] = useState<{
    category: SkinCategory;
    id: string;
    name: string;
    price: number;
  } | null>(null);

  const equippedIdFor = (cat: SkinCategory): string =>
    cat === 'table'
      ? save.settings.tableSkin
      : cat === 'puck'
        ? save.settings.puckSkin
        : save.settings.malletSkin;

  const previewIdFor = (cat: SkinCategory): string =>
    cat === 'table' ? previewTableId : cat === 'puck' ? previewPuckId : previewMalletId;

  const setPreviewIdFor = (cat: SkinCategory, id: string) => {
    if (cat === 'table') setPreviewTableId(id);
    else if (cat === 'puck') setPreviewPuckId(id);
    else setPreviewMalletId(id);
  };

  const isPreviewDirty =
    previewTableId !== save.settings.tableSkin ||
    previewPuckId !== save.settings.puckSkin ||
    previewMalletId !== save.settings.malletSkin;

  const resetPreviewToEquipped = () => {
    setPreviewTableId(save.settings.tableSkin);
    setPreviewPuckId(save.settings.puckSkin);
    setPreviewMalletId(save.settings.malletSkin);
  };

  const activePreviewId = previewIdFor(activeTab);
  const activeEquippedId = equippedIdFor(activeTab);
  const activeSkin = SKINS[activeTab][activePreviewId];
  const activeUnlocked = activeSkin ? isSkinUnlocked(save, activeTab, activeSkin.id) : false;
  const activeIsEquipped = activeSkin ? activeSkin.id === activeEquippedId : false;

  const categoryItems = useMemo(() => {
    const all = Object.values(SKINS[activeTab]);
    if (filterMode === 'all') return all;
    return all.filter((item) => {
      const unlocked = isSkinUnlocked(save, activeTab, item.id);
      return filterMode === 'unlocked' ? unlocked : !unlocked;
    });
  }, [activeTab, filterMode, save]);

  const previewTableSkin = getTableSkin(previewTableId);
  const previewPuckSkin = getPuckSkin(previewPuckId);
  const previewMalletSkin = getMalletSkin(previewMalletId);

  const handleCardSelect = (cat: SkinCategory, id: string) => {
    setPreviewIdFor(cat, id);
  };

  const renderContextualAction = () => {
    if (!activeSkin) return null;

    if (activeUnlocked) {
      if (activeIsEquipped) {
        return (
          <div className="min-h-12 px-4 rounded-xl bg-[#10b981]/20 border border-[#10b981]/45 text-[#6ee7b7] font-display font-extrabold text-sm inline-flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Equipped</span>
          </div>
        );
      }
      return (
        <button
          type="button"
          onClick={() => onSelectOrBuy(activeTab, activeSkin.id)}
          className="min-h-12 px-4 rounded-xl bg-[#f0452d] hover:bg-[#e13c24] border border-white/18 text-white font-display font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-1.5 transition-transform active:scale-[0.97] cursor-pointer shadow-md"
        >
          <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Equip {activeSkin.name}</span>
        </button>
      );
    }

    if (activeSkin.unlock?.type === 'coins') {
      const price = activeSkin.unlock.price;
      const canAfford = save.coins >= price;
      const needed = Math.max(0, price - save.coins);
      return (
        <button
          type="button"
          disabled={!canAfford}
          onClick={() =>
            canAfford &&
            setPendingBuy({
              category: activeTab,
              id: activeSkin.id,
              name: activeSkin.name,
              price,
            })
          }
          className={`min-h-12 px-4 rounded-xl font-display font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-1.5 transition-transform ${
            canAfford
              ? 'bg-[#fbbf24] hover:bg-[#f59e0b] text-[#101922] border border-[#fde68a]/40 active:scale-[0.97] cursor-pointer shadow-md'
              : 'bg-white/10 border border-white/12 text-[#b8c7d3] cursor-not-allowed'
          }`}
        >
          <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="tabular-nums">
            {canAfford ? `Buy for ${price} Coins` : `Need ${needed} more`}
          </span>
        </button>
      );
    }

    return (
      <div className="min-h-12 px-4 rounded-xl bg-[#0e1720] border border-[#fbbf24]/35 text-[#fde68a] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 text-center">
        <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{formatCompactRequirement(activeTab, activeSkin.id)}</span>
      </div>
    );
  };

  return (
    <div
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
      className="fixed inset-0 z-20 flex flex-col bg-[#0d151e]/92 backdrop-blur-md overflow-hidden"
    >
      <header
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        className="w-full max-w-[min(100%,58rem)] mx-auto pb-2.5 flex items-center justify-between gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 min-w-12 px-3 rounded-2xl bg-white/12 border border-white/15 hover:bg-white/18 text-white font-bold text-sm sm:text-base inline-flex items-center gap-1.5 transition-transform active:scale-[0.97] cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Back</span>
        </button>

        <h1 className="font-display m-0 text-[clamp(1.25rem,4vw,1.65rem)] font-extrabold italic tracking-tight text-white">
          Skin Studio
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onShareLoadout}
            aria-label="Share equipped skin loadout"
            className="min-h-12 min-w-12 px-3 rounded-2xl bg-white/12 border border-white/15 hover:bg-white/18 text-white font-bold text-sm inline-flex items-center justify-center gap-1.5 transition-transform active:scale-[0.97] cursor-pointer"
          >
            <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <div className="min-h-12 px-3 rounded-2xl bg-[#14202c] border border-[#fbbf24]/30 flex items-center gap-1.5 text-sm font-extrabold text-[#fbbf24] tabular-nums">
            <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{save.coins}</span>
          </div>
        </div>
      </header>

      <div
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        className="flex-1 w-full max-w-[min(100%,58rem)] mx-auto safe-scroll pt-1"
      >
        <div className="grid grid-cols-1 md:grid-cols-[minmax(14.5rem,19.5rem)_1fr] gap-3.5 items-start">
          {/* Live Arena Combo Preview Panel */}
          <section
            aria-label="Live Arena Combo Preview"
            className="rounded-2xl bg-[#14202c]/95 border border-white/14 p-3.5 shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#b8c7d3]">
                Live Arena Preview
              </div>
              <button
                type="button"
                onClick={() => setShowBumpers((v) => !v)}
                aria-pressed={showBumpers}
                className={`min-h-9 px-2.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  showBumpers
                    ? 'bg-white/18 border-white/35 text-white'
                    : 'bg-white/8 border-white/12 text-[#b8c7d3] hover:text-white'
                }`}
              >
                {showBumpers ? 'Bumpers: On' : 'Bumpers: Off'}
              </button>
            </div>

            <div className="rounded-2xl bg-[#0b131c] border border-white/10 p-2.5">
              <LiveArenaPreview
                tableSkinId={previewTableId}
                puckSkinId={previewPuckId}
                malletSkinId={previewMalletId}
                reduceMotion={save.settings.reduceMotion}
                showBumpers={showBumpers}
              />
            </div>

            <div className="text-center space-y-0.5">
              <div className="text-xs font-bold text-white truncate">
                {previewTableSkin.name} · {previewPuckSkin.name} · {previewMalletSkin.name}
              </div>
              <div className="text-[11px] font-semibold text-[#b8c7d3]">
                {isPreviewDirty ? 'Previewing custom combo' : 'Showing equipped loadout'}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {renderContextualAction()}
              {isPreviewDirty && (
                <button
                  type="button"
                  onClick={resetPreviewToEquipped}
                  className="min-h-12 px-3 rounded-xl bg-white/10 border border-white/14 hover:bg-white/16 text-[#e2ebf2] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-transform active:scale-[0.97] cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Reset to Equipped</span>
                </button>
              )}
            </div>
          </section>

          {/* Store Catalog Panel */}
          <section
            aria-label="Skin Catalog"
            className="rounded-2xl bg-[#14202c]/95 border border-white/14 p-3.5 shadow-lg space-y-3"
          >
            {/* Category Tabs */}
            <div className="grid grid-cols-3 gap-2">
              {(['table', 'puck', 'mallet'] as SkinCategory[]).map((cat) => {
                const selected = activeTab === cat;
                const label = cat === 'table' ? 'Table' : cat === 'puck' ? 'Puck' : 'Mallet';
                const count = Object.keys(SKINS[cat]).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveTab(cat)}
                    aria-pressed={selected}
                    className={`min-h-12 px-2 rounded-xl font-display font-extrabold text-sm sm:text-base border transition-transform active:scale-[0.97] cursor-pointer flex items-center justify-center gap-1.5 ${
                      selected
                        ? 'bg-white text-[#101922] border-[#f0452d] ring-2 ring-[#f0452d]/60'
                        : 'bg-[#0e1720] text-[#cbd8e2] border-white/12 hover:bg-[#1a2836] hover:text-white'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        selected ? 'text-[#101922]/70' : 'text-[#b8c7d3]'
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filter Segments */}
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'unlocked', 'locked'] as FilterMode[]).map((f) => {
                const active = filterMode === f;
                const label = f === 'all' ? 'All' : f === 'unlocked' ? 'Unlocked' : 'Locked';
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilterMode(f)}
                    aria-pressed={active}
                    className={`min-h-11 px-2 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                      active
                        ? 'bg-[#2459d6] text-white border-white/25'
                        : 'bg-white/8 text-[#b8c7d3] border-white/10 hover:bg-white/14 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Skin Grid */}
            {categoryItems.length === 0 ? (
              <div className="rounded-xl bg-[#0e1720] border border-white/10 p-6 text-center text-sm text-[#b8c7d3]">
                No skins match this filter yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {categoryItems.map((skin) => {
                  const unlocked = isSkinUnlocked(save, activeTab, skin.id);
                  const equipped = skin.id === activeEquippedId;
                  const previewing = skin.id === activePreviewId;
                  const req = !unlocked ? formatCompactRequirement(activeTab, skin.id) : '';

                  return (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => handleCardSelect(activeTab, skin.id)}
                      aria-pressed={previewing}
                      className={`relative min-h-[7.25rem] p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-transform active:scale-[0.97] cursor-pointer ${
                        previewing
                          ? 'bg-white text-[#101922] border-2 border-[#f0452d] ring-2 ring-white shadow-lg'
                          : unlocked
                            ? 'bg-[#1c2b3b] text-white border-white/15 hover:bg-[#24364a] hover:border-white/30'
                            : 'bg-[#101922]/75 text-white/85 border-white/10 hover:bg-[#182532]'
                      }`}
                    >
                      {equipped && (
                        <span
                          title="Equipped"
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#10b981] text-white inline-flex items-center justify-center shadow"
                          aria-label="Equipped"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      )}
                      {!unlocked && (
                        <span
                          className={`absolute top-2 right-2 ${
                            previewing ? 'text-[#101922]/70' : 'text-[#b8c7d3]'
                          }`}
                          aria-hidden="true"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}

                      <div className={!unlocked ? 'opacity-80' : ''}>
                        {activeTab === 'table' && <TablePreview skin={skin as TableSkin} />}
                        {activeTab === 'puck' && <PuckPreview skin={skin as PuckSkin} />}
                        {activeTab === 'mallet' && <MalletPreview skin={skin as MalletSkin} />}
                      </div>

                      <span className="text-xs sm:text-sm font-bold text-center leading-tight line-clamp-2">
                        {skin.name}
                      </span>

                      {equipped ? (
                        <span
                          className={`text-[11px] font-extrabold leading-tight ${
                            previewing ? 'text-[#059669]' : 'text-[#34d399]'
                          }`}
                        >
                          Equipped
                        </span>
                      ) : !unlocked ? (
                        <span
                          className={`text-[11px] font-semibold text-center leading-tight ${
                            previewing ? 'text-[#b45309]' : 'text-[#fbbf24]'
                          }`}
                        >
                          {req}
                        </span>
                      ) : (
                        <span
                          className={`text-[11px] font-semibold leading-tight ${
                            previewing ? 'text-[#101922]/70' : 'text-[#b8c7d3]'
                          }`}
                        >
                          Tap Equip
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {pendingBuy && (
        <ConfirmDialog
          title={`Unlock ${pendingBuy.name}?`}
          message={`Spend ${pendingBuy.price} coins to unlock and equip this skin.`}
          confirmLabel={`Buy for ${pendingBuy.price} coins`}
          destructive={false}
          onConfirm={() => {
            const res = onSelectOrBuy(pendingBuy.category, pendingBuy.id);
            if (res.ok) {
              setPreviewIdFor(pendingBuy.category, pendingBuy.id);
            }
            setPendingBuy(null);
          }}
          onCancel={() => setPendingBuy(null)}
        />
      )}
    </div>
  );
};
