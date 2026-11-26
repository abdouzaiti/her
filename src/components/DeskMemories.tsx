import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface MemoryPhoto {
  id: 'sunset' | 'casque' | 'ride' | 'together';
  src: string;
  caption: string;
  subcaption: string;
  aspect: 'portrait' | 'landscape';
  objectPosition?: string;
  rotate90?: boolean;
}

export const MEMORY_PHOTOS: MemoryPhoto[] = [
  {
    id: 'sunset',
    src: encodeURI('/me and her.png'),
    caption: 'Our First Date',
    subcaption: 'Au bord de la mer',
    aspect: 'portrait',
    objectPosition: '50% 60%',
  },
  {
    id: 'casque',
    src: encodeURI('/casque.png'),
    caption: '#Kryptonite',
    subcaption: 'Reflet sur la visière',
    aspect: 'portrait',
    objectPosition: '42% 48%',
  },
  {
    id: 'ride',
    src: encodeURI('/me and her 2.jpg'),
    caption: 'Nos balades',
    subcaption: 'À deux, toujours',
    aspect: 'landscape',
    rotate90: true,
  },
  {
    id: 'together',
    src: encodeURI('/together.png'),
    caption: 'Together',
    subcaption: 'Pas à pas, un seul cœur',
    aspect: 'portrait',
    objectPosition: '50% 82%',
  },
];

interface PhotoImageProps {
  photo: MemoryPhoto;
}

const PhotoImage: React.FC<PhotoImageProps> = ({ photo }) => {
  if (photo.rotate90) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#2E2624]">
        <img
          src={photo.src}
          alt={photo.caption}
          loading="lazy"
          draggable={false}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '108%',
            maxWidth: 'none',
            height: 'auto',
            transform: 'translate(-50%, -48%) rotate(90deg)',
          }}
        />
      </div>
    );
  }

  return (
    <img
      src={photo.src}
      alt={photo.caption}
      loading="lazy"
      draggable={false}
      style={{ objectPosition: photo.objectPosition ?? 'center' }}
      className="h-full w-full object-cover"
    />
  );
};

interface PolaroidCardProps {
  photo: MemoryPhoto;
  onClick: () => void;
  className?: string;
  compact?: boolean;
  tapeSide?: 'left' | 'right' | 'center';
}

export const PolaroidCard: React.FC<PolaroidCardProps> = ({
  photo,
  onClick,
  className = '',
  compact = false,
  tapeSide = 'center',
}) => {
  const tapePos =
    tapeSide === 'left'
      ? 'left-3 -rotate-6'
      : tapeSide === 'right'
      ? 'right-3 rotate-6'
      : 'left-1/2 -translate-x-1/2 -rotate-2';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Voir le souvenir : ${photo.caption}`}
      className={`group relative text-left bg-[#FCF7EE] border border-[#DDD0BC] rounded-[2px] shadow-[0_14px_30px_-10px_rgba(57,48,46,0.28),0_3px_10px_rgba(57,48,46,0.12)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-[0_22px_40px_-12px_rgba(57,48,46,0.34)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C98297] ${
        compact ? 'p-1.5 pb-4' : 'p-2 pb-5 sm:p-2.5 sm:pb-7'
      } ${className}`}
    >
      {/* Translucent rose-ivory washi tape accent */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -top-2 ${tapePos} h-3.5 w-8 sm:w-10 bg-[#E8A6B7]/65 border border-[#C98297]/25 shadow-[0_1px_2px_rgba(57,48,46,0.08)]`}
      />

      <div
        className={`relative overflow-hidden rounded-[1px] bg-[#E8DEC9] ${
          photo.aspect === 'landscape' ? 'aspect-[4/3]' : 'aspect-[4/5]'
        }`}
      >
        <PhotoImage photo={photo} />
        {/* Warm vintage film edge vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 shadow-[inset_0_0_14px_rgba(57,48,46,0.16)]"
        />
      </div>

      <p
        className={`font-handwriting text-[#4A3B38] leading-tight truncate ${
          compact ? 'mt-1 text-[11px]' : 'mt-1.5 sm:mt-2 text-xs sm:text-sm'
        }`}
      >
        {photo.caption}
      </p>
    </button>
  );
};

interface DeskPolaroidsProps {
  visible: boolean;
  onSelectPhoto: (index: number) => void;
}

export const DeskPolaroids: React.FC<DeskPolaroidsProps> = ({ visible, onSelectPhoto }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="pointer-events-none fixed inset-0 z-[5]"
        >
          {/* Left-top keepsake: Sunset by the sea */}
          <motion.div
            initial={{ opacity: 0, x: -24, y: -12, rotate: -14 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: -8 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto absolute top-[15%] left-3 sm:top-[16%] sm:left-7 md:left-14 lg:left-24 w-[76px] sm:w-[114px] md:w-[132px]"
          >
            <PolaroidCard
              photo={MEMORY_PHOTOS[0]}
              onClick={() => onSelectPhoto(0)}
              compact
              tapeSide="center"
            />
          </motion.div>

          {/* Right-top keepsake: Helmet reflection & #Kryptonite */}
          <motion.div
            initial={{ opacity: 0, x: 24, y: -10, rotate: 14 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: 7 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto absolute top-[14%] right-3 sm:top-[15%] sm:right-7 md:right-14 lg:right-24 w-[76px] sm:w-[114px] md:w-[132px]"
          >
            <PolaroidCard
              photo={MEMORY_PHOTOS[1]}
              onClick={() => onSelectPhoto(1)}
              compact
              tapeSide="left"
            />
          </motion.div>

          {/* Lower-left keepsake: Red steps, matching sneakers & heart hands */}
          <motion.div
            initial={{ opacity: 0, x: -18, y: 20, rotate: 12 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: 6 }}
            transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto absolute bottom-20 left-3 sm:bottom-16 sm:left-10 md:left-20 lg:left-32 w-[78px] sm:w-[116px] md:w-[136px]"
          >
            <PolaroidCard
              photo={MEMORY_PHOTOS[3]}
              onClick={() => onSelectPhoto(3)}
              compact
              tapeSide="left"
            />
          </motion.div>

          {/* Lower-right keepsake: Smiling together on the ride */}
          <motion.div
            initial={{ opacity: 0, x: 18, y: 20, rotate: -10 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: -4 }}
            transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto absolute bottom-20 right-3 sm:bottom-16 sm:right-10 md:right-20 lg:right-32 w-[92px] sm:w-[134px] md:w-[152px]"
          >
            <PolaroidCard
              photo={MEMORY_PHOTOS[2]}
              onClick={() => onSelectPhoto(2)}
              compact
              tapeSide="right"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface LetterMemoriesFanProps {
  visible: boolean;
  onSelectPhoto: (index: number) => void;
}

export const LetterMemoriesFan: React.FC<LetterMemoriesFanProps> = ({ visible, onSelectPhoto }) => {
  if (!visible) return null;

  return (
    <motion.div
      dir="ltr"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay: 4.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8 mb-3 flex flex-col items-center text-center"
    >
      <p className="font-editorial italic text-sm sm:text-base tracking-[0.04em] text-[#39302E]/75 mb-4">
        Quelques instants gardés tout près du cœur...
      </p>

      <div className="grid grid-cols-2 gap-3.5 max-w-[260px] sm:max-w-none sm:flex sm:items-end sm:justify-center sm:gap-4 px-2">
        <div className="w-full sm:w-[118px] -rotate-4 sm:-rotate-6 translate-y-1">
          <PolaroidCard
            photo={MEMORY_PHOTOS[0]}
            onClick={() => onSelectPhoto(0)}
            tapeSide="center"
          />
        </div>
        <div className="w-full sm:w-[134px] rotate-2 sm:rotate-1 -translate-y-1 z-10">
          <PolaroidCard
            photo={MEMORY_PHOTOS[2]}
            onClick={() => onSelectPhoto(2)}
            tapeSide="left"
          />
        </div>
        <div className="w-full sm:w-[118px] rotate-2 sm:-rotate-2 translate-y-1">
          <PolaroidCard
            photo={MEMORY_PHOTOS[3]}
            onClick={() => onSelectPhoto(3)}
            tapeSide="center"
          />
        </div>
        <div className="w-full sm:w-[118px] -rotate-3 sm:rotate-6 translate-y-0.5">
          <PolaroidCard
            photo={MEMORY_PHOTOS[1]}
            onClick={() => onSelectPhoto(1)}
            tapeSide="right"
          />
        </div>
      </div>
    </motion.div>
  );
};

interface MemoryLightboxProps {
  activeIndex: number | null;
  onClose: () => void;
  onChangeIndex: (next: number) => void;
}

export const MemoryLightbox: React.FC<MemoryLightboxProps> = ({
  activeIndex,
  onClose,
  onChangeIndex,
}) => {
  const isOpen = activeIndex !== null;
  const photo = activeIndex !== null ? MEMORY_PHOTOS[activeIndex] : null;

  useEffect(() => {
    if (!isOpen || activeIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onChangeIndex((activeIndex + 1) % MEMORY_PHOTOS.length);
      if (e.key === 'ArrowLeft')
        onChangeIndex((activeIndex - 1 + MEMORY_PHOTOS.length) % MEMORY_PHOTOS.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, activeIndex, onClose, onChangeIndex]);

  return (
    <AnimatePresence>
      {isOpen && photo && activeIndex !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#2A2220]/65 backdrop-blur-sm px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-label={photo.caption}
        >
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.9, y: 16, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] sm:max-w-[410px] bg-[#FCF7EE] border border-[#DDD0BC] rounded-[3px] p-3.5 pb-6 sm:p-4 sm:pb-7 shadow-[0_30px_70px_-12px_rgba(20,14,12,0.55)]"
          >
            {/* Washi tape top accent */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-1 h-5 w-16 bg-[#E8A6B7]/65 border border-[#C98297]/30"
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la photo"
              className="absolute -top-3.5 -right-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F0E6] border border-[#B9A58F]/60 text-[#39302E] shadow-md hover:border-[#C98297] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div
              className={`relative overflow-hidden rounded-[2px] bg-[#E8DEC9] ${
                photo.aspect === 'landscape' ? 'aspect-[4/3]' : 'aspect-[4/5]'
              }`}
            >
              <PhotoImage photo={photo} />
            </div>

            <div className="mt-3.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-handwriting text-xl sm:text-2xl text-[#39302E] leading-tight">
                  {photo.caption}
                </p>
                <p className="font-editorial italic text-xs sm:text-sm text-[#7A6554] mt-0.5">
                  {photo.subcaption}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onChangeIndex((activeIndex - 1 + MEMORY_PHOTOS.length) % MEMORY_PHOTOS.length)
                  }
                  aria-label="Photo précédente"
                  className="flex h-9 w-9 items-center justify-center rounded-sm border border-[#B9A58F]/45 bg-[#F7F0E6] text-[#39302E] hover:border-[#C98297] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChangeIndex((activeIndex + 1) % MEMORY_PHOTOS.length)}
                  aria-label="Photo suivante"
                  className="flex h-9 w-9 items-center justify-center rounded-sm border border-[#B9A58F]/45 bg-[#F7F0E6] text-[#39302E] hover:border-[#C98297] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
