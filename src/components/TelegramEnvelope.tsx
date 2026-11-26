import React, { useEffect, useRef, useState } from 'react';
import type { LetterConfig, TelegramPhase } from '../types/telegram';
import { clamp, lerp } from '../utils/ribbonGeometry';
import { SatinRibbon } from './SatinRibbon';

interface TelegramEnvelopeProps {
  phase: TelegramPhase;
  config: LetterConfig;
  isCompactViewport: boolean;
  onUntieStart: () => void;
  onUntieComplete: () => void;
  onOpenedSidesChange?: (openedCount: number) => void;
  onRibbonRemoved: () => void;
  onFlapOpenStart: () => void;
  onFlapOpened: () => void;
  onFlapClosed: () => void;
  onLetterExtractStart: () => void;
  onLetterExtracted: () => void;
}

const PAPER_GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`;

export const TelegramEnvelope: React.FC<TelegramEnvelopeProps> = ({
  phase,
  config,
  isCompactViewport,
  onUntieStart,
  onUntieComplete,
  onOpenedSidesChange,
  onRibbonRemoved,
  onFlapOpenStart,
  onFlapOpened,
  onFlapClosed,
  onLetterExtractStart,
  onLetterExtracted,
}) => {
  const envelopeRef = useRef<HTMLDivElement | null>(null);
  const flapRef = useRef<HTMLDivElement | null>(null);
  const flapShadowRef = useRef<HTMLDivElement | null>(null);
  const letterRef = useRef<HTMLDivElement | null>(null);

  const [flapPastHalf, setFlapPastHalf] = useState(false);

  const animRef = useRef({
    flap: 0,
    targetFlap: 0,
    extract: 0,
    targetExtract: 0,
    extractTilt: 0,
    targetExtractTilt: 0,
  });

  const flapDragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startY: number;
    baseFlap: number;
    completed: boolean;
  }>({
    active: false,
    pointerId: null,
    startY: 0,
    baseFlap: 0,
    completed: false,
  });

  const letterDragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startY: number;
    startX: number;
    baseExtract: number;
    completed: boolean;
  }>({
    active: false,
    pointerId: null,
    startY: 0,
    startX: 0,
    baseExtract: 0,
    completed: false,
  });

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Reset / sync targets on state machine transitions
  useEffect(() => {
    const a = animRef.current;
    if (
      phase === 'CLOSED_WITH_RIBBON' ||
      phase === 'UNTIE_IN_PROGRESS' ||
      phase === 'RIBBON_LOOSE' ||
      phase === 'RIBBON_REMOVED'
    ) {
      a.targetFlap = 0;
      a.targetExtract = 0;
      a.targetExtractTilt = 0;
      if (phase === 'CLOSED_WITH_RIBBON') {
        a.flap = 0;
        a.extract = 0;
        a.extractTilt = 0;
        setFlapPastHalf(false);
        flapDragRef.current.completed = false;
        letterDragRef.current.completed = false;
      }
    } else if (phase === 'ENVELOPE_OPEN') {
      a.targetFlap = 1;
      a.targetExtract = 0.12;
      a.targetExtractTilt = 0;
    } else if (phase === 'LETTER_UNFOLDED') {
      a.targetFlap = 1;
      a.targetExtract = 1;
      a.targetExtractTilt = 0;
    }
  }, [phase]);

  // Smooth 60fps spring loop for 3D flap fold & letter extraction
  useEffect(() => {
    let rafId = 0;
    let lastHalfState = false;
    let flapOpenNotified = false;
    let letterExtractNotified = false;

    const tick = () => {
      const a = animRef.current;

      const flapRate = flapDragRef.current.active ? 0.34 : 0.14;
      a.flap = lerp(a.flap, a.targetFlap, flapRate);

      const extRate = letterDragRef.current.active ? 0.34 : 0.14;
      a.extract = lerp(a.extract, a.targetExtract, extRate);
      a.extractTilt = lerp(a.extractTilt, a.targetExtractTilt, 0.2);

      // Flip flap z-index cleanly as it passes 88 degrees
      const isPast = a.flap >= 0.49;
      if (isPast !== lastHalfState) {
        lastHalfState = isPast;
        setFlapPastHalf(isPast);
      }

      if (phaseRef.current === 'ENVELOPE_OPENING') {
        if (a.targetFlap >= 0.99 && a.flap >= 0.94 && !flapOpenNotified) {
          flapOpenNotified = true;
          onFlapOpened();
        } else if (a.targetFlap <= 0.01 && a.flap <= 0.04 && !flapDragRef.current.active) {
          onFlapClosed();
        }
      } else {
        flapOpenNotified = false;
      }

      if (phaseRef.current === 'LETTER_EXTRACTION') {
        if (a.targetExtract >= 0.99 && a.extract >= 0.92 && !letterExtractNotified) {
          letterExtractNotified = true;
          onLetterExtracted();
        }
      } else {
        letterExtractNotified = false;
      }

      // Apply 3D flap rotation around its top crease line
      if (flapRef.current) {
        const angle = a.flap * 174;
        flapRef.current.style.transform = `rotateX(${angle.toFixed(2)}deg)`;
      }

      // Dynamic shadow beneath flap while lifting
      if (flapShadowRef.current) {
        const shadowOpacity = clamp(1 - a.flap * 1.45, 0, 1) * 0.22;
        const shadowY = 2 + a.flap * 14;
        flapShadowRef.current.style.opacity = shadowOpacity.toFixed(3);
        flapShadowRef.current.style.transform = `translateY(${shadowY.toFixed(1)}px)`;
      }

      // Apply letter extraction translation & subtle tilt
      if (letterRef.current) {
        const liftPct = a.extract * 102;
        const scale = 1 + a.extract * 0.04;
        letterRef.current.style.transform = `translate3d(0, -${liftPct.toFixed(2)}%, 0) rotate(${a.extractTilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onFlapOpened, onFlapClosed, onLetterExtracted]);

  // Flap drag handlers
  const handleFlapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'RIBBON_REMOVED' && phase !== 'ENVELOPE_OPENING') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    flapDragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startY: e.clientY,
      baseFlap: animRef.current.flap,
      completed: false,
    };

    if (phase === 'RIBBON_REMOVED') {
      onFlapOpenStart();
    }
  };

  const handleFlapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = flapDragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const envHeight = envelopeRef.current?.clientHeight || 280;
    const dy = e.clientY - drag.startY;
    // Dragging upward (negative dy) opens the flap
    const nextFlap = clamp(drag.baseFlap + -dy / (envHeight * 0.68), 0, 1);
    animRef.current.targetFlap = nextFlap;

    if (nextFlap >= 0.94 && !drag.completed) {
      drag.completed = true;
      drag.active = false;
      animRef.current.targetFlap = 1;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleFlapPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = flapDragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    drag.active = false;
    drag.pointerId = null;

    if (animRef.current.targetFlap >= 0.45) {
      animRef.current.targetFlap = 1;
    } else {
      animRef.current.targetFlap = 0;
    }
  };

  // Letter extraction drag handlers
  const handleLetterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'ENVELOPE_OPEN' && phase !== 'LETTER_EXTRACTION') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    letterDragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startY: e.clientY,
      startX: e.clientX,
      baseExtract: animRef.current.extract,
      completed: false,
    };

    if (phase === 'ENVELOPE_OPEN') {
      onLetterExtractStart();
    }
  };

  const handleLetterPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = letterDragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const envHeight = envelopeRef.current?.clientHeight || 280;
    const dy = e.clientY - drag.startY;
    const dx = e.clientX - drag.startX;

    const nextExtract = clamp(drag.baseExtract + -dy / (envHeight * 0.85), 0, 1);
    animRef.current.targetExtract = nextExtract;
    animRef.current.targetExtractTilt = clamp(dx * 0.04, -5, 5);

    if (nextExtract >= 0.84 && !drag.completed) {
      drag.completed = true;
      drag.active = false;
      animRef.current.targetExtract = 1;
      animRef.current.targetExtractTilt = 0;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleLetterPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = letterDragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    drag.active = false;
    drag.pointerId = null;

    if (animRef.current.targetExtract >= 0.52) {
      animRef.current.targetExtract = 1;
      animRef.current.targetExtractTilt = 0;
    } else {
      animRef.current.targetExtract =
        phaseRef.current === 'ENVELOPE_OPEN' || phaseRef.current === 'LETTER_EXTRACTION'
          ? 0.12
          : 0;
      animRef.current.targetExtractTilt = 0;
    }
  };

  const isRestingClosed = phase === 'CLOSED_WITH_RIBBON';
  const canGrabFlap = phase === 'RIBBON_REMOVED' || phase === 'ENVELOPE_OPENING';
  const canGrabLetter = phase === 'ENVELOPE_OPEN' || phase === 'LETTER_EXTRACTION';
  const isUnfolded = phase === 'LETTER_UNFOLDED';

  return (
    <div
      className={`relative transition-all duration-700 ease-out ${
        isUnfolded
          ? 'translate-y-20 scale-90 opacity-30 pointer-events-none'
          : phase === 'ENVELOPE_OPEN' || phase === 'LETTER_EXTRACTION'
          ? 'translate-y-12 sm:translate-y-14'
          : 'translate-y-0'
      }`}
    >
      <div
        ref={envelopeRef}
        className={`relative w-[min(86vw,440px)] aspect-[440/300] select-none ${
          isRestingClosed ? 'animate-gentle-float' : ''
        }`}
        style={{ perspective: '1300px' }}
      >
        {/* Ambient multi-layered desk shadow beneath the physical envelope */}
        <div
          className="pointer-events-none absolute inset-1 rounded-[4px] shadow-[0_26px_54px_-12px_rgba(57,48,46,0.28),0_10px_22px_-6px_rgba(57,48,46,0.16),0_2px_6px_rgba(57,48,46,0.1)]"
          aria-hidden="true"
        />

        {/* 1. Envelope Inner Back Wall & Blush Tissue Lining */}
        <div
          style={{ backgroundImage: PAPER_GRAIN_SVG }}
          className="absolute inset-0 rounded-[4px] bg-[#ECE0CE] border border-[#D9CBB7] overflow-hidden"
        >
          {/* Delicate rose-ivory French stationery lining */}
          <div
            className="absolute inset-[10px] rounded-[2px] opacity-85"
            style={{
              background:
                'linear-gradient(155deg, #F6E4E8 0%, #EFE0D8 58%, #E7D2D6 100%)',
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(201,130,151,0.08) 0px, rgba(201,130,151,0.08) 1px, transparent 1px, transparent 9px)',
            }}
          />
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#39302E]/10 to-transparent" />
        </div>

        {/* 2. Folded Love Letter resting inside the envelope pocket */}
        <div
          ref={letterRef}
          onPointerDown={handleLetterPointerDown}
          onPointerMove={handleLetterPointerMove}
          onPointerUp={handleLetterPointerUp}
          onPointerCancel={handleLetterPointerUp}
          style={{
            zIndex: 20,
            backgroundImage: PAPER_GRAIN_SVG,
            opacity: isUnfolded ? 0 : 1,
            transition: 'opacity 0.25s ease',
            touchAction: canGrabLetter ? 'none' : 'auto',
          }}
          className={`absolute left-[6.5%] right-[6.5%] top-[8%] bottom-[8%] rounded-[3px] paper-surface border border-[#DFD2C0] shadow-[0_-2px_10px_rgba(57,48,46,0.09),0_4px_12px_rgba(57,48,46,0.12)] ${
            canGrabLetter ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
          }`}
        >
          {/* Folded letter horizontal crease & faint peeking handwritten header */}
          <div className="flex flex-col items-center justify-between h-full px-6 py-4">
            <div className="w-full flex items-center justify-between border-b border-[#B9A58F]/25 pb-2">
              <span className="font-editorial text-[10px] tracking-[0.2em] uppercase text-[#8A7562]">
                PAPSI
              </span>
              {canGrabLetter && (
                <span className="font-editorial italic text-[11px] text-[#9E5A6B] tracking-wide">
                  Tirez vers le haut
                </span>
              )}
              <span className="font-editorial text-[10px] tracking-[0.2em] uppercase text-[#8A7562]">
                TO MY KRYPTONYTE
              </span>
            </div>

            <div dir="rtl" className="w-full pt-1 text-right">
              <p className="font-arabic text-base sm:text-lg leading-[1.9] text-[#39302E]/80 truncate">
                {config.recipientLine}
              </p>
              <div className="mt-2 space-y-1.5 opacity-35">
                <div className="h-[1.5px] w-4/5 bg-[#39302E]/40 rounded-full" />
                <div className="h-[1.5px] w-3/4 bg-[#39302E]/35 rounded-full" />
                <div className="h-[1.5px] w-2/3 bg-[#39302E]/30 rounded-full" />
              </div>
            </div>

            {/* Middle tri-fold crease hint */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#B9A58F]/35 to-transparent" />
          </div>
        </div>

        {/* 3. Front Pocket (Side Flaps + Bottom Folded Flap) */}
        <svg
          viewBox="0 0 440 300"
          className="pointer-events-none absolute inset-0 w-full h-full"
          style={{ zIndex: 25 }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="env-side-left" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#F5ECE0" />
              <stop offset="100%" stopColor="#EADCCB" />
            </linearGradient>
            <linearGradient id="env-side-right" x1="100%" y1="0%" x2="0%" y2="50%">
              <stop offset="0%" stopColor="#F2E7D9" />
              <stop offset="100%" stopColor="#E6D8C5" />
            </linearGradient>
            <linearGradient id="env-bottom-flap" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#FAF4EB" />
              <stop offset="45%" stopColor="#F5EDE0" />
              <stop offset="100%" stopColor="#EDE1D0" />
            </linearGradient>
            <filter id="flap-seam-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="-2" stdDeviation="2.5" floodColor="#39302E" floodOpacity="0.09" />
            </filter>
          </defs>

          {/* Left side fold */}
          <path
            d="M 0,3 Q 0,0 3,0 L 185,152 L 3,300 Q 0,300 0,297 Z"
            fill="url(#env-side-left)"
            stroke="#DFD1BE"
            strokeWidth="0.75"
          />

          {/* Right side fold */}
          <path
            d="M 440,3 Q 440,0 437,0 L 255,152 L 437,300 Q 440,300 440,297 Z"
            fill="url(#env-side-right)"
            stroke="#DFD1BE"
            strokeWidth="0.75"
          />

          {/* Bottom folded pocket flap */}
          <g filter="url(#flap-seam-shadow)">
            <path
              d="M 2,300 L 178,124 Q 220,96 262,124 L 438,300 Z"
              fill="url(#env-bottom-flap)"
              stroke="#DDD0BD"
              strokeWidth="0.85"
            />
            {/* Crisp paper bevel highlight along top edge of bottom pocket */}
            <path
              d="M 6,298 L 178,125 Q 220,98 262,125 L 434,298"
              fill="none"
              stroke="rgba(255,253,249,0.75)"
              strokeWidth="1"
            />
          </g>
        </svg>

        {/* Shadow cast by the top triangular flap onto the pocket */}
        <div
          ref={flapShadowRef}
          className="pointer-events-none absolute inset-x-0 top-0 h-[62%]"
          style={{
            zIndex: 27,
            clipPath: 'polygon(0% 0%, 100% 0%, 50% 98%)',
            background: 'radial-gradient(ellipse at 50% 65%, rgba(57,48,46,0.28) 0%, transparent 72%)',
          }}
          aria-hidden="true"
        />

        {/* 4. Top Triangular Flap (3D Paper Fold around actual top crease line) */}
        <div
          ref={flapRef}
          onPointerDown={handleFlapPointerDown}
          onPointerMove={handleFlapPointerMove}
          onPointerUp={handleFlapPointerUp}
          onPointerCancel={handleFlapPointerUp}
          style={{
            zIndex: flapPastHalf ? 12 : 30,
            transformOrigin: 'top center',
            transformStyle: 'preserve-3d',
            touchAction: canGrabFlap ? 'none' : 'auto',
          }}
          className={`absolute inset-x-0 top-0 h-[62%] ${
            canGrabFlap ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
          }`}
        >
          {/* OUTER FACE (visible when closed) */}
          <div
            style={{ backfaceVisibility: 'hidden' }}
            className="absolute inset-0"
          >
            <svg viewBox="0 0 440 186" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="top-flap-outer" x1="25%" y1="0%" x2="75%" y2="100%">
                  <stop offset="0%" stopColor="#FAF4EB" />
                  <stop offset="55%" stopColor="#F5ECE0" />
                  <stop offset="100%" stopColor="#EADCCA" />
                </linearGradient>
              </defs>
              <path
                d="M 1,1 Q 1,0 4,0 L 436,0 Q 439,0 439,1 L 240,173 Q 220,188 200,173 Z"
                fill="url(#top-flap-outer)"
                stroke="#D9CBB7"
                strokeWidth="0.9"
              />
              {/* Subtle top fold highlight */}
              <line
                x1="4"
                y1="1.2"
                x2="436"
                y2="1.2"
                stroke="rgba(255,253,249,0.85)"
                strokeWidth="1.2"
              />
              {/* Delicate blind-embossed romantic monogram seal on flap tip */}
              <g transform="translate(220, 128)" opacity="0.68">
                <circle
                  r="17"
                  fill="#F4E8DC"
                  stroke="#C98297"
                  strokeOpacity="0.45"
                  strokeWidth="0.85"
                />
                <circle
                  r="14"
                  fill="none"
                  stroke="#B9A58F"
                  strokeOpacity="0.45"
                  strokeWidth="0.6"
                  strokeDasharray="1.5 1.5"
                />
                <text
                  y="4"
                  textAnchor="middle"
                  className="font-arabic"
                  fill="#6E5A4C"
                  fontSize="12"
                >
                  {config.envelopeMonogram}
                </text>
              </g>
            </svg>

            {/* Subtle visual affordance pulse on flap tip only after ribbon is removed */}
            {canGrabFlap && (
              <div className="pointer-events-none absolute left-1/2 bottom-[8%] -translate-x-1/2 flex flex-col items-center">
                <span className="block w-8 h-[2px] rounded-full bg-[#C98297]/55 motion-safe:animate-pulse" />
              </div>
            )}
          </div>

          {/* INNER FACE (visible once folded open upward past 90deg) */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateX(180deg)',
            }}
            className="absolute inset-0"
          >
            <svg viewBox="0 0 440 186" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="top-flap-inner" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#F3E2E6" />
                  <stop offset="100%" stopColor="#EFE3D6" />
                </linearGradient>
              </defs>
              <path
                d="M 1,1 L 439,1 L 240,173 Q 220,188 200,173 Z"
                fill="url(#top-flap-inner)"
                stroke="#D9CBB7"
                strokeWidth="0.9"
              />
              {/* Fine decorative inner lining border */}
              <path
                d="M 22,8 L 418,8 L 234,162 Q 220,173 206,162 Z"
                fill="none"
                stroke="rgba(201, 130, 151, 0.28)"
                strokeWidth="0.8"
              />
            </svg>
          </div>
        </div>

        {/* 5. Interactive Pastel Pink Satin Ribbon Overlay (aligned 1:1 with envelope coordinates) */}
        <div
          className="pointer-events-none absolute"
          style={{
            zIndex: 35,
            left: '-36.3636%',
            right: '-36.3636%',
            top: '-43.3333%',
            bottom: '-43.3333%',
          }}
        >
          <SatinRibbon
            phase={phase}
            onUntieStart={onUntieStart}
            onUntieComplete={onUntieComplete}
            onOpenedSidesChange={onOpenedSidesChange}
            onRibbonRemoved={onRibbonRemoved}
            isCompactViewport={isCompactViewport}
          />
        </div>
      </div>
    </div>
  );
};
