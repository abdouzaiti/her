import type { RibbonSide } from '../types/telegram';

export interface Vec2 {
  x: number;
  y: number;
}

export interface SpinePoint {
  x: number;
  y: number;
  halfWidth: number;
}

export interface RibbonMesh {
  bodyPath: string;
  sheenPath: string;
  secondarySheenPath: string;
  coreShadowPath: string;
  edgeTopPath: string;
  edgeBottomPath: string;
  pleatHighlightPaths: string[];
  pleatShadowPaths: string[];
  tip: Vec2;
}

export type WrapArmKey = 'top' | 'bottom' | 'left' | 'right';

export interface WrapArmState {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface WrapArmDrags {
  top: Vec2;
  bottom: Vec2;
  left: Vec2;
  right: Vec2;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function cubicBezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

export function sampleBezierSpine(
  segments: Array<{ p0: Vec2; p1: Vec2; p2: Vec2; p3: Vec2; wStart: number; wEnd: number }>,
  samplesPerSegment = 20
): SpinePoint[] {
  const pts: SpinePoint[] = [];
  segments.forEach((seg, segIdx) => {
    const startIdx = segIdx === 0 ? 0 : 1;
    for (let i = startIdx; i <= samplesPerSegment; i++) {
      const t = i / samplesPerSegment;
      const pos = cubicBezier(seg.p0, seg.p1, seg.p2, seg.p3, t);
      pts.push({
        x: pos.x,
        y: pos.y,
        halfWidth: lerp(seg.wStart, seg.wEnd, t),
      });
    }
  });
  return pts;
}

const EMPTY_RIBBON_MESH: RibbonMesh = {
  bodyPath: '',
  sheenPath: '',
  secondarySheenPath: '',
  coreShadowPath: '',
  edgeTopPath: '',
  edgeBottomPath: '',
  pleatHighlightPaths: [],
  pleatShadowPaths: [],
  tip: { x: 0, y: 0 },
};

export function buildRibbonMesh(
  spine: SpinePoint[],
  options: {
    swallowtailDepth?: number;
    startSwallowtailDepth?: number;
    sheenRatio?: number;
    pleats?: 'fromStart' | 'fromEnd' | 'none';
    pleatReach?: number;
  } = {}
): RibbonMesh {
  const {
    swallowtailDepth = 0,
    startSwallowtailDepth = 0,
    sheenRatio = 0.34,
    pleats = 'none',
    pleatReach = 0.56,
  } = options;

  if (spine.length < 2) {
    return {
      bodyPath: '',
      sheenPath: '',
      secondarySheenPath: '',
      coreShadowPath: '',
      edgeTopPath: '',
      edgeBottomPath: '',
      pleatHighlightPaths: [],
      pleatShadowPaths: [],
      tip: { x: 0, y: 0 },
    };
  }

  const leftEdge: Vec2[] = [];
  const rightEdge: Vec2[] = [];
  const sheenLeft: Vec2[] = [];
  const sheenRight: Vec2[] = [];
  const bounceLeft: Vec2[] = [];
  const bounceRight: Vec2[] = [];
  const shadowLeft: Vec2[] = [];
  const shadowRight: Vec2[] = [];
  const normals: Vec2[] = [];

  for (let i = 0; i < spine.length; i++) {
    const prev = spine[Math.max(0, i - 1)];
    const next = spine[Math.min(spine.length - 1, i + 1)];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const nx = -dy;
    const ny = dx;
    normals.push({ x: nx, y: ny });

    const hw = spine[i].halfWidth;
    leftEdge.push({ x: spine[i].x + nx * hw, y: spine[i].y + ny * hw });
    rightEdge.push({ x: spine[i].x - nx * hw, y: spine[i].y - ny * hw });

    const shw = hw * sheenRatio;
    const shift = hw * 0.22;
    sheenLeft.push({
      x: spine[i].x + nx * (shw + shift),
      y: spine[i].y + ny * (shw + shift),
    });
    sheenRight.push({
      x: spine[i].x + nx * (-shw + shift),
      y: spine[i].y + ny * (-shw + shift),
    });

    bounceLeft.push({
      x: spine[i].x - nx * hw * 0.68,
      y: spine[i].y - ny * hw * 0.68,
    });
    bounceRight.push({
      x: spine[i].x - nx * hw * 0.9,
      y: spine[i].y - ny * hw * 0.9,
    });

    shadowLeft.push({
      x: spine[i].x - nx * hw * 0.08,
      y: spine[i].y - ny * hw * 0.08,
    });
    shadowRight.push({
      x: spine[i].x - nx * hw * 0.66,
      y: spine[i].y - ny * hw * 0.66,
    });
  }

  const first = spine[0];
  const afterFirst = spine[1];
  let startDx = afterFirst.x - first.x;
  let startDy = afterFirst.y - first.y;
  const startLen = Math.hypot(startDx, startDy) || 1;
  startDx /= startLen;
  startDy /= startLen;

  const last = spine[spine.length - 1];
  const prevLast = spine[spine.length - 2];
  let endDx = last.x - prevLast.x;
  let endDy = last.y - prevLast.y;
  const endLen = Math.hypot(endDx, endDy) || 1;
  endDx /= endLen;
  endDy /= endLen;

  const fmt = (p: Vec2) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  const closeBand = (a: Vec2[], b: Vec2[]) => {
    let d = `M ${fmt(a[0])}`;
    for (let i = 1; i < a.length; i++) d += ` L ${fmt(a[i])}`;
    for (let i = b.length - 1; i >= 0; i--) d += ` L ${fmt(b[i])}`;
    return d + ' Z';
  };

  let bodyPath = `M ${fmt(leftEdge[0])}`;
  for (let i = 1; i < leftEdge.length; i++) {
    bodyPath += ` L ${fmt(leftEdge[i])}`;
  }
  if (swallowtailDepth > 0) {
    bodyPath += ` L ${fmt({
      x: last.x - endDx * swallowtailDepth,
      y: last.y - endDy * swallowtailDepth,
    })}`;
  }
  for (let i = rightEdge.length - 1; i >= 0; i--) {
    bodyPath += ` L ${fmt(rightEdge[i])}`;
  }
  if (startSwallowtailDepth > 0) {
    bodyPath += ` L ${fmt({
      x: first.x + startDx * startSwallowtailDepth,
      y: first.y + startDy * startSwallowtailDepth,
    })}`;
  }
  bodyPath += ' Z';

  const sheenPath = closeBand(sheenLeft, sheenRight);
  const secondarySheenPath = closeBand(bounceLeft, bounceRight);
  const coreShadowPath = closeBand(shadowLeft, shadowRight);

  const edgeTopPath =
    `M ${fmt(leftEdge[0])}` +
    leftEdge
      .slice(1)
      .map((p) => ` L ${fmt(p)}`)
      .join('');

  const edgeBottomPath =
    `M ${fmt(rightEdge[0])}` +
    rightEdge
      .slice(1)
      .map((p) => ` L ${fmt(p)}`)
      .join('');

  const pleatHighlightPaths: string[] = [];
  const pleatShadowPaths: string[] = [];

  if (pleats !== 'none') {
    const offsets = [-0.44, 0.04, 0.48];
    const maxIdx = Math.max(4, Math.floor(spine.length * pleatReach));

    offsets.forEach((laneOffset) => {
      const shPts: Vec2[] = [];
      const hiPts: Vec2[] = [];

      for (let k = 0; k <= maxIdx; k++) {
        const idx = pleats === 'fromStart' ? k : spine.length - 1 - k;
        const p = spine[idx];
        const n = normals[idx];
        const frac = k / maxIdx;
        const lateral = p.halfWidth * laneOffset * (0.5 + 0.5 * Math.sin(frac * Math.PI * 0.65));
        shPts.push({
          x: p.x + n.x * lateral,
          y: p.y + n.y * lateral,
        });
        hiPts.push({
          x: p.x + n.x * (lateral + 1.3),
          y: p.y + n.y * (lateral + 1.3),
        });
      }

      if (shPts.length > 1) {
        pleatShadowPaths.push(
          `M ${fmt(shPts[0])}` +
            shPts
              .slice(1)
              .map((pt) => ` L ${fmt(pt)}`)
              .join('')
        );
        pleatHighlightPaths.push(
          `M ${fmt(hiPts[0])}` +
            hiPts
              .slice(1)
              .map((pt) => ` L ${fmt(pt)}`)
              .join('')
        );
      }
    });
  }

  return {
    bodyPath,
    sheenPath,
    secondarySheenPath,
    coreShadowPath,
    edgeTopPath,
    edgeBottomPath,
    pleatHighlightPaths,
    pleatShadowPaths,
    tip: { x: last.x, y: last.y },
  };
}

export interface BowGeometryResult {
  topArm: RibbonMesh;
  bottomArm: RibbonMesh;
  leftArm: RibbonMesh;
  rightArm: RibbonMesh;
  armTips: {
    top: Vec2;
    bottom: Vec2;
    left: Vec2;
    right: Vec2;
  };
  leftLoopBack: RibbonMesh;
  leftLoopFront: RibbonMesh;
  leftLoopCavernPath: string;
  rightLoopBack: RibbonMesh;
  rightLoopFront: RibbonMesh;
  rightLoopCavernPath: string;
  leftTail: RibbonMesh;
  rightTail: RibbonMesh;
  continuousLooseStrip: RibbonMesh;
  leftLoopOpacity: number;
  rightLoopOpacity: number;
  pleatsOpacity: number;
  tailsOpacity: number;
  looseStripOpacity: number;
  knotOpacity: number;
  knotTransform: {
    cx: number;
    cy: number;
    scaleX: number;
    scaleY: number;
    rotateDeg: number;
  };
  leftTailTip: Vec2;
  rightTailTip: Vec2;
  bowCenter: Vec2;
}

/**
 * Compute full 4-sided satin wrap + crisp angular couture bow on the right side (316, 148).
 * Each of the 4 wrapped sides (top, bottom, left, right) can be peeled open individually once untied!
 */
export function computeBowGeometry(
  u: number,
  activeSide: RibbonSide,
  pullDelta: Vec2,
  armOpen: WrapArmState = { top: 0, bottom: 0, left: 0, right: 0 },
  armDrags: WrapArmDrags = {
    top: { x: 0, y: 0 },
    bottom: { x: 0, y: 0 },
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
  }
): BowGeometryResult {
  const progress = clamp(u, 0, 1);
  const dir = activeSide === 'right' ? 1 : -1;

  // Bow & cross center positioned cleanly on the right side of the envelope
  const baseCx = 316;
  const baseCy = 148;

  const activeLoopCollapse = smoothstep(0.0, 0.54, progress);
  const knotLoosen = smoothstep(0.24, 0.85, progress);
  const oppositeLoopCollapse = smoothstep(0.32, 0.86, progress);
  const stripMorph = smoothstep(0.74, 1.0, progress);
  const tensionSlack = smoothstep(0.6, 1.0, progress);

  const knotCx = baseCx + dir * 7 * smoothstep(0, 0.7, progress) + pullDelta.x * 0.04;
  const knotCy = baseCy + 2 * smoothstep(0, 0.7, progress) + pullDelta.y * 0.03;

  // 4 individually openable satin wrap arms extending from center out to Top, Bottom, Left, Right edges
  const tOpen = smoothstep(0, 1, clamp(armOpen.top, 0, 1));
  const bOpen = smoothstep(0, 1, clamp(armOpen.bottom, 0, 1));
  const lOpen = smoothstep(0, 1, clamp(armOpen.left, 0, 1));
  const rOpen = smoothstep(0, 1, clamp(armOpen.right, 0, 1));

  // Top arm: peels from y=-3 down & curls to (baseCx - 28, baseCy - 46)
  const topTip: Vec2 = {
    x: lerp(baseCx, baseCx - 28, tOpen) + armDrags.top.x * 0.45,
    y: lerp(-3, baseCy - 48, tOpen) + armDrags.top.y * 0.45,
  };
  const topArmSpine = sampleBezierSpine(
    [
      {
        p0: { x: baseCx, y: baseCy + 2 },
        p1: { x: baseCx + lerp(0, 16, tOpen) + armDrags.top.x * 0.18, y: lerp(baseCy - 55, baseCy - 24, tOpen) },
        p2: { x: lerp(baseCx - 2 * tensionSlack, topTip.x + 12, tOpen), y: lerp(42, topTip.y + 18, tOpen) },
        p3: topTip,
        wStart: 12.4,
        wEnd: 12.6,
      },
    ],
    18
  );

  // Bottom arm: peels from y=303 up & curls to (baseCx + 28, baseCy + 48)
  const bottomTip: Vec2 = {
    x: lerp(baseCx, baseCx + 28, bOpen) + armDrags.bottom.x * 0.45,
    y: lerp(303, baseCy + 50, bOpen) + armDrags.bottom.y * 0.45,
  };
  const bottomArmSpine = sampleBezierSpine(
    [
      {
        p0: { x: baseCx, y: baseCy - 2 },
        p1: { x: baseCx + lerp(0, -16, bOpen) + armDrags.bottom.x * 0.18, y: lerp(baseCy + 55, baseCy + 24, bOpen) },
        p2: { x: lerp(baseCx + 2 * tensionSlack, bottomTip.x - 12, bOpen), y: lerp(255, bottomTip.y - 18, bOpen) },
        p3: bottomTip,
        wStart: 12.4,
        wEnd: 12.6,
      },
    ],
    18
  );

  // Left arm: peels from x=-3 rightward & curls to (baseCx - 86, baseCy - 20)
  const leftTip: Vec2 = {
    x: lerp(-3, baseCx - 86, lOpen) + armDrags.left.x * 0.45,
    y: lerp(baseCy, baseCy - 22, lOpen) + armDrags.left.y * 0.45,
  };
  const leftArmSpine = sampleBezierSpine(
    [
      {
        p0: { x: baseCx + 2, y: baseCy },
        p1: { x: lerp(baseCx - 110, baseCx - 38, lOpen), y: baseCy + lerp(-2 * tensionSlack, 18, lOpen) + armDrags.left.y * 0.18 },
        p2: { x: lerp(85, leftTip.x + 24, lOpen), y: lerp(baseCy + 2 * tensionSlack, leftTip.y - 14, lOpen) },
        p3: leftTip,
        wStart: 12.4,
        wEnd: 12.6,
      },
    ],
    22
  );

  // Right arm: peels from x=443 leftward & curls to (baseCx + 52, baseCy + 24)
  const rightTip: Vec2 = {
    x: lerp(443, baseCx + 54, rOpen) + armDrags.right.x * 0.45,
    y: lerp(baseCy, baseCy + 26, rOpen) + armDrags.right.y * 0.45,
  };
  const rightArmSpine = sampleBezierSpine(
    [
      {
        p0: { x: baseCx - 2, y: baseCy },
        p1: { x: lerp(baseCx + 42, baseCx + 24, rOpen), y: baseCy + lerp(2 * tensionSlack, -16, rOpen) + armDrags.right.y * 0.18 },
        p2: { x: lerp(405, rightTip.x - 18, rOpen), y: lerp(baseCy - 2 * tensionSlack, rightTip.y + 12, rOpen) },
        p3: rightTip,
        wStart: 12.4,
        wEnd: 12.6,
      },
    ],
    16
  );

  const leftCollapse = activeSide === 'left' ? activeLoopCollapse : oppositeLoopCollapse;
  const rightCollapse = activeSide === 'right' ? activeLoopCollapse : oppositeLoopCollapse;

  const leftLoopOpacity = 1 - smoothstep(0.66, 0.92, leftCollapse);
  const rightLoopOpacity = 1 - smoothstep(0.66, 0.92, rightCollapse);
  const pleatsOpacity = 1 - smoothstep(0.35, 0.82, progress);
  const tailsOpacity = 1 - smoothstep(0.84, 1.0, progress);
  const looseStripOpacity = smoothstep(0.76, 0.98, progress);
  const knotOpacity = 1 - smoothstep(0.68, 0.94, progress);

  // LEFT LOOP — Crisp tailored couture angular fold (zawaya hadda)
  let leftLoopBack = EMPTY_RIBBON_MESH;
  let leftLoopFront = EMPTY_RIBBON_MESH;
  let leftLoopCavernPath = '';
  if (leftLoopOpacity > 0.002) {
    const lSpan = lerp(88, 12, leftCollapse);
    const lCornerH = lerp(24, 4, leftCollapse);
    const lDroop = lerp(0, activeSide === 'right' ? 14 : 5, leftCollapse);

    const leftLoopBackSpine = sampleBezierSpine(
      [
        {
          p0: { x: knotCx - 4, y: knotCy - 3 },
          p1: { x: knotCx - lSpan * 0.38, y: knotCy - lCornerH * 0.55 + lDroop * 0.2 },
          p2: { x: knotCx - lSpan * 0.86, y: knotCy - lCornerH * 1.05 + lDroop * 0.55 },
          p3: { x: knotCx - lSpan, y: knotCy - lCornerH * 0.45 + lDroop * 0.85 },
          wStart: lerp(7.8, 5.2, leftCollapse),
          wEnd: lerp(13.2, 8, leftCollapse),
        },
        {
          p0: { x: knotCx - lSpan, y: knotCy - lCornerH * 0.45 + lDroop * 0.85 },
          p1: { x: knotCx - lSpan * 1.04, y: knotCy - lCornerH * 0.05 + lDroop * 0.9 },
          p2: { x: knotCx - lSpan * 1.04, y: knotCy + lCornerH * 0.2 + lDroop * 0.95 },
          p3: { x: knotCx - lSpan * 0.98, y: knotCy + lCornerH * 0.55 + lDroop },
          wStart: lerp(13.2, 8, leftCollapse),
          wEnd: lerp(13.8, 8, leftCollapse),
        },
      ],
      13
    );

    const leftLoopFrontSpine = sampleBezierSpine(
      [
        {
          p0: { x: knotCx - lSpan * 0.98, y: knotCy + lCornerH * 0.55 + lDroop },
          p1: { x: knotCx - lSpan * 0.85, y: knotCy + lCornerH * 1.08 + lDroop * 0.85 },
          p2: { x: knotCx - lSpan * 0.36, y: knotCy + lCornerH * 0.6 + lDroop * 0.4 },
          p3: { x: knotCx - 5, y: knotCy + 4 },
          wStart: lerp(13.8, 8, leftCollapse),
          wEnd: lerp(8.5, 6, leftCollapse),
        },
      ],
      20
    );

    const lOuterX = knotCx - lSpan * 0.92;
    const lMidX = knotCx - lSpan * 0.45;
    leftLoopCavernPath = `M ${(knotCx - 7).toFixed(1)},${(knotCy - 1).toFixed(1)} L ${lMidX.toFixed(1)},${(knotCy - lCornerH * 0.46 + lDroop * 0.4).toFixed(1)} L ${lOuterX.toFixed(1)},${(knotCy - lCornerH * 0.42 + lDroop * 0.7).toFixed(1)} L ${lOuterX.toFixed(1)},${(knotCy + lCornerH * 0.44 + lDroop * 0.8).toFixed(1)} L ${lMidX.toFixed(1)},${(knotCy + lCornerH * 0.48 + lDroop * 0.3).toFixed(1)} L ${(knotCx - 7).toFixed(1)},${(knotCy + 3).toFixed(1)} Z`;

    leftLoopBack = buildRibbonMesh(leftLoopBackSpine, { pleats: 'fromStart', pleatReach: 0.56 });
    leftLoopFront = buildRibbonMesh(leftLoopFrontSpine, { pleats: 'fromEnd', pleatReach: 0.62 });
  }

  // RIGHT LOOP — Crisp tailored angular fold
  let rightLoopBack = EMPTY_RIBBON_MESH;
  let rightLoopFront = EMPTY_RIBBON_MESH;
  let rightLoopCavernPath = '';
  if (rightLoopOpacity > 0.002) {
    const rSpan = lerp(91, 12, rightCollapse);
    const rCornerH = lerp(23, 4, rightCollapse);
    const rDroop = lerp(0, activeSide === 'left' ? 14 : 5, rightCollapse);

    const rightLoopBackSpine = sampleBezierSpine(
      [
        {
          p0: { x: knotCx + 4, y: knotCy - 3 },
          p1: { x: knotCx + rSpan * 0.38, y: knotCy - rCornerH * 0.56 + rDroop * 0.2 },
          p2: { x: knotCx + rSpan * 0.86, y: knotCy - rCornerH * 1.04 + rDroop * 0.55 },
          p3: { x: knotCx + rSpan, y: knotCy - rCornerH * 0.44 + rDroop * 0.85 },
          wStart: lerp(7.8, 5.2, rightCollapse),
          wEnd: lerp(13.2, 8, rightCollapse),
        },
        {
          p0: { x: knotCx + rSpan, y: knotCy - rCornerH * 0.44 + rDroop * 0.85 },
          p1: { x: knotCx + rSpan * 1.04, y: knotCy - rCornerH * 0.05 + rDroop * 0.9 },
          p2: { x: knotCx + rSpan * 1.04, y: knotCy + rCornerH * 0.2 + rDroop * 0.95 },
          p3: { x: knotCx + rSpan * 0.98, y: knotCy + rCornerH * 0.55 + rDroop },
          wStart: lerp(13.2, 8, rightCollapse),
          wEnd: lerp(13.8, 8, rightCollapse),
        },
      ],
      13
    );

    const rightLoopFrontSpine = sampleBezierSpine(
      [
        {
          p0: { x: knotCx + rSpan * 0.98, y: knotCy + rCornerH * 0.55 + rDroop },
          p1: { x: knotCx + rSpan * 0.85, y: knotCy + rCornerH * 1.08 + rDroop * 0.85 },
          p2: { x: knotCx + rSpan * 0.36, y: knotCy + rCornerH * 0.6 + rDroop * 0.4 },
          p3: { x: knotCx + 5, y: knotCy + 4 },
          wStart: lerp(13.8, 8, rightCollapse),
          wEnd: lerp(8.5, 6, rightCollapse),
        },
      ],
      20
    );

    const rOuterX = knotCx + rSpan * 0.92;
    const rMidX = knotCx + rSpan * 0.45;
    rightLoopCavernPath = `M ${(knotCx + 7).toFixed(1)},${(knotCy - 1).toFixed(1)} L ${rMidX.toFixed(1)},${(knotCy - rCornerH * 0.46 + rDroop * 0.4).toFixed(1)} L ${rOuterX.toFixed(1)},${(knotCy - rCornerH * 0.42 + rDroop * 0.7).toFixed(1)} L ${rOuterX.toFixed(1)},${(knotCy + rCornerH * 0.44 + rDroop * 0.8).toFixed(1)} L ${rMidX.toFixed(1)},${(knotCy + rCornerH * 0.48 + rDroop * 0.3).toFixed(1)} L ${(knotCx + 7).toFixed(1)},${(knotCy + 3).toFixed(1)} Z`;

    rightLoopBack = buildRibbonMesh(rightLoopBackSpine, { pleats: 'fromStart', pleatReach: 0.56 });
    rightLoopFront = buildRibbonMesh(rightLoopFrontSpine, { pleats: 'fromEnd', pleatReach: 0.62 });
  }

  // Hanging bow tails
  const leftPullOffset =
    activeSide === 'left'
      ? { x: clamp(pullDelta.x, -165, 55), y: clamp(pullDelta.y, -70, 130) }
      : { x: -20 * oppositeLoopCollapse, y: -12 * oppositeLoopCollapse };

  const rightPullOffset =
    activeSide === 'right'
      ? { x: clamp(pullDelta.x, -55, 145), y: clamp(pullDelta.y, -70, 130) }
      : { x: 20 * oppositeLoopCollapse, y: -12 * oppositeLoopCollapse };

  const looseLeftTip: Vec2 = {
    x: 242 + leftPullOffset.x * 0.25,
    y: 196 + leftPullOffset.y * 0.2,
  };
  const looseRightTip: Vec2 = {
    x: 386 + rightPullOffset.x * 0.25,
    y: 206 + rightPullOffset.y * 0.2,
  };

  const leftTailEnd: Vec2 = {
    x: lerp(258 + leftPullOffset.x * 0.85, looseLeftTip.x, stripMorph),
    y: lerp(262 + leftPullOffset.y * 0.85, looseLeftTip.y, stripMorph),
  };

  const rightTailEnd: Vec2 = {
    x: lerp(376 + rightPullOffset.x * 0.85, looseRightTip.x, stripMorph),
    y: lerp(256 + rightPullOffset.y * 0.85, looseRightTip.y, stripMorph),
  };

  let leftTail = EMPTY_RIBBON_MESH;
  let rightTail = EMPTY_RIBBON_MESH;
  if (tailsOpacity > 0.002) {
    const leftTailSpine = sampleBezierSpine(
      [
        {
          p0: { x: knotCx - 5, y: knotCy + 4 },
          p1: {
            x: lerp(knotCx - 22 + leftPullOffset.x * 0.25, knotCx - 34, stripMorph),
            y: lerp(knotCy + 38 + leftPullOffset.y * 0.2, knotCy + 18, stripMorph),
          },
          p2: {
            x: lerp(leftTailEnd.x + 14, looseLeftTip.x + 18, stripMorph),
            y: lerp(leftTailEnd.y - 36, looseLeftTip.y - 12, stripMorph),
          },
          p3: leftTailEnd,
          wStart: lerp(9, 12.2, stripMorph),
          wEnd: 12.8,
        },
      ],
      20
    );

    const rightTailSpine = sampleBezierSpine(
      [
        {
          p0: { x: knotCx + 5, y: knotCy + 4 },
          p1: {
            x: lerp(knotCx + 22 + rightPullOffset.x * 0.25, knotCx + 34, stripMorph),
            y: lerp(knotCy + 36 + rightPullOffset.y * 0.2, knotCy + 14, stripMorph),
          },
          p2: {
            x: lerp(rightTailEnd.x - 14, looseRightTip.x - 16, stripMorph),
            y: lerp(rightTailEnd.y - 34, looseRightTip.y - 12, stripMorph),
          },
          p3: rightTailEnd,
          wStart: lerp(9, 12.2, stripMorph),
          wEnd: 12.8,
        },
      ],
      20
    );

    leftTail = buildRibbonMesh(leftTailSpine, {
      swallowtailDepth: 9,
      pleats: 'fromStart',
      pleatReach: 0.44,
    });
    rightTail = buildRibbonMesh(rightTailSpine, {
      swallowtailDepth: 9,
      pleats: 'fromStart',
      pleatReach: 0.44,
    });
  }

  // Continuous untied bow strip resting across the cross center once knot releases
  let continuousLooseStrip = EMPTY_RIBBON_MESH;
  if (looseStripOpacity > 0.002) {
    const continuousStripSpine = sampleBezierSpine(
      [
        {
          p0: looseLeftTip,
          p1: { x: 266, y: 184 },
          p2: { x: knotCx - 24, y: knotCy + 18 },
          p3: { x: knotCx, y: knotCy + 4 },
          wStart: 12.8,
          wEnd: 12.2,
        },
        {
          p0: { x: knotCx, y: knotCy + 4 },
          p1: { x: knotCx + 28, y: knotCy - 8 },
          p2: { x: 364, y: 194 },
          p3: looseRightTip,
          wStart: 12.2,
          wEnd: 12.8,
        },
      ],
      18
    );

    continuousLooseStrip = buildRibbonMesh(continuousStripSpine, {
      swallowtailDepth: 9,
      startSwallowtailDepth: 9,
    });
  }

  return {
    topArm: buildRibbonMesh(topArmSpine, { swallowtailDepth: tOpen > 0.05 ? 7 : 0 }),
    bottomArm: buildRibbonMesh(bottomArmSpine, { swallowtailDepth: bOpen > 0.05 ? 7 : 0 }),
    leftArm: buildRibbonMesh(leftArmSpine, { swallowtailDepth: lOpen > 0.05 ? 7 : 0 }),
    rightArm: buildRibbonMesh(rightArmSpine, { swallowtailDepth: rOpen > 0.05 ? 7 : 0 }),
    armTips: {
      top: topTip,
      bottom: bottomTip,
      left: leftTip,
      right: rightTip,
    },
    leftLoopBack,
    leftLoopFront,
    leftLoopCavernPath,
    rightLoopBack,
    rightLoopFront,
    rightLoopCavernPath,
    leftTail,
    rightTail,
    continuousLooseStrip,
    leftLoopOpacity,
    rightLoopOpacity,
    pleatsOpacity,
    tailsOpacity,
    looseStripOpacity,
    knotOpacity,
    knotTransform: {
      cx: knotCx,
      cy: knotCy,
      scaleX: lerp(1, 1.32, knotLoosen),
      scaleY: lerp(1, 0.88, knotLoosen),
      rotateDeg: dir * 9 * knotLoosen,
    },
    leftTailTip: leftTailEnd,
    rightTailTip: rightTailEnd,
    bowCenter: { x: baseCx, y: baseCy },
  };
}
