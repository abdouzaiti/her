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

function sampleSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  count: number,
  skipStart = false
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = skipStart ? 1 : 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    pts.push({
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t,
    });
  }
  return pts;
}

function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function addLetterPoints(
  letter: string,
  ox: number,
  oy: number,
  w: number,
  h: number
): Array<{ x: number; y: number }> {
  const midY = oy + h * 0.49;
  const botY = oy + h;
  const cx = ox + w * 0.5;
  const rx = ox + w;

  switch (letter) {
    case 'M':
      return [
        ...sampleSegment(ox, botY, ox, oy, 6),
        ...sampleSegment(ox, oy, cx, oy + h * 0.54, 4, true),
        ...sampleSegment(cx, oy + h * 0.54, rx, oy, 4, true),
        ...sampleSegment(rx, oy, rx, botY, 6, true),
      ];
    case 'E':
      return [
        ...sampleSegment(ox, oy, ox, botY, 6),
        ...sampleSegment(ox, oy, rx, oy, 4, true),
        ...sampleSegment(ox, midY, ox + w * 0.8, midY, 4, true),
        ...sampleSegment(ox, botY, rx, botY, 4, true),
      ];
    case 'R':
      return [
        ...sampleSegment(ox, oy, ox, botY, 6),
        ...sampleSegment(ox, oy, ox + w * 0.72, oy, 4, true),
        ...sampleSegment(ox + w * 0.72, oy, rx, oy + h * 0.24, 3, true),
        ...sampleSegment(rx, oy + h * 0.24, ox + w * 0.72, midY, 3, true),
        ...sampleSegment(ox + w * 0.72, midY, ox, midY, 4, true),
        ...sampleSegment(ox + w * 0.44, midY + 11, rx, botY, 4),
      ];
    case 'I':
      return [
        ...sampleSegment(cx, oy, cx, botY, 6),
      ];
    case 'Y':
      return [
        ...sampleSegment(ox, oy, cx, midY, 4),
        ...sampleSegment(rx, oy, cx, midY, 4),
        ...sampleSegment(cx, midY, cx, botY, 4, true),
      ];
    case 'K':
      return [
        ...sampleSegment(ox, oy, ox, botY, 6),
        ...sampleSegment(ox + 12, midY - 4, rx, oy, 4),
        ...sampleSegment(ox + 12, midY + 6, rx, botY, 4),
      ];
    case 'P':
      return [
        ...sampleSegment(ox, oy, ox, botY, 6),
        ...sampleSegment(ox, oy, ox + w * 0.72, oy, 4, true),
        ...sampleSegment(ox + w * 0.72, oy, rx, oy + h * 0.24, 3, true),
        ...sampleSegment(rx, oy + h * 0.24, ox + w * 0.72, midY, 3, true),
        ...sampleSegment(ox + w * 0.72, midY, ox, midY, 4, true),
      ];
    case 'T':
      return [
        ...sampleSegment(ox, oy, rx, oy, 4),
        ...sampleSegment(cx, oy, cx, botY, 6, true),
      ];
    case 'O':
      return [
        ...sampleSegment(ox + w * 0.28, oy, ox + w * 0.72, oy, 3),
        ...sampleSegment(ox + w * 0.72, oy, rx, oy + h * 0.24, 2, true),
        ...sampleSegment(rx, oy + h * 0.24, rx, oy + h * 0.76, 4, true),
        ...sampleSegment(rx, oy + h * 0.76, ox + w * 0.72, botY, 2, true),
        ...sampleSegment(ox + w * 0.72, botY, ox + w * 0.28, botY, 3, true),
        ...sampleSegment(ox + w * 0.28, botY, ox, oy + h * 0.76, 2, true),
        ...sampleSegment(ox, oy + h * 0.76, ox, oy + h * 0.24, 4, true),
        ...sampleSegment(ox, oy + h * 0.24, ox + w * 0.28, oy, 2, true),
      ];
    case 'N':
      return [
        ...sampleSegment(ox, botY, ox, oy, 6),
        ...sampleSegment(ox, oy, rx, botY, 5, true),
        ...sampleSegment(rx, botY, rx, oy, 6, true),
      ];
    default:
      return [];
  }
}

function buildWordLine(
  word: string,
  oy: number,
  h: number,
  gap: number,
  canvasCenterX: number,
  minSpacing: number
): Array<{ x: number; y: number }> {
  const widths: Record<string, number> = {
    M: 80,
    E: 56,
    R: 62,
    I: 22,
    Y: 62,
    K: 56,
    P: 56,
    T: 58,
    O: 64,
    N: 60,
  };

  const letters = word.split('');
  let totalW = 0;
  letters.forEach((ch, idx) => {
    totalW += widths[ch] ?? 58;
    if (idx < letters.length - 1) totalW += gap;
  });

  let cursorX = canvasCenterX - totalW / 2;
  const linePts: Array<{ x: number; y: number }> = [];

  letters.forEach((ch) => {
    const w = widths[ch] ?? 58;
    const rawPts = addLetterPoints(ch, cursorX, oy, w, h);
    const letterPts: Array<{ x: number; y: number }> = [];

    rawPts.forEach((pt) => {
      const tooClose = letterPts.some((e) => Math.hypot(e.x - pt.x, e.y - pt.y) < minSpacing);
      if (!tooClose) letterPts.push(pt);
    });

    linePts.push(...letterPts);
    cursorX += w + gap;
  });

  return linePts;
}

/**
 * Generate crisp, legible flowers with delicate green stems forming:
 *   MERIEM
 *     MY
 * KRYPTONITE
 * then smoothly converging into a lush wrapped flower bouquet.
 */
export function buildMeriemFlowers(): FlowerNode[] {
  const centerX = 450;

  const line1 = buildWordLine('MERIEM', 24, 106, 40, centerX, 15).map((pt) => ({
    ...pt,
    lineIndex: 0 as const,
  }));
  const line2 = buildWordLine('MY', 174, 96, 44, centerX, 15).map((pt) => ({
    ...pt,
    lineIndex: 1 as const,
  }));
  const line3 = buildWordLine('KRYPTONITE', 316, 104, 29, centerX, 14.5).map((pt) => ({
    ...pt,
    lineIndex: 2 as const,
  }));

  const allNodes = [...line1, ...line2, ...line3];
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

  return allNodes.map((pt, i) => {
    const slot = slots[i];
    const normR = Math.sqrt((slot + 0.5) / total);
    const theta = slot * goldenAngle;

    const bx = bouquetCx + Math.cos(theta) * normR * 165;
    const by = bouquetCy + Math.sin(theta) * normR * 100 - (1 - normR) * 14;

    // Tilt stems naturally inward toward the bouquet tie point
    const radialTilt = ((bx - bouquetCx) / 165) * 28;

    return {
      id: i,
      lineIndex: pt.lineIndex,
      variety: varieties[i % varieties.length],
      nameX: pt.x,
      nameY: pt.y,
      nameScale: 0.45 + seeded(i, 3) * 0.08,
      nameRot: (seeded(i, 4) - 0.5) * 8,
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
}
