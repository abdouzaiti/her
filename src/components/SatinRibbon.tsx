import React, { useEffect, useRef, useState } from 'react';
import type { RibbonSide, TelegramPhase } from '../types/telegram';
import {
  clamp,
  computeBowGeometry,
  lerp,
  type RibbonMesh,
  type Vec2,
  type WrapArmDrags,
  type WrapArmKey,
  type WrapArmState,
} from '../utils/ribbonGeometry';

interface SatinRibbonProps {
  phase: TelegramPhase;
  onUntieStart: () => void;
  onUntieProgress?: (progress: number) => void;
  onUntieComplete: () => void;
  onOpenedSidesChange?: (openedCount: number) => void;
  onRibbonRemoved: () => void;
  isCompactViewport: boolean;
}

interface PhysicsState {
  u: number;
  targetU: number;
  pull: Vec2;
  targetPull: Vec2;
  activeSide: RibbonSide;
  armOpen: WrapArmState;
  targetArmOpen: WrapArmState;
  armDrags: WrapArmDrags;
  targetArmDrags: WrapArmDrags;
  liftOffset: Vec2;
  targetLiftOffset: Vec2;
  liftScale: number;
  targetLiftScale: number;
  liftRot: number;
  targetLiftRot: number;
  opacity: number;
  targetOpacity: number;
  settledSide: RibbonSide;
}

interface MeshDomRefs {
  body: SVGPathElement | null;
  weave: SVGPathElement | null;
  coreShadow: SVGPathElement | null;
  sheen: SVGPathElement | null;
  bounce: SVGPathElement | null;
  edgeTop: SVGPathElement | null;
  edgeBot: SVGPathElement | null;
  pleatShadows: [SVGPathElement | null, SVGPathElement | null, SVGPathElement | null];
  pleatHighlights: [SVGPathElement | null, SVGPathElement | null, SVGPathElement | null];
}

function createEmptyMeshRefs(): MeshDomRefs {
  return {
    body: null,
    weave: null,
    coreShadow: null,
    sheen: null,
    bounce: null,
    edgeTop: null,
    edgeBot: null,
    pleatShadows: [null, null, null],
    pleatHighlights: [null, null, null],
  };
}

function applyMeshToRefs(refs: MeshDomRefs, mesh: RibbonMesh, pleatsOpacity = 1) {
  refs.body?.setAttribute('d', mesh.bodyPath);
  refs.weave?.setAttribute('d', mesh.bodyPath);
  refs.coreShadow?.setAttribute('d', mesh.coreShadowPath);
  refs.sheen?.setAttribute('d', mesh.sheenPath);
  refs.bounce?.setAttribute('d', mesh.secondarySheenPath);
  refs.edgeTop?.setAttribute('d', mesh.edgeTopPath);
  refs.edgeBot?.setAttribute('d', mesh.edgeBottomPath);

  const pOp = pleatsOpacity.toFixed(3);
  for (let i = 0; i < 3; i++) {
    const sh = refs.pleatShadows[i];
    const hi = refs.pleatHighlights[i];
    if (sh) {
      sh.setAttribute('d', mesh.pleatShadowPaths[i] || '');
      sh.style.opacity = pOp;
    }
    if (hi) {
      hi.setAttribute('d', mesh.pleatHighlightPaths[i] || '');
      hi.style.opacity = pOp;
    }
  }
}

export const SatinRibbon: React.FC<SatinRibbonProps> = ({
  phase,
  onUntieStart,
  onUntieProgress,
  onUntieComplete,
  onOpenedSidesChange,
  onRibbonRemoved,
  isCompactViewport,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [openedArms, setOpenedArms] = useState<{
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  }>({ top: false, bottom: false, left: false, right: false });

  const openedArmsRef = useRef(openedArms);
  openedArmsRef.current = openedArms;

  const allSidesOpened =
    openedArms.top && openedArms.bottom && openedArms.left && openedArms.right;

  // High-detail DOM refs
  const groupRef = useRef<SVGGElement | null>(null);
  const ambientShadowGroupRef = useRef<SVGGElement | null>(null);
  const contactShadowGroupRef = useRef<SVGGElement | null>(null);

  const topArmRef = useRef<MeshDomRefs>(createEmptyMeshRefs());
  const bottomArmRef = useRef<MeshDomRefs>(createEmptyMeshRefs());
  const leftArmRef = useRef<MeshDomRefs>(createEmptyMeshRefs());
  const rightArmRef = useRef<MeshDomRefs>(createEmptyMeshRefs());

  const armCueRefs = useRef<Record<WrapArmKey, SVGCircleElement | null>>({
    top: null,
    bottom: null,
    left: null,
    right: null,
  });

  const lLoopBackGroupRef = useRef<SVGGElement | null>(null);
  const lLoopBackRef = useRef<MeshDomRefs>(createEmptyMeshRefs());
  const lLoopCavernRef = useRef<SVGPathElement | null>(null);
  const lLoopFrontGroupRef = useRef<SVGGElement | null>(null);
  const lLoopFrontRef = useRef<MeshDomRefs>(createEmptyMeshRefs());

  const rLoopBackGroupRef = useRef<SVGGElement | null>(null);
  const rLoopBackRef = useRef<MeshDomRefs>(createEmptyMeshRefs());
  const rLoopCavernRef = useRef<SVGPathElement | null>(null);
  const rLoopFrontGroupRef = useRef<SVGGElement | null>(null);
  const rLoopFrontRef = useRef<MeshDomRefs>(createEmptyMeshRefs());

  const tailsGroupRef = useRef<SVGGElement | null>(null);
  const lTailRef = useRef<MeshDomRefs>(createEmptyMeshRefs());
  const rTailRef = useRef<MeshDomRefs>(createEmptyMeshRefs());

  const looseStripGroupRef = useRef<SVGGElement | null>(null);
  const looseStripRef = useRef<MeshDomRefs>(createEmptyMeshRefs());

  const knotGroupRef = useRef<SVGGElement | null>(null);
  const leftHitRef = useRef<SVGCircleElement | null>(null);
  const rightHitRef = useRef<SVGCircleElement | null>(null);
  const rightCueRef = useRef<SVGCircleElement | null>(null);

  // Ambient & contact shadow path refs
  const shTopArmRef = useRef<SVGPathElement | null>(null);
  const shBottomArmRef = useRef<SVGPathElement | null>(null);
  const shLeftArmRef = useRef<SVGPathElement | null>(null);
  const shRightArmRef = useRef<SVGPathElement | null>(null);
  const shLLoopRef = useRef<SVGPathElement | null>(null);
  const shRLoopRef = useRef<SVGPathElement | null>(null);
  const shLTailRef = useRef<SVGPathElement | null>(null);
  const shRTailRef = useRef<SVGPathElement | null>(null);
  const shLooseRef = useRef<SVGPathElement | null>(null);

  const cShTopArmRef = useRef<SVGPathElement | null>(null);
  const cShBottomArmRef = useRef<SVGPathElement | null>(null);
  const cShLeftArmRef = useRef<SVGPathElement | null>(null);
  const cShRightArmRef = useRef<SVGPathElement | null>(null);
  const cShLTailRef = useRef<SVGPathElement | null>(null);
  const cShRTailRef = useRef<SVGPathElement | null>(null);
  const cShLooseRef = useRef<SVGPathElement | null>(null);
  const cShKnotRef = useRef<SVGEllipseElement | null>(null);

  const phaseRef = useRef<TelegramPhase>(phase);
  phaseRef.current = phase;

  const physicsRef = useRef<PhysicsState>({
    u: 0,
    targetU: 0,
    pull: { x: 0, y: 0 },
    targetPull: { x: 0, y: 0 },
    activeSide: 'right',
    armOpen: { top: 0, bottom: 0, left: 0, right: 0 },
    targetArmOpen: { top: 0, bottom: 0, left: 0, right: 0 },
    armDrags: {
      top: { x: 0, y: 0 },
      bottom: { x: 0, y: 0 },
      left: { x: 0, y: 0 },
      right: { x: 0, y: 0 },
    },
    targetArmDrags: {
      top: { x: 0, y: 0 },
      bottom: { x: 0, y: 0 },
      left: { x: 0, y: 0 },
      right: { x: 0, y: 0 },
    },
    liftOffset: { x: 0, y: 0 },
    targetLiftOffset: { x: 0, y: 0 },
    liftScale: 1,
    targetLiftScale: 1,
    liftRot: 0,
    targetLiftRot: 0,
    opacity: 1,
    targetOpacity: 1,
    settledSide: 'right',
  });

  const dragSessionRef = useRef<{
    mode: 'none' | 'untie' | 'openArm' | 'remove';
    armKey: WrapArmKey;
    pointerId: number | null;
    startSvg: Vec2;
    baseU: number;
    baseArmOpen: number;
    lastSvg: Vec2;
    completedRemoval: boolean;
  }>({
    mode: 'none',
    armKey: 'top',
    pointerId: null,
    startSvg: { x: 0, y: 0 },
    baseU: 0,
    baseArmOpen: 0,
    lastSvg: { x: 0, y: 0 },
    completedRemoval: false,
  });

  useEffect(() => {
    const p = physicsRef.current;
    if (phase === 'CLOSED_WITH_RIBBON') {
      p.u = 0;
      p.targetU = 0;
      p.pull = { x: 0, y: 0 };
      p.targetPull = { x: 0, y: 0 };
      p.armOpen = { top: 0, bottom: 0, left: 0, right: 0 };
      p.targetArmOpen = { top: 0, bottom: 0, left: 0, right: 0 };
      p.armDrags = {
        top: { x: 0, y: 0 },
        bottom: { x: 0, y: 0 },
        left: { x: 0, y: 0 },
        right: { x: 0, y: 0 },
      };
      p.targetArmDrags = {
        top: { x: 0, y: 0 },
        bottom: { x: 0, y: 0 },
        left: { x: 0, y: 0 },
        right: { x: 0, y: 0 },
      };
      p.liftOffset = { x: 0, y: 0 };
      p.targetLiftOffset = { x: 0, y: 0 };
      p.liftScale = 1;
      p.targetLiftScale = 1;
      p.liftRot = 0;
      p.targetLiftRot = 0;
      p.opacity = 1;
      p.targetOpacity = 1;
      dragSessionRef.current.completedRemoval = false;
      setOpenedArms({ top: false, bottom: false, left: false, right: false });
      onOpenedSidesChange?.(0);
    } else if (phase === 'RIBBON_LOOSE') {
      p.targetU = 1;
      p.targetPull = { x: 0, y: 0 };
      p.targetOpacity = 1;
    } else if (phase === 'RIBBON_REMOVED') {
      p.targetU = 1;
      p.targetArmOpen = { top: 1, bottom: 1, left: 1, right: 1 };
      const isRight = p.settledSide === 'right';
      p.targetLiftOffset = isCompactViewport
        ? { x: isRight ? 85 : -210, y: 215 }
        : { x: isRight ? 185 : -390, y: 120 };
      p.targetLiftScale = 0.94;
      p.targetLiftRot = isRight ? 18 : -20;
      p.targetOpacity = 0.95;
    } else if (phase === 'LETTER_UNFOLDED') {
      p.targetOpacity = 0.25;
    } else if (
      phase === 'ENVELOPE_OPENING' ||
      phase === 'ENVELOPE_OPEN' ||
      phase === 'LETTER_EXTRACTION'
    ) {
      p.targetOpacity = 0.85;
    }
  }, [phase, isCompactViewport, onOpenedSidesChange]);

  const clientToSvg = (clientX: number, clientY: number): Vec2 => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  useEffect(() => {
    let rafId = 0;
    let untieCompleteSent = false;

    const tick = () => {
      const p = physicsRef.current;

      const uRate = dragSessionRef.current.mode === 'untie' ? 0.28 : 0.14;
      p.u = lerp(p.u, p.targetU, uRate);
      p.pull.x = lerp(p.pull.x, p.targetPull.x, 0.24);
      p.pull.y = lerp(p.pull.y, p.targetPull.y, 0.24);

      const armRate = dragSessionRef.current.mode === 'openArm' ? 0.3 : 0.15;
      (['top', 'bottom', 'left', 'right'] as WrapArmKey[]).forEach((k) => {
        p.armOpen[k] = lerp(p.armOpen[k], p.targetArmOpen[k], armRate);
        p.armDrags[k].x = lerp(p.armDrags[k].x, p.targetArmDrags[k].x, 0.24);
        p.armDrags[k].y = lerp(p.armDrags[k].y, p.targetArmDrags[k].y, 0.24);
      });

      p.liftOffset.x = lerp(p.liftOffset.x, p.targetLiftOffset.x, 0.16);
      p.liftOffset.y = lerp(p.liftOffset.y, p.targetLiftOffset.y, 0.16);
      p.liftScale = lerp(p.liftScale, p.targetLiftScale, 0.16);
      p.liftRot = lerp(p.liftRot, p.targetLiftRot, 0.16);
      p.opacity = lerp(p.opacity, p.targetOpacity, 0.12);

      if (
        phaseRef.current === 'UNTIE_IN_PROGRESS' &&
        p.targetU >= 0.99 &&
        p.u >= 0.96 &&
        !untieCompleteSent
      ) {
        untieCompleteSent = true;
        onUntieComplete();
      }
      if (phaseRef.current === 'CLOSED_WITH_RIBBON') {
        untieCompleteSent = false;
      }

      const geo = computeBowGeometry(p.u, p.activeSide, p.pull, p.armOpen, p.armDrags);
      const liftDist = Math.hypot(p.liftOffset.x, p.liftOffset.y);
      const shadowShiftX = 3.5 + clamp(liftDist * 0.06, 0, 14);
      const shadowShiftY = 6 + clamp(liftDist * 0.08, 0, 18);

      if (groupRef.current) {
        groupRef.current.setAttribute(
          'transform',
          `translate(${p.liftOffset.x.toFixed(2)}, ${p.liftOffset.y.toFixed(2)}) rotate(${p.liftRot.toFixed(2)}, ${geo.bowCenter.x}, ${geo.bowCenter.y}) scale(${p.liftScale.toFixed(3)})`
        );
        groupRef.current.style.opacity = p.opacity.toFixed(3);
      }

      if (ambientShadowGroupRef.current) {
        ambientShadowGroupRef.current.setAttribute(
          'transform',
          `translate(${(p.liftOffset.x + shadowShiftX).toFixed(2)}, ${(p.liftOffset.y + shadowShiftY).toFixed(2)}) rotate(${p.liftRot.toFixed(2)}, ${geo.bowCenter.x}, ${geo.bowCenter.y}) scale(${p.liftScale.toFixed(3)})`
        );
        ambientShadowGroupRef.current.style.opacity = (
          p.opacity * clamp(1 - liftDist / 450, 0.35, 1)
        ).toFixed(3);
      }

      if (contactShadowGroupRef.current) {
        const contactFade = clamp(1 - liftDist / 70, 0.2, 1);
        contactShadowGroupRef.current.setAttribute(
          'transform',
          `translate(${(p.liftOffset.x + 1.2).toFixed(2)}, ${(p.liftOffset.y + 2.1).toFixed(2)}) rotate(${p.liftRot.toFixed(2)}, ${geo.bowCenter.x}, ${geo.bowCenter.y}) scale(${p.liftScale.toFixed(3)})`
        );
        contactShadowGroupRef.current.style.opacity = (p.opacity * contactFade).toFixed(3);
      }

      // 4 Wrap Arms (Top, Bottom, Left, Right) + shadows + cues
      applyMeshToRefs(topArmRef.current, geo.topArm, 0);
      applyMeshToRefs(bottomArmRef.current, geo.bottomArm, 0);
      applyMeshToRefs(leftArmRef.current, geo.leftArm, 0);
      applyMeshToRefs(rightArmRef.current, geo.rightArm, 0);

      shTopArmRef.current?.setAttribute('d', geo.topArm.bodyPath);
      shBottomArmRef.current?.setAttribute('d', geo.bottomArm.bodyPath);
      shLeftArmRef.current?.setAttribute('d', geo.leftArm.bodyPath);
      shRightArmRef.current?.setAttribute('d', geo.rightArm.bodyPath);

      cShTopArmRef.current?.setAttribute('d', geo.topArm.bodyPath);
      cShBottomArmRef.current?.setAttribute('d', geo.bottomArm.bodyPath);
      cShLeftArmRef.current?.setAttribute('d', geo.leftArm.bodyPath);
      cShRightArmRef.current?.setAttribute('d', geo.rightArm.bodyPath);

      (['top', 'bottom', 'left', 'right'] as WrapArmKey[]).forEach((k) => {
        const cueEl = armCueRefs.current[k];
        if (cueEl) {
          cueEl.setAttribute('cx', geo.armTips[k].x.toFixed(1));
          cueEl.setAttribute('cy', geo.armTips[k].y.toFixed(1));
        }
      });

      // Left loop
      if (lLoopBackGroupRef.current) lLoopBackGroupRef.current.style.opacity = geo.leftLoopOpacity.toFixed(3);
      applyMeshToRefs(lLoopBackRef.current, geo.leftLoopBack, geo.pleatsOpacity);
      if (lLoopCavernRef.current) {
        lLoopCavernRef.current.setAttribute('d', geo.leftLoopCavernPath);
        lLoopCavernRef.current.style.opacity = (geo.leftLoopOpacity * geo.pleatsOpacity).toFixed(3);
      }
      if (lLoopFrontGroupRef.current) lLoopFrontGroupRef.current.style.opacity = geo.leftLoopOpacity.toFixed(3);
      applyMeshToRefs(lLoopFrontRef.current, geo.leftLoopFront, geo.pleatsOpacity);
      if (shLLoopRef.current) {
        shLLoopRef.current.setAttribute('d', geo.leftLoopFront.bodyPath);
        shLLoopRef.current.style.opacity = geo.leftLoopOpacity.toFixed(3);
      }

      // Right loop
      if (rLoopBackGroupRef.current) rLoopBackGroupRef.current.style.opacity = geo.rightLoopOpacity.toFixed(3);
      applyMeshToRefs(rLoopBackRef.current, geo.rightLoopBack, geo.pleatsOpacity);
      if (rLoopCavernRef.current) {
        rLoopCavernRef.current.setAttribute('d', geo.rightLoopCavernPath);
        rLoopCavernRef.current.style.opacity = (geo.rightLoopOpacity * geo.pleatsOpacity).toFixed(3);
      }
      if (rLoopFrontGroupRef.current) rLoopFrontGroupRef.current.style.opacity = geo.rightLoopOpacity.toFixed(3);
      applyMeshToRefs(rLoopFrontRef.current, geo.rightLoopFront, geo.pleatsOpacity);
      if (shRLoopRef.current) {
        shRLoopRef.current.setAttribute('d', geo.rightLoopFront.bodyPath);
        shRLoopRef.current.style.opacity = geo.rightLoopOpacity.toFixed(3);
      }

      // Hanging tails
      if (tailsGroupRef.current) tailsGroupRef.current.style.opacity = geo.tailsOpacity.toFixed(3);
      applyMeshToRefs(lTailRef.current, geo.leftTail, geo.pleatsOpacity);
      applyMeshToRefs(rTailRef.current, geo.rightTail, geo.pleatsOpacity);

      if (shLTailRef.current) {
        shLTailRef.current.setAttribute('d', geo.leftTail.bodyPath);
        shLTailRef.current.style.opacity = geo.tailsOpacity.toFixed(3);
      }
      if (cShLTailRef.current) {
        cShLTailRef.current.setAttribute('d', geo.leftTail.bodyPath);
        cShLTailRef.current.style.opacity = geo.tailsOpacity.toFixed(3);
      }
      if (shRTailRef.current) {
        shRTailRef.current.setAttribute('d', geo.rightTail.bodyPath);
        shRTailRef.current.style.opacity = geo.tailsOpacity.toFixed(3);
      }
      if (cShRTailRef.current) {
        cShRTailRef.current.setAttribute('d', geo.rightTail.bodyPath);
        cShRTailRef.current.style.opacity = geo.tailsOpacity.toFixed(3);
      }

      // Continuous loose bow strip
      if (looseStripGroupRef.current) {
        looseStripGroupRef.current.style.opacity = geo.looseStripOpacity.toFixed(3);
      }
      applyMeshToRefs(looseStripRef.current, geo.continuousLooseStrip, 0);
      if (shLooseRef.current) {
        shLooseRef.current.setAttribute('d', geo.continuousLooseStrip.bodyPath);
        shLooseRef.current.style.opacity = geo.looseStripOpacity.toFixed(3);
      }
      if (cShLooseRef.current) {
        cShLooseRef.current.setAttribute('d', geo.continuousLooseStrip.bodyPath);
        cShLooseRef.current.style.opacity = geo.looseStripOpacity.toFixed(3);
      }

      // Center knot
      const kt = geo.knotTransform;
      if (knotGroupRef.current) {
        knotGroupRef.current.style.opacity = geo.knotOpacity.toFixed(3);
        knotGroupRef.current.setAttribute(
          'transform',
          `translate(${kt.cx.toFixed(2)}, ${kt.cy.toFixed(2)}) rotate(${kt.rotateDeg.toFixed(2)}) scale(${kt.scaleX.toFixed(3)}, ${kt.scaleY.toFixed(3)})`
        );
      }
      if (cShKnotRef.current) {
        cShKnotRef.current.style.opacity = geo.knotOpacity.toFixed(3);
        cShKnotRef.current.setAttribute('cx', kt.cx.toFixed(2));
        cShKnotRef.current.setAttribute('cy', (kt.cy + 2).toFixed(2));
      }

      if (leftHitRef.current) {
        leftHitRef.current.setAttribute('cx', geo.leftTailTip.x.toFixed(1));
        leftHitRef.current.setAttribute('cy', geo.leftTailTip.y.toFixed(1));
      }
      if (rightHitRef.current) {
        rightHitRef.current.setAttribute('cx', geo.rightTailTip.x.toFixed(1));
        rightHitRef.current.setAttribute('cy', geo.rightTailTip.y.toFixed(1));
      }
      if (rightCueRef.current) {
        rightCueRef.current.setAttribute('cx', geo.rightTailTip.x.toFixed(1));
        rightCueRef.current.setAttribute('cy', geo.rightTailTip.y.toFixed(1));
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onUntieComplete]);

  const markArmOpened = (armKey: WrapArmKey) => {
    const prev = openedArmsRef.current;
    if (prev[armKey]) return;
    const next = { ...prev, [armKey]: true };
    openedArmsRef.current = next;
    setOpenedArms(next);
    const count = (['top', 'bottom', 'left', 'right'] as WrapArmKey[]).filter((k) => next[k]).length;
    onOpenedSidesChange?.(count);
  };

  const handleTailPointerDown = (side: RibbonSide) => (e: React.PointerEvent<SVGElement>) => {
    if (phase !== 'CLOSED_WITH_RIBBON' && phase !== 'UNTIE_IN_PROGRESS') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const svgPt = clientToSvg(e.clientX, e.clientY);
    physicsRef.current.activeSide = side;

    dragSessionRef.current = {
      mode: 'untie',
      armKey: 'top',
      pointerId: e.pointerId,
      startSvg: svgPt,
      baseU: physicsRef.current.u,
      baseArmOpen: 0,
      lastSvg: svgPt,
      completedRemoval: false,
    };

    if (phase === 'CLOSED_WITH_RIBBON') {
      onUntieStart();
    }
  };

  const handleArmPointerDown = (armKey: WrapArmKey) => (e: React.PointerEvent<SVGElement>) => {
    if (phase !== 'RIBBON_LOOSE' || openedArmsRef.current[armKey]) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const svgPt = clientToSvg(e.clientX, e.clientY);
    dragSessionRef.current = {
      mode: 'openArm',
      armKey,
      pointerId: e.pointerId,
      startSvg: svgPt,
      baseU: 1,
      baseArmOpen: physicsRef.current.armOpen[armKey],
      lastSvg: svgPt,
      completedRemoval: false,
    };
  };

  const handleLooseRibbonPointerDown = (e: React.PointerEvent<SVGElement>) => {
    if (phase !== 'RIBBON_LOOSE' || !allSidesOpened) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const svgPt = clientToSvg(e.clientX, e.clientY);
    dragSessionRef.current = {
      mode: 'remove',
      armKey: 'top',
      pointerId: e.pointerId,
      startSvg: svgPt,
      baseU: 1,
      baseArmOpen: 1,
      lastSvg: svgPt,
      completedRemoval: false,
    };

    physicsRef.current.targetLiftScale = 1.03;
  };

  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
    const session = dragSessionRef.current;
    if (session.mode === 'none' || session.pointerId !== e.pointerId) return;

    const svgPt = clientToSvg(e.clientX, e.clientY);
    const dx = svgPt.x - session.startSvg.x;
    const dy = svgPt.y - session.startSvg.y;
    const p = physicsRef.current;

    if (session.mode === 'untie') {
      const dir = p.activeSide === 'right' ? 1 : -1;
      const directionalPull = dx * dir * 0.85 + dy * 0.52;
      const radialAssist = Math.hypot(dx, dy) * 0.35 * (dx * dir > -20 ? 1 : 0);
      const effectiveDist = Math.max(0, directionalPull + radialAssist);

      const nextU = clamp(session.baseU + effectiveDist / 145, 0, 1);
      p.targetU = nextU;
      p.targetPull = {
        x: clamp(dx, -170, 170),
        y: clamp(dy, -75, 135),
      };
      onUntieProgress?.(nextU);

      if (nextU >= 0.96) {
        p.targetU = 1;
        p.targetPull = { x: 0, y: 0 };
        session.mode = 'none';
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }
    } else if (session.mode === 'openArm') {
      const key = session.armKey;
      // Forgiving pull distance in any natural peeling direction (inward or outward)
      const dragDist = Math.hypot(dx, dy);
      const nextOpen = clamp(session.baseArmOpen + dragDist / 68, 0, 1);
      p.targetArmOpen[key] = nextOpen;
      p.targetArmDrags[key] = {
        x: clamp(dx, -75, 75),
        y: clamp(dy, -75, 75),
      };

      if (nextOpen >= 0.9) {
        p.targetArmOpen[key] = 1;
        p.targetArmDrags[key] = { x: 0, y: 0 };
        markArmOpened(key);
        session.mode = 'none';
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }
    } else if (session.mode === 'remove') {
      const vx = svgPt.x - session.lastSvg.x;
      session.lastSvg = svgPt;

      p.targetLiftOffset = { x: dx, y: dy };
      p.targetLiftRot = clamp(dx * 0.06 + vx * 0.65, -20, 20);
      p.targetLiftScale = 1.03;

      const dist = Math.hypot(dx, dy);
      if (dist > 145 && !session.completedRemoval) {
        session.completedRemoval = true;
        session.mode = 'none';
        p.settledSide = dx >= 0 ? 'right' : 'left';
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        onRibbonRemoved();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGElement>) => {
    const session = dragSessionRef.current;
    if (session.mode === 'none' || session.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const p = physicsRef.current;

    if (session.mode === 'untie') {
      if (p.targetU >= 0.82) {
        p.targetU = 1;
        p.targetPull = { x: 0, y: 0 };
      } else {
        p.targetPull = { x: 0, y: 0 };
        if (p.targetU < 0.18) {
          p.targetU = 0;
        }
      }
    } else if (session.mode === 'openArm') {
      const key = session.armKey;
      if (p.targetArmOpen[key] >= 0.45) {
        p.targetArmOpen[key] = 1;
        p.targetArmDrags[key] = { x: 0, y: 0 };
        markArmOpened(key);
      } else {
        p.targetArmOpen[key] = 0;
        p.targetArmDrags[key] = { x: 0, y: 0 };
      }
    } else if (session.mode === 'remove') {
      const dist = Math.hypot(p.targetLiftOffset.x, p.targetLiftOffset.y);
      if (dist >= 95 && !session.completedRemoval) {
        session.completedRemoval = true;
        p.settledSide = p.targetLiftOffset.x >= 0 ? 'right' : 'left';
        onRibbonRemoved();
      } else {
        p.targetLiftOffset = { x: 0, y: 0 };
        p.targetLiftRot = 0;
        p.targetLiftScale = 1;
      }
    }

    session.mode = 'none';
    session.pointerId = null;
  };

  const isUntiePhase = phase === 'CLOSED_WITH_RIBBON' || phase === 'UNTIE_IN_PROGRESS';
  const isLoosePhase = phase === 'RIBBON_LOOSE';

  const renderSatinMeshLayers = (
    refs: MeshDomRefs,
    baseFill: string,
    options: { withPleats?: boolean; isBack?: boolean } = {}
  ) => {
    const { withPleats = false, isBack = false } = options;
    return (
      <>
        <path
          ref={(el) => {
            refs.body = el;
          }}
          fill={baseFill}
        />
        {!isBack && (
          <path
            ref={(el) => {
              refs.coreShadow = el;
            }}
            fill="url(#satin-core-shadow)"
            className="pointer-events-none"
          />
        )}
        <path
          ref={(el) => {
            refs.sheen = el;
          }}
          fill={isBack ? 'url(#satin-sheen-soft)' : 'url(#satin-sheen)'}
          className="pointer-events-none"
        />
        {!isBack && (
          <path
            ref={(el) => {
              refs.bounce = el;
            }}
            fill="url(#satin-bounce-light)"
            className="pointer-events-none"
          />
        )}
        <path
          ref={(el) => {
            refs.weave = el;
          }}
          fill="url(#satin-micro-weave)"
          className="pointer-events-none"
        />
        {withPleats &&
          [0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              <path
                ref={(el) => {
                  refs.pleatShadows[i] = el;
                }}
                fill="none"
                stroke="rgba(128, 62, 83, 0.36)"
                strokeWidth="1.35"
                strokeLinecap="round"
                className="pointer-events-none"
              />
              <path
                ref={(el) => {
                  refs.pleatHighlights[i] = el;
                }}
                fill="none"
                stroke="rgba(255, 246, 249, 0.56)"
                strokeWidth="0.95"
                strokeLinecap="round"
                className="pointer-events-none"
              />
            </React.Fragment>
          ))}
        <path
          ref={(el) => {
            refs.edgeTop = el;
          }}
          fill="none"
          stroke={isBack ? 'rgba(248, 224, 232, 0.35)' : 'rgba(255, 248, 250, 0.78)'}
          strokeWidth="0.8"
          className="pointer-events-none"
        />
        <path
          ref={(el) => {
            refs.edgeBot = el;
          }}
          fill="none"
          stroke="rgba(145, 76, 97, 0.42)"
          strokeWidth="0.75"
          className="pointer-events-none"
        />
      </>
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox="-160 -130 760 560"
      className="pointer-events-none absolute inset-0 w-full h-full overflow-visible select-none"
      aria-label="Ruban de satin rose noué autour du télégramme"
    >
      <defs>
        <linearGradient id="satin-pink-main" x1="8%" y1="0%" x2="92%" y2="100%">
          <stop offset="0%" stopColor="#F5CFD9" />
          <stop offset="28%" stopColor="#E8A6B7" />
          <stop offset="56%" stopColor="#D78DA2" />
          <stop offset="82%" stopColor="#E5A2B4" />
          <stop offset="100%" stopColor="#F1C2CF" />
        </linearGradient>

        <linearGradient id="satin-band-h" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5CED9" />
          <stop offset="24%" stopColor="#E8A6B7" />
          <stop offset="70%" stopColor="#CE879D" />
          <stop offset="100%" stopColor="#B66D83" />
        </linearGradient>

        <linearGradient id="satin-band-v" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F5CED9" />
          <stop offset="28%" stopColor="#E8A6B7" />
          <stop offset="72%" stopColor="#CE879D" />
          <stop offset="100%" stopColor="#B66D83" />
        </linearGradient>

        <linearGradient id="satin-pink-back" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#944C62" />
          <stop offset="48%" stopColor="#B56C82" />
          <stop offset="100%" stopColor="#8A4459" />
        </linearGradient>

        <linearGradient id="satin-core-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B66A81" stopOpacity="0.42" />
          <stop offset="50%" stopColor="#C98297" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#9E556B" stopOpacity="0.45" />
        </linearGradient>

        <linearGradient id="satin-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF8FA" stopOpacity="0.72" />
          <stop offset="45%" stopColor="#FCE4EB" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#F3C5D2" stopOpacity="0.16" />
        </linearGradient>

        <linearGradient id="satin-sheen-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F6D0DA" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#C98297" stopOpacity="0.05" />
        </linearGradient>

        <linearGradient id="satin-bounce-light" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2EC" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#F8DCE2" stopOpacity="0.18" />
        </linearGradient>

        <radialGradient id="satin-knot-grad" cx="34%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FCE7ED" />
          <stop offset="32%" stopColor="#E8A6B7" />
          <stop offset="76%" stopColor="#C47B91" />
          <stop offset="100%" stopColor="#965065" />
        </radialGradient>

        <pattern id="satin-micro-weave" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
          <path d="M 0 0.6 L 2.4 0.6" stroke="#FFFFFF" strokeWidth="0.35" strokeOpacity="0.18" />
          <path d="M 0 1.8 L 2.4 1.8" stroke="#8E4A5F" strokeWidth="0.28" strokeOpacity="0.12" />
          <path d="M 0.8 0 L 0.8 2.4" stroke="#FFFFFF" strokeWidth="0.22" strokeOpacity="0.1" />
          <path d="M 2.0 0 L 2.0 2.4" stroke="#7A3C4F" strokeWidth="0.2" strokeOpacity="0.09" />
        </pattern>

        <filter id="ribbon-ambient-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5.2" />
        </filter>
        <filter id="ribbon-contact-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id="loop-cavern-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* Layer A: Wide soft ambient shadow */}
      <g ref={ambientShadowGroupRef} filter="url(#ribbon-ambient-shadow)" className="pointer-events-none">
        <path ref={shTopArmRef} fill="rgba(57, 48, 46, 0.14)" />
        <path ref={shBottomArmRef} fill="rgba(57, 48, 46, 0.14)" />
        <path ref={shLeftArmRef} fill="rgba(57, 48, 46, 0.15)" />
        <path ref={shRightArmRef} fill="rgba(57, 48, 46, 0.15)" />
        <path ref={shLLoopRef} fill="rgba(57, 48, 46, 0.23)" />
        <path ref={shRLoopRef} fill="rgba(57, 48, 46, 0.23)" />
        <path ref={shLTailRef} fill="rgba(57, 48, 46, 0.19)" />
        <path ref={shRTailRef} fill="rgba(57, 48, 46, 0.19)" />
        <path ref={shLooseRef} fill="rgba(57, 48, 46, 0.18)" />
      </g>

      {/* Layer B: Tight crisp contact ambient occlusion */}
      <g ref={contactShadowGroupRef} filter="url(#ribbon-contact-shadow)" className="pointer-events-none">
        <path ref={cShTopArmRef} fill="rgba(64, 42, 46, 0.17)" />
        <path ref={cShBottomArmRef} fill="rgba(64, 42, 46, 0.17)" />
        <path ref={cShLeftArmRef} fill="rgba(64, 42, 46, 0.17)" />
        <path ref={cShRightArmRef} fill="rgba(64, 42, 46, 0.17)" />
        <path ref={cShLTailRef} fill="rgba(64, 42, 46, 0.18)" />
        <path ref={cShRTailRef} fill="rgba(64, 42, 46, 0.18)" />
        <path ref={cShLooseRef} fill="rgba(64, 42, 46, 0.17)" />
        <ellipse ref={cShKnotRef} cx={316} cy={150} rx={18} ry={15} fill="rgba(58, 32, 39, 0.34)" />
      </g>

      {/* Layer C: Main satin ribbon assembly */}
      <g ref={groupRef}>
        {/* 4 Individually Openable Wrapped Sides (Top, Bottom, Left, Right) */}
        <g>
          {/* TOP SIDE ARM */}
          <g
            onPointerDown={handleArmPointerDown('top')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ pointerEvents: isLoosePhase && !openedArms.top ? 'auto' : 'none' }}
            className={isLoosePhase && !openedArms.top ? 'cursor-grab active:cursor-grabbing' : ''}
          >
            {renderSatinMeshLayers(topArmRef.current, 'url(#satin-band-v)')}
            {isLoosePhase && !openedArms.top && (
              <>
                <circle
                  ref={(el) => {
                    armCueRefs.current.top = el;
                  }}
                  cx={316}
                  cy={-3}
                  r={14}
                  fill="none"
                  stroke="#C98297"
                  strokeWidth="1.2"
                  className="pointer-events-none opacity-65 motion-safe:animate-ping"
                  style={{ animationDuration: '2.6s' }}
                />
                <rect x={286} y={-24} width={60} height={155} rx={20} fill="transparent" />
              </>
            )}
          </g>

          {/* BOTTOM SIDE ARM */}
          <g
            onPointerDown={handleArmPointerDown('bottom')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ pointerEvents: isLoosePhase && !openedArms.bottom ? 'auto' : 'none' }}
            className={isLoosePhase && !openedArms.bottom ? 'cursor-grab active:cursor-grabbing' : ''}
          >
            {renderSatinMeshLayers(bottomArmRef.current, 'url(#satin-band-v)')}
            {isLoosePhase && !openedArms.bottom && (
              <>
                <circle
                  ref={(el) => {
                    armCueRefs.current.bottom = el;
                  }}
                  cx={316}
                  cy={303}
                  r={14}
                  fill="none"
                  stroke="#C98297"
                  strokeWidth="1.2"
                  className="pointer-events-none opacity-65 motion-safe:animate-ping"
                  style={{ animationDuration: '2.6s' }}
                />
                <rect x={286} y={168} width={60} height={155} rx={20} fill="transparent" />
              </>
            )}
          </g>

          {/* LEFT SIDE ARM */}
          <g
            onPointerDown={handleArmPointerDown('left')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ pointerEvents: isLoosePhase && !openedArms.left ? 'auto' : 'none' }}
            className={isLoosePhase && !openedArms.left ? 'cursor-grab active:cursor-grabbing' : ''}
          >
            {renderSatinMeshLayers(leftArmRef.current, 'url(#satin-band-h)')}
            {isLoosePhase && !openedArms.left && (
              <>
                <circle
                  ref={(el) => {
                    armCueRefs.current.left = el;
                  }}
                  cx={-3}
                  cy={148}
                  r={14}
                  fill="none"
                  stroke="#C98297"
                  strokeWidth="1.2"
                  className="pointer-events-none opacity-65 motion-safe:animate-ping"
                  style={{ animationDuration: '2.6s' }}
                />
                <rect x={-24} y={118} width={310} height={60} rx={20} fill="transparent" />
              </>
            )}
          </g>

          {/* RIGHT SIDE ARM */}
          <g
            onPointerDown={handleArmPointerDown('right')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ pointerEvents: isLoosePhase && !openedArms.right ? 'auto' : 'none' }}
            className={isLoosePhase && !openedArms.right ? 'cursor-grab active:cursor-grabbing' : ''}
          >
            {renderSatinMeshLayers(rightArmRef.current, 'url(#satin-band-h)')}
            {isLoosePhase && !openedArms.right && (
              <>
                <circle
                  ref={(el) => {
                    armCueRefs.current.right = el;
                  }}
                  cx={443}
                  cy={148}
                  r={14}
                  fill="none"
                  stroke="#C98297"
                  strokeWidth="1.2"
                  className="pointer-events-none opacity-65 motion-safe:animate-ping"
                  style={{ animationDuration: '2.6s' }}
                />
                <rect x={338} y={118} width={128} height={60} rx={20} fill="transparent" />
              </>
            )}
          </g>
        </g>

        {/* Back layer of bow loops + deep hollow cavern ambient occlusion */}
        <g ref={lLoopBackGroupRef}>
          {renderSatinMeshLayers(lLoopBackRef.current, 'url(#satin-pink-back)', {
            withPleats: true,
            isBack: true,
          })}
          <path
            ref={lLoopCavernRef}
            fill="rgba(78, 33, 47, 0.48)"
            filter="url(#loop-cavern-blur)"
            className="pointer-events-none"
          />
        </g>
        <g ref={rLoopBackGroupRef}>
          {renderSatinMeshLayers(rLoopBackRef.current, 'url(#satin-pink-back)', {
            withPleats: true,
            isBack: true,
          })}
          <path
            ref={rLoopCavernRef}
            fill="rgba(78, 33, 47, 0.48)"
            filter="url(#loop-cavern-blur)"
            className="pointer-events-none"
          />
        </g>

        {/* Hanging tails (grabbable during Phase 1 & 2) */}
        <g ref={tailsGroupRef}>
          <g
            onPointerDown={handleTailPointerDown('left')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ pointerEvents: isUntiePhase ? 'auto' : 'none' }}
            className={isUntiePhase ? 'cursor-grab active:cursor-grabbing' : ''}
          >
            {renderSatinMeshLayers(lTailRef.current, 'url(#satin-pink-main)', {
              withPleats: true,
            })}
            {isUntiePhase && (
              <circle
                ref={leftHitRef}
                cx={258}
                cy={262}
                r={36}
                fill="transparent"
                className="cursor-grab active:cursor-grabbing"
              />
            )}
          </g>

          <g
            onPointerDown={handleTailPointerDown('right')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ pointerEvents: isUntiePhase ? 'auto' : 'none' }}
            className={isUntiePhase ? 'cursor-grab active:cursor-grabbing' : ''}
          >
            {renderSatinMeshLayers(rTailRef.current, 'url(#satin-pink-main)', {
              withPleats: true,
            })}
            {phase === 'CLOSED_WITH_RIBBON' && (
              <circle
                ref={rightCueRef}
                cx={376}
                cy={256}
                r={17}
                fill="none"
                stroke="#C98297"
                strokeWidth="1.2"
                className="pointer-events-none opacity-45 motion-safe:animate-ping"
                style={{ animationDuration: '2.8s' }}
              />
            )}
            {isUntiePhase && (
              <circle
                ref={rightHitRef}
                cx={376}
                cy={256}
                r={36}
                fill="transparent"
                className="cursor-grab active:cursor-grabbing"
              />
            )}
          </g>
        </g>

        {/* Continuous untied bow strip */}
        <g ref={looseStripGroupRef}>
          {renderSatinMeshLayers(looseStripRef.current, 'url(#satin-pink-main)')}
        </g>

        {/* Front arches of bow loops */}
        <g ref={lLoopFrontGroupRef} className="pointer-events-none">
          {renderSatinMeshLayers(lLoopFrontRef.current, 'url(#satin-pink-main)', {
            withPleats: true,
          })}
        </g>
        <g ref={rLoopFrontGroupRef} className="pointer-events-none">
          {renderSatinMeshLayers(rLoopFrontRef.current, 'url(#satin-pink-main)', {
            withPleats: true,
          })}
        </g>

        {/* Sculpted crisp tailored center knot */}
        <g ref={knotGroupRef} className="pointer-events-none">
          <path
            d="M -11,-14 L 11,-14 C 13.5,-6 13.5,6 11,14 L -11,14 C -13.5,6 -13.5,-6 -11,-14 Z"
            fill="url(#satin-knot-grad)"
            stroke="rgba(145, 76, 97, 0.44)"
            strokeWidth="0.85"
          />
          <path
            d="M -11,-14 L 11,-14 C 13.5,-6 13.5,6 11,14 L -11,14 C -13.5,6 -13.5,-6 -11,-14 Z"
            fill="url(#satin-micro-weave)"
          />
          <path
            d="M -7,-11 L -6,11 M 0,-12 L 0,12 M 7,-11 L 6,11"
            fill="none"
            stroke="rgba(128, 62, 83, 0.45)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <path
            d="M -4.5,-10 L -3.8,10 M 2.5,-11 L 2.2,11"
            fill="none"
            stroke="rgba(255, 245, 248, 0.56)"
            strokeWidth="0.85"
            strokeLinecap="round"
          />
          <rect x="-9" y="-9" width="18" height="6" rx="2.5" fill="rgba(255, 246, 249, 0.42)" />
          <path
            d="M -9,12.5 L 9,12.5"
            fill="none"
            stroke="rgba(255, 238, 236, 0.45)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>

        {/* Once all 4 sides are opened, user can grab the freed ribbon anywhere and slide it off */}
        {isLoosePhase && allSidesOpened && (
          <g
            onPointerDown={handleLooseRibbonPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ pointerEvents: 'auto' }}
            className="cursor-grab active:cursor-grabbing"
          >
            <rect x={200} y={70} width={220} height={175} rx={36} fill="transparent" />
          </g>
        )}
      </g>
    </svg>
  );
};
