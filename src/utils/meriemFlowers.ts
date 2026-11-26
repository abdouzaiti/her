export type FlowerVariety = 'peony' | 'rose' | 'ranunculus' | 'blossom';

export interface FlowerNode {
  id: number;
  lineIndex: 0 | 1 | 2;
  variety: FlowerVariety;
  /** Position when spelling MERIEM / MY / KRYPTONITE (inside 900x480 viewBox) */
  nameX: number;
  nameY: number;
  nameScale: number;
  nameRot: number;
  /** Position when gathered into the flower bouquet */
  bouquetX: number;
  bouquetY: number;
  bouquetScale: number;
  bouquetRot: number;
  /** Delicate green stem curve & compact length so letters stay crystal clear */
  stemCurve: number;
  stemLen: number;
  leafSide: -1 | 1;
  tone: 0 | 1 | 2 | 3;
}

export interface MeriemFloralLayout {
  flowers: FlowerNode[];
  vinePaths: string[];
}

interface StrokeSample {
  x: number;
  y: number;
  weight: 'stem' | 'hairline';
}

function sampleSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  count: number,
  weight: 'stem' | 'hairline',
  skipStart = false
): StrokeSample[] {
  const pts: StrokeSample[] = [];
  for (let i = skipStart ? 1 : 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    pts.push({
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t,
      weight,
    });
  }
  return pts;
}

function sampleQuad(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  count: number,
  weight: 'stem' | 'hairline',
  skipStart = false
): StrokeSample[] {
  const pts: StrokeSample[] = [];
  for (let i = skipStart ? 1 : 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const mt = 1 - t;
    pts.push({
      x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
      y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
      weight,
    });
  }
  return pts;
}

function sampleOval(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number
): StrokeSample[] {
  const pts: StrokeSample[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const isSide = Math.abs(Math.cos(angle)) > 0.55;
    pts.push({
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
      weight: isSide ? 'stem' : 'hairline',
    });
  }
  return pts;
}

function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildLetterGeometry(
  letter: string,
  ox: number,
  oy: number,
  w: number,
  h: number
): { pts: StrokeSample[]; paths: string[] } {
  const midY = oy + h * 0.49;
  const botY = oy + h;
  const cx = ox + w * 0.5;
  const rx = ox + w;
  const f = (n: number) => n.toFixed(1);

  switch (letter) {
    case 'M': {
      const pts = [
        ...sampleSegment(ox - 6, botY, ox + 6, botY, 2, 'hairline'),
        ...sampleSegment(ox, botY, ox + 3, oy, 6, 'stem', true),
        ...sampleQuad(ox + 3, oy, ox + w * 0.28, oy + h * 0.26, cx, oy + h * 0.57, 4, 'hairline', true),
        ...sampleQuad(cx, oy + h * 0.57, ox + w * 0.72, oy + h * 0.26, rx - 3, oy, 4, 'hairline', true),
        ...sampleSegment(rx - 3, oy, rx, botY, 6, 'stem', true),
        ...sampleSegment(rx - 6, botY, rx + 6, botY, 2, 'hairline'),
      ];
      const paths = [
        `M ${f(ox - 6)},${f(botY)} L ${f(ox + 6)},${f(botY)}`,
        `M ${f(ox)},${f(botY)} L ${f(ox + 3)},${f(oy)} Q ${f(ox + w * 0.28)},${f(oy + h * 0.26)} ${f(cx)},${f(oy + h * 0.57)} Q ${f(ox + w * 0.72)},${f(oy + h * 0.26)} ${f(rx - 3)},${f(oy)} L ${f(rx)},${f(botY)}`,
        `M ${f(rx - 6)},${f(botY)} L ${f(rx + 6)},${f(botY)}`,
      ];
      return { pts, paths };
    }
    case 'E': {
      const pts = [
        ...sampleSegment(ox, oy, ox, botY, 6, 'stem'),
        ...sampleSegment(ox, oy, rx, oy, 4, 'hairline', true),
        ...sampleSegment(rx, oy, rx + 2, oy + 9, 2, 'hairline', true),
        ...sampleSegment(ox, midY, ox + w * 0.74, midY, 4, 'hairline', true),
        ...sampleSegment(ox, botY, rx, botY, 4, 'hairline', true),
        ...sampleSegment(rx, botY, rx + 2, botY - 9, 2, 'hairline', true),
      ];
      const paths = [
        `M ${f(rx + 2)},${f(oy + 9)} L ${f(rx)},${f(oy)} L ${f(ox)},${f(oy)} L ${f(ox)},${f(botY)} L ${f(rx)},${f(botY)} L ${f(rx + 2)},${f(botY - 9)}`,
        `M ${f(ox)},${f(midY)} L ${f(ox + w * 0.74)},${f(midY)}`,
      ];
      return { pts, paths };
    }
    case 'R': {
      const bowlX = ox + w * 0.58;
      const pts = [
        ...sampleSegment(ox - 5, botY, ox + 5, botY, 2, 'hairline'),
        ...sampleSegment(ox, oy, ox, botY, 6, 'stem'),
        ...sampleSegment(ox, oy, bowlX, oy, 3, 'hairline', true),
        ...sampleQuad(bowlX, oy, rx + 4, oy, rx + 4, oy + h * 0.25, 3, 'hairline', true),
        ...sampleQuad(rx + 4, oy + h * 0.25, rx + 4, midY, bowlX, midY, 3, 'hairline', true),
        ...sampleSegment(bowlX, midY, ox, midY, 3, 'hairline', true),
        ...sampleQuad(ox + w * 0.42, midY + 4, ox + w * 0.74, midY + h * 0.19, rx + 3, botY, 4, 'stem'),
      ];
      const paths = [
        `M ${f(ox - 5)},${f(botY)} L ${f(ox + 5)},${f(botY)}`,
        `M ${f(ox)},${f(botY)} L ${f(ox)},${f(oy)} L ${f(bowlX)},${f(oy)} Q ${f(rx + 4)},${f(oy)} ${f(rx + 4)},${f(oy + h * 0.25)} Q ${f(rx + 4)},${f(midY)} ${f(bowlX)},${f(midY)} L ${f(ox)},${f(midY)}`,
        `M ${f(ox + w * 0.42)},${f(midY + 4)} Q ${f(ox + w * 0.74)},${f(midY + h * 0.19)} ${f(rx + 3)},${f(botY)}`,
      ];
      return { pts, paths };
    }
    case 'I': {
      const pts = [
        ...sampleSegment(cx - 10, oy, cx + 10, oy, 3, 'hairline'),
        ...sampleSegment(cx, oy, cx, botY, 6, 'stem'),
        ...sampleSegment(cx - 10, botY, cx + 10, botY, 3, 'hairline'),
      ];
      const paths = [
        `M ${f(cx - 10)},${f(oy)} L ${f(cx + 10)},${f(oy)}`,
        `M ${f(cx)},${f(oy)} L ${f(cx)},${f(botY)}`,
        `M ${f(cx - 10)},${f(botY)} L ${f(cx + 10)},${f(botY)}`,
      ];
      return { pts, paths };
    }
    case 'Y': {
      const pts = [
        ...sampleQuad(ox, oy, ox + w * 0.2, oy + h * 0.34, cx, midY + 2, 4, 'stem'),
        ...sampleQuad(rx, oy, rx - w * 0.2, oy + h * 0.34, cx, midY + 2, 4, 'hairline'),
        ...sampleSegment(cx, midY + 2, cx, botY, 4, 'stem', true),
        ...sampleSegment(cx - 8, botY, cx + 8, botY, 2, 'hairline'),
      ];
      const paths = [
        `M ${f(ox)},${f(oy)} Q ${f(ox + w * 0.2)},${f(oy + h * 0.34)} ${f(cx)},${f(midY + 2)} L ${f(cx)},${f(botY)}`,
        `M ${f(rx)},${f(oy)} Q ${f(rx - w * 0.2)},${f(oy + h * 0.34)} ${f(cx)},${f(midY + 2)}`,
        `M ${f(cx - 8)},${f(botY)} L ${f(cx + 8)},${f(botY)}`,
      ];
      return { pts, paths };
    }
    case 'K': {
      const pts = [
        ...sampleSegment(ox - 5, botY, ox + 5, botY, 2, 'hairline'),
        ...sampleSegment(ox, oy, ox, botY, 6, 'stem'),
        ...sampleQuad(ox + 9, midY - 2, ox + w * 0.56, oy + h * 0.26, rx + 2, oy, 4, 'hairline'),
        ...sampleQuad(ox + w * 0.34, oy + h * 0.39, ox + w * 0.68, oy + h * 0.68, rx + 4, botY, 4, 'stem'),
      ];
      const paths = [
        `M ${f(ox - 5)},${f(botY)} L ${f(ox + 5)},${f(botY)}`,
        `M ${f(ox)},${f(oy)} L ${f(ox)},${f(botY)}`,
        `M ${f(ox + 9)},${f(midY - 2)} Q ${f(ox + w * 0.56)},${f(oy + h * 0.26)} ${f(rx + 2)},${f(oy)}`,
        `M ${f(ox + w * 0.34)},${f(oy + h * 0.39)} Q ${f(ox + w * 0.68)},${f(oy + h * 0.68)} ${f(rx + 4)},${f(botY)}`,
      ];
      return { pts, paths };
    }
    case 'P': {
      const bowlX = ox + w * 0.56;
      const pts = [
        ...sampleSegment(ox - 5, botY, ox + 5, botY, 2, 'hairline'),
        ...sampleSegment(ox, oy, ox, botY, 6, 'stem'),
        ...sampleSegment(ox, oy, bowlX, oy, 3, 'hairline', true),
        ...sampleQuad(bowlX, oy, rx + 4, oy, rx + 4, oy + h * 0.26, 3, 'hairline', true),
        ...sampleQuad(rx + 4, oy + h * 0.26, rx + 4, midY + 4, bowlX, midY + 4, 3, 'hairline', true),
        ...sampleSegment(bowlX, midY + 4, ox, midY + 4, 3, 'hairline', true),
      ];
      const paths = [
        `M ${f(ox - 5)},${f(botY)} L ${f(ox + 5)},${f(botY)}`,
        `M ${f(ox)},${f(botY)} L ${f(ox)},${f(oy)} L ${f(bowlX)},${f(oy)} Q ${f(rx + 4)},${f(oy)} ${f(rx + 4)},${f(oy + h * 0.26)} Q ${f(rx + 4)},${f(midY + 4)} ${f(bowlX)},${f(midY + 4)} L ${f(ox)},${f(midY + 4)}`,
      ];
      return { pts, paths };
    }
    case 'T': {
      const pts = [
        ...sampleSegment(ox - 2, oy + 9, ox, oy, 2, 'hairline'),
        ...sampleSegment(ox, oy, rx, oy, 4, 'hairline', true),
        ...sampleSegment(rx, oy, rx + 2, oy + 9, 2, 'hairline', true),
        ...sampleSegment(cx, oy, cx, botY, 6, 'stem', true),
        ...sampleSegment(cx - 9, botY, cx + 9, botY, 2, 'hairline'),
      ];
      const paths = [
        `M ${f(ox - 2)},${f(oy + 9)} L ${f(ox)},${f(oy)} L ${f(rx)},${f(oy)} L ${f(rx + 2)},${f(oy + 9)}`,
        `M ${f(cx)},${f(oy)} L ${f(cx)},${f(botY)}`,
        `M ${f(cx - 9)},${f(botY)} L ${f(cx + 9)},${f(botY)}`,
      ];
      return { pts, paths };
    }
    case 'O': {
      const pts = sampleOval(cx, oy + h * 0.5, w * 0.5, h * 0.5, 16);
      const paths = [
        `M ${f(cx)},${f(oy)} A ${f(w * 0.5)},${f(h * 0.5)} 0 1,1 ${f(cx - 0.1)},${f(oy)} Z`,
      ];
      return { pts, paths };
    }
    case 'N': {
      const pts = [
        ...sampleSegment(ox, botY, ox, oy, 6, 'hairline'),
        ...sampleSegment(ox, oy, rx, botY, 6, 'stem', true),
        ...sampleSegment(rx, botY, rx, oy, 6, 'hairline', true),
      ];
      const paths = [
        `M ${f(ox)},${f(botY)} L ${f(ox)},${f(oy)} L ${f(rx)},${f(botY)} L ${f(rx)},${f(oy)}`,
      ];
      return { pts, paths };
    }
    default:
      return { pts: [], paths: [] };
  }
}

function buildWordLine(
  word: string,
  oy: number,
  h: number,
  gap: number,
  canvasCenterX: number,
  minSpacing: number
): { pts: StrokeSample[]; paths: string[] } {
  const widths: Record<string, number> = {
    M: 82,
    E: 56,
    R: 62,
    I: 26,
    Y: 64,
    K: 58,
    P: 56,
    T: 60,
    O: 68,
    N: 60,
  };

  const letters = word.split('');
  let totalW = 0;
  letters.forEach((ch, idx) => {
    totalW += widths[ch] ?? 58;
    if (idx < letters.length - 1) totalW += gap;
  });

  let cursorX = canvasCenterX - totalW / 2;
  const linePts: StrokeSample[] = [];
  const linePaths: string[] = [];

  letters.forEach((ch) => {
    const w = widths[ch] ?? 58;
    const { pts: rawPts, paths } = buildLetterGeometry(ch, cursorX, oy, w, h);
    const letterPts: StrokeSample[] = [];

    rawPts.forEach((pt) => {
      const tooClose = letterPts.some((e) => Math.hypot(e.x - pt.x, e.y - pt.y) < minSpacing);
      if (!tooClose) letterPts.push(pt);
    });

    linePts.push(...letterPts);
    linePaths.push(...paths);
    cursorX += w + gap;
  });

  return { pts: linePts, paths: linePaths };
}

/**
 * Generate lush artistic floral calligraphy with delicate botanical vines forming:
 *   MERIEM
 *     MY
 * KRYPTONITE
 * then smoothly converging into a wrapped flower bouquet.
 */
export function buildMeriemFlowers(): MeriemFloralLayout {
  const centerX = 450;

  const line1 = buildWordLine('MERIEM', 22, 108, 40, centerX, 15.5);
  const line2 = buildWordLine('MY', 174, 96, 46, centerX, 15.5);
  const line3 = buildWordLine('KRYPTONITE', 316, 106, 28, centerX, 15);

  const allNodes = [
    ...line1.pts.map((pt) => ({ ...pt, lineIndex: 0 as const })),
    ...line2.pts.map((pt) => ({ ...pt, lineIndex: 1 as const })),
    ...line3.pts.map((pt) => ({ ...pt, lineIndex: 2 as const })),
  ];

  const total = allNodes.length;
  const varieties: FlowerVariety[] = ['peony', 'rose', 'ranunculus', 'blossom'];

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const bouquetCx = 450;
  const bouquetCy = 152;

  const slots = allNodes.map((_, idx) => idx);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(i, 91) * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  const flowers: FlowerNode[] = allNodes.map((pt, i) => {
    const slot = slots[i];
    const normR = Math.sqrt((slot + 0.5) / total);
    const theta = slot * goldenAngle;

    const bx = bouquetCx + Math.cos(theta) * normR * 165;
    const by = bouquetCy + Math.sin(theta) * normR * 100 - (1 - normR) * 14;

    const radialTilt = ((bx - bouquetCx) / 165) * 28;
    const baseScale = pt.weight === 'stem' ? 0.57 : 0.44;

    return {
      id: i,
      lineIndex: pt.lineIndex,
      variety: varieties[i % varieties.length],
      nameX: pt.x,
      nameY: pt.y,
      nameScale: baseScale + seeded(i, 3) * 0.09,
      nameRot: (seeded(i, 4) - 0.5) * 10,
      bouquetX: bx,
      bouquetY: by,
      bouquetScale: 1.04 + (1 - normR * 0.5) * 0.52 + seeded(i, 5) * 0.16,
      bouquetRot: radialTilt + (seeded(i, 6) - 0.5) * 16,
      stemCurve: (seeded(i, 7) - 0.5) * 5,
      stemLen: 12 + seeded(i, 8) * 5,
      leafSide: i % 2 === 0 ? -1 : 1,
      tone: (i % 4) as 0 | 1 | 2 | 3,
    };
  });

  return {
    flowers,
    vinePaths: [...line1.paths, ...line2.paths, ...line3.paths],
  };
}
