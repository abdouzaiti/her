import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { LetterConfig } from '../types/telegram';
import { LetterMemoriesFan } from './DeskMemories';

interface LetterSheetProps {
  config: LetterConfig;
  isUnfolded: boolean;
  onSelectPhoto?: (index: number) => void;
}

const PAPER_GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E")`;

export const LetterSheet: React.FC<LetterSheetProps> = ({ config, isUnfolded, onSelectPhoto }) => {
  const [unfoldStage, setUnfoldStage] = useState<'folded' | 'opening-top' | 'opening-bottom' | 'writing'>('folded');
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [romanticWriteStarted, setRomanticWriteStarted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dedicationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isUnfolded) {
      setUnfoldStage('folded');
      setIsAtBottom(false);
      setRomanticWriteStarted(false);
      return;
    }

    const t1 = window.setTimeout(() => setUnfoldStage('opening-top'), 80);
    const t2 = window.setTimeout(() => setUnfoldStage('opening-bottom'), 480);
    const t3 = window.setTimeout(() => setUnfoldStage('writing'), 950);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [isUnfolded]);

  const topOpen = unfoldStage === 'opening-top' || unfoldStage === 'opening-bottom' || unfoldStage === 'writing';
  const bottomOpen = unfoldStage === 'opening-bottom' || unfoldStage === 'writing';
  const inkVisible = unfoldStage === 'writing';

  // Detect when the reader reaches the bottom of the letter
  useEffect(() => {
    if (!inkVisible) return;
    const container = scrollContainerRef.current;
    const target = dedicationRef.current;
    if (!container) return;

    const checkBottom = () => {
      const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 44;
      if (nearBottom) {
        setIsAtBottom(true);
      } else if (target) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const visibleInView =
          targetRect.top >= containerRect.top &&
          targetRect.bottom <= containerRect.bottom + 24;
        setIsAtBottom(visibleInView);
      } else {
        setIsAtBottom(false);
      }
    };

    const observer =
      typeof IntersectionObserver !== 'undefined' && target
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (entry) {
                setIsAtBottom(entry.isIntersecting);
              }
            },
            { root: container, threshold: 0.65 }
          )
        : null;

    if (observer && target) {
      observer.observe(target);
    }

    container.addEventListener('scroll', checkBottom, { passive: true });
    const initialTimer = window.setTimeout(checkBottom, 500);

    return () => {
      container.removeEventListener('scroll', checkBottom);
      window.clearTimeout(initialTimer);
      observer?.disconnect();
    };
  }, [inkVisible]);

  // Start the live-writing animation after standing at the bottom for 1.5 seconds
  useEffect(() => {
    if (!inkVisible || !isAtBottom || romanticWriteStarted) return;
    const timer = window.setTimeout(() => {
      setRomanticWriteStarted(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [inkVisible, isAtBottom, romanticWriteStarted]);

  if (!isUnfolded) return null;

  const topLines = (config.paragraphs[0] ?? '').split('\n');
  const midLines = (config.paragraphs[1] ?? '').split('\n');
  const botLines = (config.paragraphs[2] ?? '').split('\n');

  return (
    <motion.div
      ref={scrollContainerRef}
      initial={{ opacity: 0, scale: 0.86, y: 36 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-40 w-[min(94vw,580px)] max-h-[82dvh] overflow-y-auto overscroll-contain touch-pan-y select-text"
      style={{ perspective: '1600px' }}
    >
      <div
        dir="rtl"
        className="relative mx-auto my-2 flex flex-col text-right rounded-[3px] shadow-[0_24px_60px_-15px_rgba(57,48,46,0.28),0_4px_16px_rgba(57,48,46,0.08)]"
      >
        {/* TOP FOLD PANEL */}
        <motion.div
          initial={{ rotateX: -162 }}
          animate={{ rotateX: topOpen ? 0 : -162 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{
            transformOrigin: 'bottom center',
            transformStyle: 'preserve-3d',
            backgroundImage: PAPER_GRAIN_SVG,
          }}
          className="relative z-10 bg-[#F7F0E6]/62 rounded-t-[3px] border border-b-0 border-[#DFD2C0] px-7 pt-7 pb-3 sm:px-12 sm:pt-10 sm:pb-3.5"
        >
          <div
            style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
            className="pointer-events-none absolute inset-0 rounded-t-[3px] bg-[#EFE5D6] border border-[#DFD2C0]"
          />

          {/* Subtle archival header */}
          <motion.div
            dir="ltr"
            initial={{ opacity: 0 }}
            animate={{ opacity: inkVisible ? 1 : 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex items-baseline justify-between border-b border-[#B9A58F]/25 pb-2.5 mb-4 text-[11px] sm:text-xs tracking-[0.18em] uppercase text-[#8A7562] font-editorial"
          >
            <span>PAPSI</span>
            <span>TO MY KRYPTONYTE</span>
          </motion.div>

          {/* Opening poetic line (RTL ink reveal) */}
          <motion.p
            initial={{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }}
            animate={{
              opacity: inkVisible ? 1 : 0,
              clipPath: inkVisible ? 'inset(0 0 0 0%)' : 'inset(0 0 0 100%)',
            }}
            transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-arabic text-[1.16rem] sm:text-[1.35rem] leading-[2.05] text-[#39302E]/95"
          >
            {config.recipientLine}
          </motion.p>

          <div className="mt-0.5 space-y-0.5">
            {topLines.map((line, idx) => {
              const endsBayt = idx < topLines.length - 1 && /[.…]$/.test(line.trim());
              return (
                <motion.p
                  key={idx}
                  initial={{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }}
                  animate={{
                    opacity: inkVisible ? 1 : 0,
                    clipPath: inkVisible ? 'inset(0 0 0 0%)' : 'inset(0 0 0 100%)',
                  }}
                  transition={{
                    duration: 0.9,
                    delay: 0.45 + idx * 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`font-arabic text-[1.16rem] sm:text-[1.35rem] leading-[2.05] text-[#39302E]/95 ${
                    endsBayt ? 'mb-5' : ''
                  }`}
                >
                  {line}
                </motion.p>
              );
            })}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-b from-transparent via-[#B9A58F]/20 to-[#FFFFFF]/45" />
        </motion.div>

        {/* MIDDLE PANEL */}
        <div
          style={{ backgroundImage: PAPER_GRAIN_SVG }}
          className="relative z-10 bg-[#F7F0E6]/62 border-x border-[#DFD2C0] px-7 pt-2.5 pb-3 sm:px-12 sm:pt-3 sm:pb-3.5"
        >
          <div className="space-y-0.5">
            {midLines.map((line, idx) => {
              const endsBayt = idx < midLines.length - 1 && /[.…]$/.test(line.trim());
              return (
                <motion.p
                  key={idx}
                  initial={{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }}
                  animate={{
                    opacity: inkVisible ? 1 : 0,
                    clipPath: inkVisible ? 'inset(0 0 0 0%)' : 'inset(0 0 0 100%)',
                  }}
                  transition={{
                    duration: 0.9,
                    delay: 1.25 + idx * 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`font-arabic text-[1.16rem] sm:text-[1.35rem] leading-[2.05] text-[#39302E]/95 ${
                    endsBayt ? 'mb-5' : ''
                  }`}
                >
                  {line}
                </motion.p>
              );
            })}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-b from-transparent via-[#B9A58F]/20 to-[#FFFFFF]/45" />
        </div>

        {/* BOTTOM FOLD PANEL */}
        <motion.div
          initial={{ rotateX: 162 }}
          animate={{ rotateX: bottomOpen ? 0 : 162 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{
            transformOrigin: 'top center',
            transformStyle: 'preserve-3d',
            backgroundImage: PAPER_GRAIN_SVG,
          }}
          className="relative z-10 bg-[#F7F0E6]/62 rounded-b-[3px] border border-t-0 border-[#DFD2C0] px-7 pt-2.5 pb-8 sm:px-12 sm:pt-3 sm:pb-10"
        >
          <div
            style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
            className="pointer-events-none absolute inset-0 rounded-b-[3px] bg-[#ECE1D1] border border-[#DFD2C0]"
          />

          <div className="space-y-0.5">
            {botLines.map((line, idx) => {
              const endsBayt = idx < botLines.length - 1 && /[.…]$/.test(line.trim());
              return (
                <motion.p
                  key={idx}
                  initial={{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }}
                  animate={{
                    opacity: inkVisible ? 1 : 0,
                    clipPath: inkVisible ? 'inset(0 0 0 0%)' : 'inset(0 0 0 100%)',
                  }}
                  transition={{
                    duration: 0.9,
                    delay: 2.55 + idx * 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`font-arabic text-[1.16rem] sm:text-[1.35rem] leading-[2.05] text-[#39302E]/95 ${
                    endsBayt ? 'mb-5' : ''
                  }`}
                >
                  {line}
                </motion.p>
              );
            })}
          </div>

          {/* Literary Calligraphic Dedication & Signature */}
          <motion.div
            ref={dedicationRef}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: inkVisible ? 1 : 0, y: inkVisible ? 0 : 4 }}
            transition={{ duration: 0.95, delay: 4.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 flex items-end justify-between gap-3 sm:gap-6"
          >
            {/* Right side of "مريم" (RTL start): Romantic live-written inscription */}
            <div className="min-w-0 flex-1 text-right pb-1 -rotate-[0.6deg] origin-bottom-right">
              <p className="font-arabic-signature text-[1.08rem] sm:text-[1.28rem] leading-[1.9] text-[#6D3F4D]">
                <span className="relative inline-block">
                  <motion.span
                    className="inline-block"
                    initial={{ clipPath: 'inset(0 0 0 100%)', opacity: 0 }}
                    animate={
                      romanticWriteStarted
                        ? { clipPath: 'inset(0 0 0 0%)', opacity: 1 }
                        : { clipPath: 'inset(0 0 0 100%)', opacity: 0 }
                    }
                    transition={{ duration: 1.85, ease: [0.22, 0.61, 0.36, 1] }}
                  >
                    كلمات تألفت في قلبي{' '}
                  </motion.span>
                  {romanticWriteStarted && (
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                      initial={{ right: '0%', opacity: 0 }}
                      animate={{
                        right: ['0%', '100%'],
                        opacity: [0, 1, 1, 0],
                        y: [0, -2.5, 1, -2, 0],
                      }}
                      transition={{
                        duration: 1.85,
                        times: [0, 0.06, 0.92, 1],
                        ease: [0.22, 0.61, 0.36, 1],
                      }}
                    >
                      <span className="block w-1.5 h-1.5 rounded-full bg-[#B45E76] shadow-[0_0_8px_rgba(201,130,151,0.85)]" />
                    </motion.span>
                  )}
                </span>
                <br />
                <span className="relative inline-block">
                  <motion.span
                    className="inline-block"
                    initial={{ clipPath: 'inset(0 0 0 100%)', opacity: 0 }}
                    animate={
                      romanticWriteStarted
                        ? { clipPath: 'inset(0 0 0 0%)', opacity: 1 }
                        : { clipPath: 'inset(0 0 0 100%)', opacity: 0 }
                    }
                    transition={{ duration: 1.75, delay: 1.9, ease: [0.22, 0.61, 0.36, 1] }}
                  >
                    لأكسب إبتسامت حبي
                  </motion.span>
                  {romanticWriteStarted && (
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                      initial={{ right: '0%', opacity: 0 }}
                      animate={{
                        right: ['0%', '100%'],
                        opacity: [0, 1, 1, 0],
                        y: [0, -2.5, 1, -2, 0],
                      }}
                      transition={{
                        duration: 1.75,
                        delay: 1.9,
                        times: [0, 0.06, 0.92, 1],
                        ease: [0.22, 0.61, 0.36, 1],
                      }}
                    >
                      <span className="block w-1.5 h-1.5 rounded-full bg-[#B45E76] shadow-[0_0_8px_rgba(201,130,151,0.85)]" />
                    </motion.span>
                  )}
                </span>
                <svg
                  width="18"
                  height="16"
                  viewBox="0 0 24 22"
                  className="inline-block mr-2 align-middle -mt-0.5 overflow-visible"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M12 19.6C12 19.6 3.2 13.7 3.2 7.6C3.2 4.6 5.5 2.5 8.2 2.5C10 2.5 11.4 3.5 12 4.8C12.6 3.5 14 2.5 15.8 2.5C18.5 2.5 20.8 4.6 20.8 7.6C20.8 13.7 12 19.6 12 19.6Z"
                    stroke="#B85F78"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="#E8A6B7"
                    initial={{ pathLength: 0, opacity: 0, fillOpacity: 0 }}
                    animate={
                      romanticWriteStarted
                        ? { pathLength: 1, opacity: 1, fillOpacity: 0.55 }
                        : { pathLength: 0, opacity: 0, fillOpacity: 0 }
                    }
                    transition={{
                      pathLength: { duration: 0.65, delay: 3.65, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: 0.15, delay: 3.65 },
                      fillOpacity: { duration: 0.45, delay: 4.15 },
                    }}
                  />
                </svg>
              </p>

              <svg
                width="74"
                height="10"
                viewBox="0 0 74 10"
                className="mt-0.5 opacity-70"
                aria-hidden="true"
              >
                <motion.path
                  d="M 72 4 Q 50 8.5 32 4.5 T 2 5.5"
                  fill="none"
                  stroke="#C98297"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={
                    romanticWriteStarted
                      ? { pathLength: 1, opacity: 1 }
                      : { pathLength: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.75, delay: 4.25, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
            </div>

            {/* Left side (RTL end): Big "مريم" signature */}
            <div className="shrink-0 flex flex-col items-end text-left">
              {config.closing && (
                <p className="font-arabic text-[1.1rem] sm:text-[1.25rem] text-[#39302E]/85">
                  {config.closing}
                </p>
              )}
              <p className="font-arabic-signature text-[2.1rem] sm:text-[2.5rem] text-[#39302E] pl-2">
                {config.signature}
              </p>
              <svg width="34" height="10" viewBox="0 0 34 10" className="mt-1 ml-1 opacity-70" aria-hidden="true">
                <path
                  d="M 2 5 Q 11 1.5 21 5 T 32 4"
                  fill="none"
                  stroke="#C98297"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </motion.div>
        </motion.div>

        {/* Soft-focus ("flou") portrait background woven beneath the ivory letter paper */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: bottomOpen ? 1 : 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[3px] bg-[#F7F0E6]"
        >
          <img
            src="/letter.png"
            alt=""
            className="h-full w-full object-cover object-[50%_12%] blur-[3.5px] sm:blur-[4px] scale-[1.01] opacity-80"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 40%, rgba(247, 240, 230, 0.08) 0%, rgba(247, 240, 230, 0.42) 100%)',
            }}
          />
        </motion.div>
      </div>

      {onSelectPhoto && (
        <LetterMemoriesFan visible={romanticWriteStarted} onSelectPhoto={onSelectPhoto} />
      )}
    </motion.div>
  );
};
