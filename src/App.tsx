/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { LETTER_CONFIG } from './config/letterConfig';
import { FlowerBouquetIntro } from './components/FlowerBouquetIntro';
import { TelegramEnvelope } from './components/TelegramEnvelope';
import { LetterSheet } from './components/LetterSheet';
import { DeskPolaroids, MemoryLightbox } from './components/DeskMemories';
import { FrenchChansonPlayer } from './utils/frenchChansonAudio';
import type { TelegramPhase } from './types/telegram';

function getInstructionCopy(
  phase: TelegramPhase,
  openedSidesCount: number
): { primary: string; hint?: string } | null {
  switch (phase) {
    case 'CLOSED_WITH_RIBBON':
      return {
        primary: 'Un petit message vous attend...',
        hint: 'Tirez doucement sur une extrémité du ruban',
      };
    case 'UNTIE_IN_PROGRESS':
      return {
        primary: 'Tirez lentement pour dénouer le nœud...',
      };
    case 'RIBBON_LOOSE':
      if (openedSidesCount < 4) {
        return {
          primary: 'Ouvrez les quatre côtés du ruban...',
          hint: `${openedSidesCount} sur 4 côtés ouverts — tirez chaque ruban pour le libérer`,
        };
      }
      return {
        primary: 'Glissez maintenant le ruban hors du télégramme...',
      };
    case 'RIBBON_REMOVED':
      return {
        primary: 'Maintenant, ouvrez votre message...',
        hint: 'Soulevez le rabat vers le haut',
      };
    case 'ENVELOPE_OPENING':
      return {
        primary: 'Soulevez doucement le rabat...',
      };
    case 'ENVELOPE_OPEN':
    case 'LETTER_EXTRACTION':
      return {
        primary: 'Tirez la lettre hors de son enveloppe...',
      };
    case 'LETTER_UNFOLDED':
      return null;
  }
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [phase, setPhase] = useState<TelegramPhase>('CLOSED_WITH_RIBBON');
  const [openedSidesCount, setOpenedSidesCount] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [activeMemoryIndex, setActiveMemoryIndex] = useState<number | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [isMuted, setIsMuted] = useState(false);
  const audioPlayerRef = useRef<FrenchChansonPlayer | null>(null);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsCompactViewport(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const player = new FrenchChansonPlayer();
    audioPlayerRef.current = player;

    const unlockAndPlay = () => {
      if (!isMutedRef.current) {
        void player.start();
      }
    };

    // Attempt gentle start immediately if permitted, and ensure start on first user gesture
    void player.start();
    window.addEventListener('pointerdown', unlockAndPlay, { passive: true, once: true });
    window.addEventListener('keydown', unlockAndPlay, { passive: true, once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAndPlay);
      window.removeEventListener('keydown', unlockAndPlay);
      player.dispose();
      audioPlayerRef.current = null;
    };
  }, []);

  const handleToggleMusic = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const player = audioPlayerRef.current;
      if (player) {
        if (!next) {
          void player.start().then(() => player.setMuted(false));
        } else {
          void player.setMuted(true);
        }
      }
      return next;
    });
  }, []);

  const handleUntieStart = useCallback(() => {
    setPhase((prev) => (prev === 'CLOSED_WITH_RIBBON' ? 'UNTIE_IN_PROGRESS' : prev));
  }, []);

  const handleUntieComplete = useCallback(() => {
    setPhase((prev) =>
      prev === 'UNTIE_IN_PROGRESS' || prev === 'CLOSED_WITH_RIBBON' ? 'RIBBON_LOOSE' : prev
    );
  }, []);

  const handleRibbonRemoved = useCallback(() => {
    setPhase((prev) => (prev === 'RIBBON_LOOSE' ? 'RIBBON_REMOVED' : prev));
  }, []);

  const handleFlapOpenStart = useCallback(() => {
    setPhase((prev) => (prev === 'RIBBON_REMOVED' ? 'ENVELOPE_OPENING' : prev));
  }, []);

  const handleFlapOpened = useCallback(() => {
    setPhase((prev) =>
      prev === 'ENVELOPE_OPENING' || prev === 'RIBBON_REMOVED' ? 'ENVELOPE_OPEN' : prev
    );
  }, []);

  const handleFlapClosed = useCallback(() => {
    setPhase((prev) => (prev === 'ENVELOPE_OPENING' ? 'RIBBON_REMOVED' : prev));
  }, []);

  const handleLetterExtractStart = useCallback(() => {
    setPhase((prev) => (prev === 'ENVELOPE_OPEN' ? 'LETTER_EXTRACTION' : prev));
  }, []);

  const handleLetterExtracted = useCallback(() => {
    setPhase((prev) =>
      prev === 'LETTER_EXTRACTION' || prev === 'ENVELOPE_OPEN' ? 'LETTER_UNFOLDED' : prev
    );
  }, []);

  const handleReset = useCallback(() => {
    setShowIntro(true);
    setPhase('CLOSED_WITH_RIBBON');
    setOpenedSidesCount(0);
    setActiveMemoryIndex(null);
    setResetKey((k) => k + 1);
  }, []);

  const instruction = showIntro ? null : getInstructionCopy(phase, openedSidesCount);

  return (
    <main className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden desk-surface px-4 py-6">
      {/* Soft cinematic window-light atmosphere */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 24% 18%, rgba(255, 252, 246, 0.55) 0%, rgba(255, 252, 246, 0) 70%)',
        }}
        aria-hidden="true"
      />

      {/* Discreet background music toggle */}
      <button
        type="button"
        onClick={handleToggleMusic}
        aria-label={isMuted ? 'Activer la musique' : 'Couper la musique'}
        title={isMuted ? 'Activer la musique' : 'Couper la musique'}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F0E6]/85 border border-[#B9A58F]/45 text-[#39302E]/75 hover:text-[#39302E] hover:border-[#C98297]/65 shadow-[0_4px_14px_rgba(57,48,46,0.08)] transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C98297]"
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-[#8A7562]" aria-hidden="true" />
        ) : (
          <Volume2 className="w-4 h-4 text-[#C98297]" aria-hidden="true" />
        )}
      </button>

      {/* Whispered French editorial instruction (telegram phases) */}
      <div className="pointer-events-none fixed top-7 sm:top-10 inset-x-0 z-50 flex flex-col items-center justify-center px-6 text-center">
        <AnimatePresence mode="wait">
          {instruction && (
            <motion.div
              key={instruction.primary}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-md"
            >
              <p className="font-editorial italic text-xl sm:text-2xl tracking-[0.01em] text-[#39302E]/85">
                {instruction.primary}
              </p>
              {instruction.hint && (
                <p className="mt-1.5 font-editorial text-xs sm:text-sm tracking-[0.08em] text-[#39302E]/55">
                  {instruction.hint}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Physical Desk Stage */}
      <AnimatePresence mode="wait">
        {showIntro ? (
          <FlowerBouquetIntro
            key={`intro-${resetKey}`}
            recipientName={LETTER_CONFIG.recipientName}
            onContinue={() => setShowIntro(false)}
          />
        ) : (
          <motion.div
            key={`telegram-${resetKey}`}
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex items-center justify-center w-full max-w-4xl"
          >
            <TelegramEnvelope
              phase={phase}
              config={LETTER_CONFIG}
              isCompactViewport={isCompactViewport}
              onUntieStart={handleUntieStart}
              onUntieComplete={handleUntieComplete}
              onOpenedSidesChange={setOpenedSidesCount}
              onRibbonRemoved={handleRibbonRemoved}
              onFlapOpenStart={handleFlapOpenStart}
              onFlapOpened={handleFlapOpened}
              onFlapClosed={handleFlapClosed}
              onLetterExtractStart={handleLetterExtractStart}
              onLetterExtracted={handleLetterExtracted}
            />

            {/* Unfolded Handwritten Letter */}
            {phase === 'LETTER_UNFOLDED' && (
              <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-14 sm:py-16 pointer-events-none">
                <div className="pointer-events-auto">
                  <LetterSheet
                    config={LETTER_CONFIG}
                    isUnfolded={true}
                    onSelectPhoto={setActiveMemoryIndex}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vintage Polaroid keepsakes resting around the telegram on the desk */}
      <DeskPolaroids
        visible={!showIntro && phase !== 'LETTER_UNFOLDED'}
        onSelectPhoto={setActiveMemoryIndex}
      />

      {/* Interactive Polaroid memory inspection lightbox */}
      <MemoryLightbox
        activeIndex={activeMemoryIndex}
        onClose={() => setActiveMemoryIndex(null)}
        onChangeIndex={setActiveMemoryIndex}
      />

      {/* Discreet Reset / Replay button */}
      <AnimatePresence>
        {!showIntro && phase !== 'CLOSED_WITH_RIBBON' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35 }}
            className="fixed bottom-5 sm:bottom-7 inset-x-0 z-50 flex justify-center pointer-events-none"
          >
            <button
              type="button"
              onClick={handleReset}
              className="pointer-events-auto inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-sm bg-[#F7F0E6]/90 backdrop-blur-sm border border-[#B9A58F]/45 text-[#39302E]/85 hover:text-[#39302E] hover:bg-[#F7F0E6] hover:border-[#C98297]/65 shadow-[0_4px_14px_rgba(57,48,46,0.08)] transition-colors duration-200 font-editorial text-sm tracking-[0.06em] whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C98297]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#C98297]" aria-hidden="true" />
              <span>Recommencer</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
