import { TableShape } from './skins';

export interface Point2D {
  x: number;
  y: number;
}

export interface WallSegment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  nx: number;
  ny: number;
  len: number;
}

export interface CornerArc {
  cx: number;
  cy: number;
  r: number;
  startAngle: number;
  endAngle: number;
  sweep: number;
}

export interface TableGeometry {
  shape: TableShape;
  W: number;
  H: number;
  wallThickness: number;
  goalX1: number;
  goalX2: number;
  wallSegments: WallSegment[];
  cornerArcs: CornerArc[];
  convexVertices: Point2D[];
  polygonPoints: Point2D[];
  innerPolygonPoints: Point2D[];
  xBoundsAtY: (y: number) => { minX: number; maxX: number };
  clampMalletPosition: (
    x: number,
    y: number,
    radius: number,
    isTopHalf: boolean,
    allowFullTable?: boolean
  ) => Point2D;
}

const TAU = Math.PI * 2;
const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

function makeSegment(ax: number, ay: number, bx: number, by: number): WallSegment {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len <= 0.0001) {
    return { ax, ay, bx, by, nx: 0, ny: 1, len: 0 };
  }
  // Clockwise perimeter in screen coords (+x right, +y down):
  // Left-hand normal (-dy, dx) points inward into the table interior.
  return {
    ax,
    ay,
    bx,
    by,
    nx: -dy / len,
    ny: dx / len,
    len,
  };
}

export function isAngleInArc(angle: number, startAngle: number, sweep: number): boolean {
  let diff = (angle - startAngle) % TAU;
  if (diff < 0) diff += TAU;
  return diff <= sweep + 0.015 || TAU - diff <= 0.015;
}

function sampleArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  sweep: number,
  steps: number,
  out: Point2D[],
  includeEndpoints = true
): void {
  const startIdx = includeEndpoints ? 0 : 1;
  const endIdx = includeEndpoints ? steps : steps - 1;
  for (let i = startIdx; i <= endIdx; i++) {
    const a = startAngle + (sweep * i) / steps;
    out.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
    });
  }
}

interface FilletedPolySpec {
  vertices: Point2D[];
  radii: number[];
  topEdgeIdx: number;
  bottomEdgeIdx: number;
}

function buildFromFilletedPolygon(
  spec: FilletedPolySpec,
  wall: number,
  gx1: number,
  gx2: number
): {
  wallSegments: WallSegment[];
  cornerArcs: CornerArc[];
  convexVertices: Point2D[];
  polygonPoints: Point2D[];
  innerPolygonPoints: Point2D[];
} {
  const { vertices, radii, topEdgeIdx, bottomEdgeIdx } = spec;
  const n = vertices.length;
  const starts: Point2D[] = [];
  const ends: Point2D[] = [];
  const cornerArcs: CornerArc[] = [];
  const convexVertices: Point2D[] = [];
  const cornerInfo: Array<{
    cx: number;
    cy: number;
    r: number;
    a1: number;
    sweep: number;
    isReflex: boolean;
  }> = [];

  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];
    const r = radii[i];

    const inX = prev.x - curr.x;
    const inY = prev.y - curr.y;
    const inLen = Math.hypot(inX, inY) || 1;
    const uxIn = inX / inLen;
    const uyIn = inY / inLen;

    const outX = next.x - curr.x;
    const outY = next.y - curr.y;
    const outLen = Math.hypot(outX, outY) || 1;
    const uxOut = outX / outLen;
    const uyOut = outY / outLen;

    const dot = clamp(uxIn * uxOut + uyIn * uyOut, -0.9999, 0.9999);
    const theta = Math.acos(dot);
    const half = theta * 0.5;
    const trim = r / Math.tan(half);

    const t1: Point2D = { x: curr.x + uxIn * trim, y: curr.y + uyIn * trim };
    const t2: Point2D = { x: curr.x + uxOut * trim, y: curr.y + uyOut * trim };
    starts.push(t1);
    ends.push(t2);

    const bisX = uxIn + uxOut;
    const bisY = uyIn + uyOut;
    const bisLen = Math.hypot(bisX, bisY) || 1;
    const distC = r / Math.sin(half);
    const cx = curr.x + (bisX / bisLen) * distC;
    const cy = curr.y + (bisY / bisLen) * distC;

    // For clockwise screen-space perimeter (+x right, +y down):
    // cross < 0 indicates convex interior corner; cross > 0 indicates reflex (inward-protruding) vertex.
    const cross = uxIn * uyOut - uyIn * uxOut;
    const isReflex = cross > 0;

    const a1 = Math.atan2(t1.y - cy, t1.x - cx);
    const a2 = Math.atan2(t2.y - cy, t2.x - cx);

    if (isReflex) {
      let sweep = (a2 - a1) % TAU;
      if (sweep > 0) sweep -= TAU;
      if (sweep < -Math.PI) sweep += TAU;
      cornerInfo.push({ cx, cy, r, a1, sweep, isReflex: true });
    } else {
      let sweep = (a2 - a1) % TAU;
      if (sweep < 0) sweep += TAU;
      cornerArcs.push({
        cx,
        cy,
        r,
        startAngle: a1,
        endAngle: a1 + sweep,
        sweep,
      });
      cornerInfo.push({ cx, cy, r, a1, sweep, isReflex: false });
    }
  }

  const wallSegments: WallSegment[] = [];
  const polygonPoints: Point2D[] = [];
  const innerPolygonPoints: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const arc = cornerInfo[i];
    const arcSteps = Math.max(6, Math.round((Math.abs(arc.sweep) / (Math.PI * 0.5)) * 10));

    if (arc.isReflex) {
      const reflexPts: Point2D[] = [];
      sampleArc(arc.cx, arc.cy, arc.r, arc.a1, arc.sweep, arcSteps, reflexPts, true);
      for (let k = 0; k < reflexPts.length; k++) {
        innerPolygonPoints.push(reflexPts[k]);
        if (k > 0 && k < reflexPts.length - 1) {
          convexVertices.push(reflexPts[k]);
        }
        if (k < reflexPts.length - 1) {
          const seg = makeSegment(
            reflexPts[k].x,
            reflexPts[k].y,
            reflexPts[k + 1].x,
            reflexPts[k + 1].y
          );
          if (seg.len > 0.25) wallSegments.push(seg);
        }
      }
      sampleArc(
        arc.cx,
        arc.cy,
        Math.max(2, arc.r - wall),
        arc.a1,
        arc.sweep,
        arcSteps,
        polygonPoints,
        true
      );
    } else {
      sampleArc(arc.cx, arc.cy, arc.r, arc.a1, arc.sweep, arcSteps, innerPolygonPoints, true);
      sampleArc(arc.cx, arc.cy, arc.r + wall, arc.a1, arc.sweep, arcSteps, polygonPoints, true);
    }

    const nextIdx = (i + 1) % n;
    const pStart = ends[i];
    const pEnd = starts[nextIdx];

    if (i === topEdgeIdx) {
      if (gx1 > pStart.x + 0.5) {
        wallSegments.push(makeSegment(pStart.x, pStart.y, gx1, pStart.y));
      }
      if (pEnd.x > gx2 + 0.5) {
        wallSegments.push(makeSegment(gx2, pEnd.y, pEnd.x, pEnd.y));
      }
    } else if (i === bottomEdgeIdx) {
      if (pStart.x > gx2 + 0.5) {
        wallSegments.push(makeSegment(pStart.x, pStart.y, gx2, pStart.y));
      }
      if (gx1 > pEnd.x + 0.5) {
        wallSegments.push(makeSegment(gx1, pEnd.y, pEnd.x, pEnd.y));
      }
    } else {
      const seg = makeSegment(pStart.x, pStart.y, pEnd.x, pEnd.y);
      if (seg.len > 0.5) wallSegments.push(seg);
    }
  }

  return { wallSegments, cornerArcs, convexVertices, polygonPoints, innerPolygonPoints };
}

function buildHourglassGeometry(
  W: number,
  H: number,
  wall: number,
  gx1: number,
  gx2: number
): {
  wallSegments: WallSegment[];
  cornerArcs: CornerArc[];
  convexVertices: Point2D[];
  polygonPoints: Point2D[];
  innerPolygonPoints: Point2D[];
} {
  const cornerR = 28;
  const waistInset = 34; // inner x at y = H/2
  const innerL = wall;
  const innerR = W - wall;
  const innerT = wall;
  const innerB = H - wall;
  const yStart = innerT + cornerR;
  const yEnd = innerB - cornerR;
  const ySpan = yEnd - yStart;
  const waistDepth = waistInset - innerL;

  const cornerArcs: CornerArc[] = [
    {
      cx: innerL + cornerR,
      cy: innerT + cornerR,
      r: cornerR,
      startAngle: Math.PI,
      endAngle: Math.PI * 1.5,
      sweep: Math.PI * 0.5,
    },
    {
      cx: innerR - cornerR,
      cy: innerT + cornerR,
      r: cornerR,
      startAngle: Math.PI * 1.5,
      endAngle: TAU,
      sweep: Math.PI * 0.5,
    },
    {
      cx: innerR - cornerR,
      cy: innerB - cornerR,
      r: cornerR,
      startAngle: 0,
      endAngle: Math.PI * 0.5,
      sweep: Math.PI * 0.5,
    },
    {
      cx: innerL + cornerR,
      cy: innerB - cornerR,
      r: cornerR,
      startAngle: Math.PI * 0.5,
      endAngle: Math.PI,
      sweep: Math.PI * 0.5,
    },
  ];

  const wallSegments: WallSegment[] = [];
  if (gx1 > innerL + cornerR + 0.5) {
    wallSegments.push(makeSegment(innerL + cornerR, innerT, gx1, innerT));
  }
  if (innerR - cornerR > gx2 + 0.5) {
    wallSegments.push(makeSegment(gx2, innerT, innerR - cornerR, innerT));
  }
  if (innerR - cornerR > gx2 + 0.5) {
    wallSegments.push(makeSegment(innerR - cornerR, innerB, gx2, innerB));
  }
  if (gx1 > innerL + cornerR + 0.5) {
    wallSegments.push(makeSegment(gx1, innerB, innerL + cornerR, innerB));
  }

  const stepsPerSide = 14;
  const rightPts: Point2D[] = [];
  const rightOuterPts: Point2D[] = [];
  const leftPts: Point2D[] = [];
  const leftOuterPts: Point2D[] = [];
  const convexVertices: Point2D[] = [];

  for (let i = 0; i <= stepsPerSide; i++) {
    const u = i / stepsPerSide;
    const y = yStart + u * ySpan;
    const offset = waistDepth * 0.5 * (1 - Math.cos(TAU * u));
    const dxdu = waistDepth * Math.PI * Math.sin(TAU * u);
    const dydy = ySpan;
    const tLen = Math.hypot(dxdu, dydy) || 1;
    const outLx = -dydy / tLen;
    const outLy = dxdu / tLen;

    const lx = innerL + offset;
    const rx = innerR - offset;

    leftPts.push({ x: lx, y });
    leftOuterPts.push({ x: lx + outLx * wall, y: y + outLy * wall });

    rightPts.push({ x: rx, y });
    rightOuterPts.push({ x: rx - outLx * wall, y: y + outLy * wall });

    if (i > 0 && i < stepsPerSide) {
      convexVertices.push({ x: lx, y }, { x: rx, y });
    }
  }

  // Right side wall segments go top-to-bottom (clockwise)
  for (let i = 0; i < stepsPerSide; i++) {
    wallSegments.push(
      makeSegment(rightPts[i].x, rightPts[i].y, rightPts[i + 1].x, rightPts[i + 1].y)
    );
  }
  // Left side wall segments go bottom-to-top (clockwise)
  for (let i = stepsPerSide; i > 0; i--) {
    wallSegments.push(
      makeSegment(leftPts[i].x, leftPts[i].y, leftPts[i - 1].x, leftPts[i - 1].y)
    );
  }

  const innerPolygonPoints: Point2D[] = [];
  const polygonPoints: Point2D[] = [];

  sampleArc(cornerArcs[0].cx, cornerArcs[0].cy, cornerR, cornerArcs[0].startAngle, cornerArcs[0].sweep, 8, innerPolygonPoints, true);
  sampleArc(cornerArcs[0].cx, cornerArcs[0].cy, cornerR + wall, cornerArcs[0].startAngle, cornerArcs[0].sweep, 8, polygonPoints, true);

  sampleArc(cornerArcs[1].cx, cornerArcs[1].cy, cornerR, cornerArcs[1].startAngle, cornerArcs[1].sweep, 8, innerPolygonPoints, true);
  sampleArc(cornerArcs[1].cx, cornerArcs[1].cy, cornerR + wall, cornerArcs[1].startAngle, cornerArcs[1].sweep, 8, polygonPoints, true);

  for (let i = 1; i < rightPts.length - 1; i++) {
    innerPolygonPoints.push(rightPts[i]);
    polygonPoints.push(rightOuterPts[i]);
  }

  sampleArc(cornerArcs[2].cx, cornerArcs[2].cy, cornerR, cornerArcs[2].startAngle, cornerArcs[2].sweep, 8, innerPolygonPoints, true);
  sampleArc(cornerArcs[2].cx, cornerArcs[2].cy, cornerR + wall, cornerArcs[2].startAngle, cornerArcs[2].sweep, 8, polygonPoints, true);

  sampleArc(cornerArcs[3].cx, cornerArcs[3].cy, cornerR, cornerArcs[3].startAngle, cornerArcs[3].sweep, 8, innerPolygonPoints, true);
  sampleArc(cornerArcs[3].cx, cornerArcs[3].cy, cornerR + wall, cornerArcs[3].startAngle, cornerArcs[3].sweep, 8, polygonPoints, true);

  for (let i = leftPts.length - 2; i >= 1; i--) {
    innerPolygonPoints.push(leftPts[i]);
    polygonPoints.push(leftOuterPts[i]);
  }

  return { wallSegments, cornerArcs, convexVertices, polygonPoints, innerPolygonPoints };
}

function buildCapsulePillGeometry(
  W: number,
  H: number,
  wall: number,
  gx1: number,
  gx2: number
): {
  wallSegments: WallSegment[];
  cornerArcs: CornerArc[];
  convexVertices: Point2D[];
  polygonPoints: Point2D[];
  innerPolygonPoints: Point2D[];
} {
  const bowDepth = 20;
  const sideL = wall + bowDepth;
  const sideR = W - wall - bowDepth;
  const innerT = wall;
  const innerB = H - wall;
  const endR = Math.max(24, Math.min(94, gx1 - sideL - 2, H * 0.28));

  const yStart = innerT + endR;
  const yEnd = innerB - endR;
  const ySpan = Math.max(10, yEnd - yStart);

  const cornerArcs: CornerArc[] = [
    {
      cx: sideL + endR,
      cy: innerT + endR,
      r: endR,
      startAngle: Math.PI,
      endAngle: Math.PI * 1.5,
      sweep: Math.PI * 0.5,
    },
    {
      cx: sideR - endR,
      cy: innerT + endR,
      r: endR,
      startAngle: Math.PI * 1.5,
      endAngle: TAU,
      sweep: Math.PI * 0.5,
    },
    {
      cx: sideR - endR,
      cy: innerB - endR,
      r: endR,
      startAngle: 0,
      endAngle: Math.PI * 0.5,
      sweep: Math.PI * 0.5,
    },
    {
      cx: sideL + endR,
      cy: innerB - endR,
      r: endR,
      startAngle: Math.PI * 0.5,
      endAngle: Math.PI,
      sweep: Math.PI * 0.5,
    },
  ];

  const wallSegments: WallSegment[] = [];
  if (gx1 > sideL + endR + 0.5) {
    wallSegments.push(makeSegment(sideL + endR, innerT, gx1, innerT));
  }
  if (sideR - endR > gx2 + 0.5) {
    wallSegments.push(makeSegment(gx2, innerT, sideR - endR, innerT));
  }
  if (sideR - endR > gx2 + 0.5) {
    wallSegments.push(makeSegment(sideR - endR, innerB, gx2, innerB));
  }
  if (gx1 > sideL + endR + 0.5) {
    wallSegments.push(makeSegment(gx1, innerB, sideL + endR, innerB));
  }

  const stepsPerSide = 16;
  const rightPts: Point2D[] = [];
  const rightOuterPts: Point2D[] = [];
  const leftPts: Point2D[] = [];
  const leftOuterPts: Point2D[] = [];
  const convexVertices: Point2D[] = [];

  for (let i = 0; i <= stepsPerSide; i++) {
    const u = i / stepsPerSide;
    const y = yStart + u * ySpan;
    const offset = bowDepth * 0.5 * (1 - Math.cos(TAU * u));
    const dxduLeft = -bowDepth * Math.PI * Math.sin(TAU * u);
    const dydy = ySpan;
    const tLen = Math.hypot(dxduLeft, dydy) || 1;
    const outLx = -dydy / tLen;
    const outLy = dxduLeft / tLen;

    const lx = sideL - offset;
    const rx = sideR + offset;

    leftPts.push({ x: lx, y });
    leftOuterPts.push({ x: lx + outLx * wall, y: y + outLy * wall });

    rightPts.push({ x: rx, y });
    rightOuterPts.push({ x: rx - outLx * wall, y: y + outLy * wall });

    if (i > 0 && i < stepsPerSide) {
      convexVertices.push({ x: lx, y }, { x: rx, y });
    }
  }

  for (let i = 0; i < stepsPerSide; i++) {
    wallSegments.push(
      makeSegment(rightPts[i].x, rightPts[i].y, rightPts[i + 1].x, rightPts[i + 1].y)
    );
  }
  for (let i = stepsPerSide; i > 0; i--) {
    wallSegments.push(
      makeSegment(leftPts[i].x, leftPts[i].y, leftPts[i - 1].x, leftPts[i - 1].y)
    );
  }

  const innerPolygonPoints: Point2D[] = [];
  const polygonPoints: Point2D[] = [];

  sampleArc(cornerArcs[0].cx, cornerArcs[0].cy, endR, cornerArcs[0].startAngle, cornerArcs[0].sweep, 14, innerPolygonPoints, true);
  sampleArc(cornerArcs[0].cx, cornerArcs[0].cy, endR + wall, cornerArcs[0].startAngle, cornerArcs[0].sweep, 14, polygonPoints, true);

  sampleArc(cornerArcs[1].cx, cornerArcs[1].cy, endR, cornerArcs[1].startAngle, cornerArcs[1].sweep, 14, innerPolygonPoints, true);
  sampleArc(cornerArcs[1].cx, cornerArcs[1].cy, endR + wall, cornerArcs[1].startAngle, cornerArcs[1].sweep, 14, polygonPoints, true);

  for (let i = 1; i < rightPts.length - 1; i++) {
    innerPolygonPoints.push(rightPts[i]);
    polygonPoints.push(rightOuterPts[i]);
  }

  sampleArc(cornerArcs[2].cx, cornerArcs[2].cy, endR, cornerArcs[2].startAngle, cornerArcs[2].sweep, 14, innerPolygonPoints, true);
  sampleArc(cornerArcs[2].cx, cornerArcs[2].cy, endR + wall, cornerArcs[2].startAngle, cornerArcs[2].sweep, 14, polygonPoints, true);

  sampleArc(cornerArcs[3].cx, cornerArcs[3].cy, endR, cornerArcs[3].startAngle, cornerArcs[3].sweep, 14, innerPolygonPoints, true);
  sampleArc(cornerArcs[3].cx, cornerArcs[3].cy, endR + wall, cornerArcs[3].startAngle, cornerArcs[3].sweep, 14, polygonPoints, true);

  for (let i = leftPts.length - 2; i >= 1; i--) {
    innerPolygonPoints.push(leftPts[i]);
    polygonPoints.push(leftOuterPts[i]);
  }

  return { wallSegments, cornerArcs, convexVertices, polygonPoints, innerPolygonPoints };
}

function computeXBoundsAtY(poly: Point2D[], y: number, W: number, wall: number): { minX: number; maxX: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  const n = poly.length;

  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    if ((a.y <= y && b.y >= y) || (b.y <= y && a.y >= y)) {
      if (Math.abs(b.y - a.y) < 0.0001) {
        if (Math.abs(y - a.y) < 0.0001) {
          if (a.x < minX) minX = a.x;
          if (a.x > maxX) maxX = a.x;
          if (b.x < minX) minX = b.x;
          if (b.x > maxX) maxX = b.x;
        }
      } else {
        const t = (y - a.y) / (b.y - a.y);
        const x = a.x + t * (b.x - a.x);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return { minX: wall, maxX: W - wall };
  }
  return { minX, maxX };
}

export function tracePolygonPath(
  ctx: CanvasRenderingContext2D | Path2D,
  points: Point2D[]
): void {
  if (points.length === 0) return;
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

export function buildTableGeometry(
  shape: TableShape,
  W: number,
  H: number,
  goalWidth: number,
  wallThickness = 6
): TableGeometry {
  const wall = wallThickness;
  const gx1 = (W - goalWidth) * 0.5;
  const gx2 = gx1 + goalWidth;
  const innerL = wall;
  const innerR = W - wall;
  const innerT = wall;
  const innerB = H - wall;

  let wallSegments: WallSegment[] = [];
  let cornerArcs: CornerArc[] = [];
  let convexVertices: Point2D[] = [];
  let polygonPoints: Point2D[] = [];
  let innerPolygonPoints: Point2D[] = [];

  if (shape === 'classic_rect') {
    const r = Math.min(34, (W - goalWidth) * 0.5 - wall - 1, H * 0.25);
    const built = buildFromFilletedPolygon(
      {
        vertices: [
          { x: innerL, y: innerT },
          { x: innerR, y: innerT },
          { x: innerR, y: innerB },
          { x: innerL, y: innerB },
        ],
        radii: [r, r, r, r],
        topEdgeIdx: 0,
        bottomEdgeIdx: 2,
      },
      wall,
      gx1,
      gx2
    );
    wallSegments = built.wallSegments;
    cornerArcs = built.cornerArcs;
    convexVertices = built.convexVertices;
    polygonPoints = built.polygonPoints;
    innerPolygonPoints = built.innerPolygonPoints;
  } else if (shape === 'stadium_oval') {
    const r = Math.min(110, (W - goalWidth) * 0.5 - wall - 2, H * 0.36);
    const built = buildFromFilletedPolygon(
      {
        vertices: [
          { x: innerL, y: innerT },
          { x: innerR, y: innerT },
          { x: innerR, y: innerB },
          { x: innerL, y: innerB },
        ],
        radii: [r, r, r, r],
        topEdgeIdx: 0,
        bottomEdgeIdx: 2,
      },
      wall,
      gx1,
      gx2
    );
    wallSegments = built.wallSegments;
    cornerArcs = built.cornerArcs;
    convexVertices = built.convexVertices;
    polygonPoints = built.polygonPoints;
    innerPolygonPoints = built.innerPolygonPoints;
  } else if (shape === 'octagon_arena') {
    const cut = Math.min(78, (W - goalWidth) * 0.5 - wall - 8, H * 0.25);
    const fillet = 24;
    const built = buildFromFilletedPolygon(
      {
        vertices: [
          { x: innerL + cut, y: innerT },
          { x: innerR - cut, y: innerT },
          { x: innerR, y: innerT + cut },
          { x: innerR, y: innerB - cut },
          { x: innerR - cut, y: innerB },
          { x: innerL + cut, y: innerB },
          { x: innerL, y: innerB - cut },
          { x: innerL, y: innerT + cut },
        ],
        radii: [fillet, fillet, fillet, fillet, fillet, fillet, fillet, fillet],
        topEdgeIdx: 0,
        bottomEdgeIdx: 4,
      },
      wall,
      gx1,
      gx2
    );
    wallSegments = built.wallSegments;
    cornerArcs = built.cornerArcs;
    convexVertices = built.convexVertices;
    polygonPoints = built.polygonPoints;
    innerPolygonPoints = built.innerPolygonPoints;
  } else if (shape === 'hex_diamond') {
    const taper = Math.min(44, (W - goalWidth) * 0.5 - wall - 28);
    const cornerFillet = 26;
    const midFillet = 28;
    const built = buildFromFilletedPolygon(
      {
        vertices: [
          { x: innerL + taper, y: innerT },
          { x: innerR - taper, y: innerT },
          { x: innerR, y: H * 0.5 },
          { x: innerR - taper, y: innerB },
          { x: innerL + taper, y: innerB },
          { x: innerL, y: H * 0.5 },
        ],
        radii: [cornerFillet, cornerFillet, midFillet, cornerFillet, cornerFillet, midFillet],
        topEdgeIdx: 0,
        bottomEdgeIdx: 3,
      },
      wall,
      gx1,
      gx2
    );
    wallSegments = built.wallSegments;
    cornerArcs = built.cornerArcs;
    convexVertices = built.convexVertices;
    polygonPoints = built.polygonPoints;
    innerPolygonPoints = built.innerPolygonPoints;
  } else if (shape === 'chamfer_shield') {
    const cornerCut = Math.min(34, (W - goalWidth) * 0.5 - wall - 14);
    const shoulderY = Math.max(cornerCut + 26, H * 0.22);
    const waistInset = 24;
    const endFillet = 18;
    const shoulderFillet = 22;
    const waistFillet = Math.max(wall + 10, 34);
    const built = buildFromFilletedPolygon(
      {
        vertices: [
          { x: innerL + cornerCut, y: innerT },
          { x: innerR - cornerCut, y: innerT },
          { x: innerR, y: innerT + shoulderY },
          { x: innerR - waistInset, y: H * 0.5 },
          { x: innerR, y: innerB - shoulderY },
          { x: innerR - cornerCut, y: innerB },
          { x: innerL + cornerCut, y: innerB },
          { x: innerL, y: innerB - shoulderY },
          { x: innerL + waistInset, y: H * 0.5 },
          { x: innerL, y: innerT + shoulderY },
        ],
        radii: [
          endFillet,
          endFillet,
          shoulderFillet,
          waistFillet,
          shoulderFillet,
          endFillet,
          endFillet,
          shoulderFillet,
          waistFillet,
          shoulderFillet,
        ],
        topEdgeIdx: 0,
        bottomEdgeIdx: 5,
      },
      wall,
      gx1,
      gx2
    );
    wallSegments = built.wallSegments;
    cornerArcs = built.cornerArcs;
    convexVertices = built.convexVertices;
    polygonPoints = built.polygonPoints;
    innerPolygonPoints = built.innerPolygonPoints;
  } else if (shape === 'capsule_pill') {
    const built = buildCapsulePillGeometry(W, H, wall, gx1, gx2);
    wallSegments = built.wallSegments;
    cornerArcs = built.cornerArcs;
    convexVertices = built.convexVertices;
    polygonPoints = built.polygonPoints;
    innerPolygonPoints = built.innerPolygonPoints;
  } else {
    const built = buildHourglassGeometry(W, H, wall, gx1, gx2);
    wallSegments = built.wallSegments;
    cornerArcs = built.cornerArcs;
    convexVertices = built.convexVertices;
    polygonPoints = built.polygonPoints;
    innerPolygonPoints = built.innerPolygonPoints;
  }

  const xBoundsAtY = (y: number) => computeXBoundsAtY(innerPolygonPoints, y, W, wall);

  const clampMalletPosition = (
    x: number,
    y: number,
    radius: number,
    isTopHalf: boolean,
    allowFullTable = false
  ): Point2D => {
    const y0 = allowFullTable ? wall + radius : isTopHalf ? wall + radius : H * 0.5 + radius;
    const y1 = allowFullTable ? H - wall - radius : isTopHalf ? H * 0.5 - radius : H - wall - radius;

    let mx = x;
    let my = clamp(y, y0, y1);

    const bounds0 = xBoundsAtY(my);
    const minX0 = bounds0.minX + radius;
    const maxX0 = bounds0.maxX - radius;
    if (minX0 > maxX0) {
      mx = (bounds0.minX + bounds0.maxX) * 0.5;
    } else {
      mx = clamp(mx, minX0, maxX0);
    }

    // Two projection passes guarantee smooth sliding along angled & curved rails
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < wallSegments.length; i++) {
        const s = wallSegments[i];
        if (s.len <= 0.001) continue;
        const ux = (s.bx - s.ax) / s.len;
        const uy = (s.by - s.ay) / s.len;
        const proj = (mx - s.ax) * ux + (my - s.ay) * uy;
        if (proj >= 0 && proj <= s.len) {
          const signedD = (mx - s.ax) * s.nx + (my - s.ay) * s.ny;
          if (signedD < radius && signedD > -radius * 3) {
            const push = radius - signedD;
            mx += s.nx * push;
            my += s.ny * push;
          }
        }
      }

      for (let i = 0; i < cornerArcs.length; i++) {
        const arc = cornerArcs[i];
        const maxD = Math.max(0, arc.r - radius);
        const dx = mx - arc.cx;
        const dy = my - arc.cy;
        const d = Math.hypot(dx, dy);
        if (d > maxD && d > 0.001) {
          const ang = Math.atan2(dy, dx);
          if (isAngleInArc(ang, arc.startAngle, arc.sweep)) {
            mx = arc.cx + (dx / d) * maxD;
            my = arc.cy + (dy / d) * maxD;
          }
        }
      }

      for (let i = 0; i < convexVertices.length; i++) {
        const v = convexVertices[i];
        const dx = mx - v.x;
        const dy = my - v.y;
        const d = Math.hypot(dx, dy);
        if (d < radius && d > 0.001) {
          mx = v.x + (dx / d) * radius;
          my = v.y + (dy / d) * radius;
        }
      }

      my = clamp(my, y0, y1);
      const bounds1 = xBoundsAtY(my);
      const minX1 = bounds1.minX + radius;
      const maxX1 = bounds1.maxX - radius;
      if (minX1 > maxX1) {
        mx = (bounds1.minX + bounds1.maxX) * 0.5;
      } else {
        mx = clamp(mx, minX1, maxX1);
      }
    }

    return { x: mx, y: my };
  };

  return {
    shape,
    W,
    H,
    wallThickness: wall,
    goalX1: gx1,
    goalX2: gx2,
    wallSegments,
    cornerArcs,
    convexVertices,
    polygonPoints,
    innerPolygonPoints,
    xBoundsAtY,
    clampMalletPosition,
  };
}
