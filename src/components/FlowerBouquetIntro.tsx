import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { buildMeriemFlowers, type FlowerNode } from '../utils/meriemFlowers';

interface FlowerBouquetIntroProps {
  recipientName: string;
  onContinue: () => void;
}

type IntroStage = 'blooming' | 'bouquet' | 'ready';

const TONES = [
  { outer: '#F3B8C8', mid: '#DF7D99', inner: '#B85472', heart: '#86324C' },
  { outer: '#F7CDD8', mid: '#E891A9', inner: '#C4637F', heart: '#8F3B54' },
  { outer: '#ECA2B7', mid: '#D46D8B', inner: '#AD4866', heart: '#7A2942' },
  { outer: '#F5C1CF', mid: '#E2849E', inner: '#BC5B77', heart: '#89364E' },
] as const;

const BotanicalBloom: React.FC<{ flower: FlowerNode }> = ({ flower }) => {
  const palette = TONES[flower.tone];
  const stemMidY = flower.stemLen * 0.52;
  const stemEndX = flower.stemCurve * 0.45;
  const leafY = flower.stemLen * 0.48;
  const lx = flower.leafSide;

  return (
    <g>
      {/* Delicate green botanical stem ("lkhayt lkhder") on every flower */}
      <path
        d={`M 0,3 Q ${flower.stemCurve},${stemMidY} ${stemEndX},${flower.stemLen}`}
        fill="none"
        stroke="#5E7B4F"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d={`M -0.4,3 Q ${flower.stemCurve - 0.4},${stemMidY} ${stemEndX - 0.3},${flower.stemLen}`}
        fill="none"
        stroke="#88A575"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* Tiny green leaf sprouting off the stem */}
      <path
        d={`M ${flower.stemCurve * 0.52},${leafY} Q ${flower.stemCurve * 0.52 + lx * 8.5},${leafY - 4.5} ${flower.stemCurve * 0.52 + lx * 10.5},${leafY + 2.5} Q ${flower.stemCurve * 0.52 + lx * 4.5},${leafY + 4.5} ${flower.stemCurve * 0.52},${leafY} Z`}
        fill="#769365"
        opacity="0.92"
      />

      {/* Blossom varieties */}
      {flower.variety === 'peony' && (
        <g>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-8.5"
              rx="7.5"
              ry="9"
              transform={`rotate(${deg})`}
              fill={palette.outer}
              stroke={palette.mid}
              strokeWidth="0.4"
            />
          ))}
          {[30, 90, 150, 210, 270, 330].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-5.5"
              rx="5.5"
              ry="6.8"
              transform={`rotate(${deg})`}
              fill={palette.mid}
            />
          ))}
          <circle cx="0" cy="0" r="5" fill={palette.inner} />
          <circle cx="-1" cy="-1" r="2.2" fill="#E6BE7A" opacity="0.85" />
          <circle cx="1.6" cy="1.2" r="1.4" fill="#D49E54" opacity="0.85" />
        </g>
      )}

      {flower.variety === 'rose' && (
        <g>
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={deg}
              d="M 0,0 C -9,-5 -10,-15 0,-16 C 10,-15 9,-5 0,0 Z"
              transform={`rotate(${deg})`}
              fill={palette.outer}
              stroke={palette.mid}
              strokeWidth="0.4"
            />
          ))}
          {[36, 108, 180, 252, 324].map((deg) => (
            <path
              key={deg}
              d="M 0,0 C -6,-3 -7,-11 0,-11.5 C 7,-11 6,-3 0,0 Z"
              transform={`rotate(${deg})`}
              fill={palette.mid}
            />
          ))}
          <circle cx="0" cy="0" r="4.8" fill={palette.inner} />
          <path
            d="M -2.5,-1 C -1,-3.5 3,-3 3,0.5 C 3,3 -1.5,3.5 -2.5,1"
            fill="none"
            stroke={palette.heart}
            strokeWidth="1.05"
            strokeLinecap="round"
          />
        </g>
      )}

      {flower.variety === 'ranunculus' && (
        <g>
          <circle cx="0" cy="0" r="13.5" fill={palette.outer} stroke={palette.inner} strokeWidth="0.4" strokeOpacity="0.45" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-6"
              rx="6"
              ry="7"
              transform={`rotate(${deg})`}
              fill={palette.mid}
              opacity="0.72"
            />
          ))}
          <circle cx="0" cy="0" r="6.5" fill={palette.inner} />
          <circle cx="0" cy="0" r="3.2" fill={palette.heart} opacity="0.82" />
        </g>
      )}

      {flower.variety === 'blossom' && (
        <g>
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={deg}
              d="M 0,-1 C -5,-6 -5,-13.5 0,-14.5 C 5,-13.5 5,-6 0,-1 Z"
              transform={`rotate(${deg})`}
              fill={palette.outer}
              stroke={palette.inner}
              strokeWidth="0.45"
              strokeOpacity="0.5"
            />
          ))}
          <circle cx="0" cy="0" r="3.2" fill={palette.inner} />
          <circle cx="0" cy="0" r="1.4" fill="#E3B76F" />
        </g>
      )}
    </g>
  );
};

export const FlowerBouquetIntro: React.FC<FlowerBouquetIntroProps> = ({
  recipientName,
  onContinue,
}) => {
  const flowers = useMemo(() => buildMeriemFlowers(), []);
  const [stage, setStage] = useState<IntroStage>('blooming');

  useEffect(() => {
    const bloomTotalMs = flowers.length * 10 + 1650;
    const tBouquet = window.setTimeout(() => {
      setStage('bouquet');
    }, bloomTotalMs);

    const tReady = window.setTimeout(() => {
      setStage('ready');
    }, bloomTotalMs + 1500);

    return () => {
      window.clearTimeout(tBouquet);
      window.clearTimeout(tReady);
    };
  }, [flowers.length]);

  const isBouquet = stage === 'bouquet' || stage === 'ready';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96, y: -12 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-20 flex flex-col items-center justify-center w-full max-w-6xl px-2 sm:px-6 select-none"
    >
      {/* Whispered floral prelude caption */}
      <div className="mb-1 sm:mb-3 min-h-[2.8rem] flex flex-col items-center justify-center text-center">
        <motion.p
          key={isBouquet ? 'bouquet-title' : 'name-title'}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-editorial italic text-xl sm:text-2xl tracking-[0.02em] text-[#39302E]/85"
        >
          {isBouquet
            ? 'un bouquet pour toi,mon gros rat...'
            : 'Quelque chose fleurit pour toi...'}
        </motion.p>
      </div>

      {/* Main Botanical Stage SVG */}
      <div className="w-full max-w-[1060px]">
        <svg
          viewBox="0 0 900 480"
          className="w-full h-auto max-h-[74dvh] overflow-visible"
          role="img"
          aria-label={`Fleurs avec leurs tiges vertes composant ${recipientName} My Kryptonite puis réunies en bouquet`}
        >
          <defs>
            <linearGradient id="bouquet-paper-front" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FAF4EB" />
              <stop offset="55%" stopColor="#F4E9DA" />
              <stop offset="100%" stopColor="#E6D7C4" />
            </linearGradient>
            <linearGradient id="bouquet-paper-back" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EADCCB" />
              <stop offset="100%" stopColor="#D8C6B1" />
            </linearGradient>
            <linearGradient id="bouquet-ribbon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5CFD9" />
              <stop offset="50%" stopColor="#E8A6B7" />
              <stop offset="100%" stopColor="#C98297" />
            </linearGradient>
          </defs>

          {/* Back parchment collar & bundled green stem tails of the gathered bouquet */}
          <motion.g
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{
              opacity: isBouquet ? 1 : 0,
              scale: isBouquet ? 1 : 0.72,
            }}
            transition={{ duration: 0.9, delay: isBouquet ? 0.25 : 0, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: '450px 248px' }}
          >
            <g transform="translate(450, 248) scale(1.32) translate(-450, -248)">
              {/* Soft GPU-friendly layered desk shadow beneath bouquet */}
              <ellipse cx="452" cy="288" rx="92" ry="102" fill="rgba(57, 48, 46, 0.045)" />
              <ellipse cx="452" cy="288" rx="76" ry="86" fill="rgba(57, 48, 46, 0.065)" />
              {/* Back paper cone */}
              <path
                d="M 322,162 L 450,104 L 578,162 L 494,344 Q 450,382 406,344 Z"
                fill="url(#bouquet-paper-back)"
                stroke="#D2C0AA"
                strokeWidth="1"
              />
              {/* Sage & eucalyptus leaves framing behind bouquet dome */}
              {[-102, -72, -38, 38, 72, 102].map((dx, i) => (
                <path
                  key={i}
                  d={`M 450,210 Q ${450 + dx * 0.72},140 ${450 + dx * 1.28},${84 + Math.abs(dx) * 0.32} Q ${450 + dx * 0.9},128 450,210 Z`}
                  fill={i % 2 === 0 ? '#7D926D' : '#94A784'}
                  opacity="0.84"
                />
              ))}
              {/* Bundled green stems emerging below paper wrap */}
              {[-18, -11, -4, 3, 10, 17].map((sx, i) => (
                <path
                  key={i}
                  d={`M ${450 + sx * 0.45},320 Q ${450 + sx * 0.75},366 ${450 + sx * 1.15},418`}
                  fill="none"
                  stroke={i % 2 === 0 ? '#5D7A4E' : '#718E60'}
                  strokeWidth="3.1"
                  strokeLinecap="round"
                />
              ))}
            </g>
          </motion.g>

          {/* All individual flowers with green stems: bloom 1-by-1 forming MERIEM / MY / KRYPTONITE, then gather smoothly into bouquet */}
          <g>
            {flowers.map((flower, idx) => (
              <motion.g
                key={flower.id}
                initial={{
                  x: flower.nameX,
                  y: flower.nameY,
                  scale: 0,
                  rotate: flower.nameRot - 14,
                  opacity: 0,
                }}
                animate={
                  isBouquet
                    ? {
                        x: flower.bouquetX,
                        y: flower.bouquetY,
                        scale: flower.bouquetScale,
                        rotate: flower.bouquetRot,
                        opacity: 1,
                      }
                    : {
                        x: flower.nameX,
                        y: flower.nameY,
                        scale: flower.nameScale,
                        rotate: flower.nameRot,
                        opacity: 1,
                      }
                }
                transition={
                  isBouquet
                    ? {
                        duration: 1.4,
                        delay: (flowers.length - idx) * 0.0025,
                        ease: [0.19, 1, 0.22, 1],
                      }
                    : {
                        duration: 0.45,
                        delay: idx * 0.01,
                        ease: [0.16, 1, 0.3, 1],
                      }
                }
              >
                <BotanicalBloom flower={flower} />
              </motion.g>
            ))}
          </g>

          {/* Front folded ivory paper wrap & crisp pink satin bow around bouquet */}
          <motion.g
            initial={{ opacity: 0, y: 18, scale: 0.82 }}
            animate={{
              opacity: isBouquet ? 1 : 0,
              y: isBouquet ? 0 : 18,
              scale: isBouquet ? 1 : 0.82,
            }}
            transition={{ duration: 0.85, delay: isBouquet ? 0.55 : 0, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: '450px 248px' }}
          >
            <g transform="translate(450, 248) scale(1.32) translate(-450, -248)">
              {/* Left overlapping paper wrap fold */}
              <path
                d="M 338,214 Q 398,242 454,248 L 478,372 Q 450,386 420,370 Z"
                fill="url(#bouquet-paper-front)"
                stroke="#D8C7B2"
                strokeWidth="0.95"
              />
              {/* Right overlapping paper wrap fold */}
              <path
                d="M 562,214 Q 504,246 444,252 L 422,370 Q 450,386 480,370 Z"
                fill="#F7EFE4"
                stroke="#D8C7B2"
                strokeWidth="0.95"
              />
              <path
                d="M 560,215 Q 504,246 444,252"
                fill="none"
                stroke="rgba(255,253,249,0.75)"
                strokeWidth="1.2"
              />

              {/* Tailored pink satin ribbon collar & crisp angular bow */}
              <path
                d="M 424,292 Q 450,300 476,292 L 474,308 Q 450,316 426,308 Z"
                fill="url(#bouquet-ribbon)"
                stroke="#B86E84"
                strokeWidth="0.65"
              />
              <path
                d="M 445,300 L 406,283 L 401,303 L 445,304 Z"
                fill="url(#bouquet-ribbon)"
                stroke="#B86E84"
                strokeWidth="0.65"
              />
              <path
                d="M 455,300 L 494,283 L 499,303 L 455,304 Z"
                fill="url(#bouquet-ribbon)"
                stroke="#B86E84"
                strokeWidth="0.65"
              />
              <path
                d="M 446,304 L 418,348 L 429,344 L 435,354 L 450,306 Z"
                fill="url(#bouquet-ribbon)"
                stroke="#B86E84"
                strokeWidth="0.6"
              />
              <path
                d="M 454,304 L 482,348 L 471,344 L 465,354 L 450,306 Z"
                fill="url(#bouquet-ribbon)"
                stroke="#B86E84"
                strokeWidth="0.6"
              />
              <rect
                x="442"
                y="293"
                width="16"
                height="16"
                rx="2.5"
                fill="url(#bouquet-ribbon)"
                stroke="#A86177"
                strokeWidth="0.7"
              />
            </g>
          </motion.g>
        </svg>
      </div>

      {/* Continue button once bouquet is formed */}
      <div className="mt-2 sm:mt-4 min-h-[52px] flex items-center justify-center">
        {stage === 'ready' && (
          <motion.button
            type="button"
            onClick={onContinue}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2.5 min-h-[44px] px-7 py-2.5 rounded-sm bg-[#F7F0E6] border border-[#B9A58F]/55 text-[#39302E] hover:border-[#C98297] hover:bg-[#FCF8F2] shadow-[0_8px_24px_rgba(57,48,46,0.1)] transition-all duration-200 font-editorial text-base tracking-[0.06em] whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C98297]"
          >
            <span>Continuer</span>
            <ArrowRight className="w-4 h-4 text-[#C98297]" aria-hidden="true" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
