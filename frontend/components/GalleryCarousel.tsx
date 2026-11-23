import React, { useState, useEffect, useRef, useCallback } from "react";
import { GalleryImage } from "../types";
import * as Icons from "./Icons";

const FADE_MS = 700;

export interface GalleryCarouselProps {
  galleryImages: GalleryImage[];
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

function ThumbnailBtn({
  img,
  isActive,
  onClick,
}: {
  img: GalleryImage;
  isActive: boolean;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={`View ${img.name}`}
      className={`relative shrink-0 h-16 w-16 md:h-20 md:w-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
        isActive
          ? "border-sky-400 scale-110 shadow-lg shadow-sky-900/40"
          : "border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500"
      }`}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-slate-700 animate-pulse" />
      )}
      <img
        src={img.imageUrl}
        alt=""
        aria-hidden
        draggable={false}
        className={`w-full h-full object-cover pointer-events-none select-none transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
    </button>
  );
}

const GalleryCarousel: React.FC<GalleryCarouselProps> = ({
  galleryImages,
  autoScroll = true,
  autoScrollInterval = 5,
}) => {
  const count = galleryImages.length;

  // Two-layer crossfade: "back" holds the outgoing image, "front" holds incoming
  const [backIdx, setBackIdx] = useState(0);
  const [frontIdx, setFrontIdx] = useState(0);
  const [frontVisible, setFrontVisible] = useState(true);

  // Refs so the setInterval closure always reads current values
  const frontIdxRef = useRef(0);
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const crossfade = useCallback(
    (next: number) => {
      if (busyRef.current || next === frontIdxRef.current || count < 2) return;
      busyRef.current = true;
      const prev = frontIdxRef.current;
      setBackIdx(prev);
      setFrontIdx(next);
      frontIdxRef.current = next;
      // Start new front at opacity-0 so the browser paints it invisible first,
      // then the double-RAF triggers the CSS transition to opacity-100.
      setFrontVisible(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFrontVisible(true);
          setTimeout(() => {
            busyRef.current = false;
          }, FADE_MS + 50);
        });
      });
    },
    [count],
  );

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!autoScroll || count <= 1) return;
    timerRef.current = setInterval(() => {
      crossfade((frontIdxRef.current + 1) % count);
    }, autoScrollInterval * 1000);
  }, [autoScroll, autoScrollInterval, count, crossfade]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const navigate = (next: number) => {
    crossfade(next);
    startTimer();
  };

  if (count === 0) return null;

  const noInteract = {
    draggable: false as const,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl bg-slate-900">
      {/* ── Main stage ── */}
      <div
        className="relative overflow-hidden bg-slate-900"
        style={{ aspectRatio: "16 / 7" }}
      >
        {/* Back layer: outgoing image, fades out as front fades in */}
        <img
          src={galleryImages[backIdx].imageUrl}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-opacity duration-700 ${
            frontVisible ? "opacity-0" : "opacity-100"
          }`}
          {...noInteract}
        />

        {/* Front layer: incoming image, fades in */}
        <img
          src={galleryImages[frontIdx].imageUrl}
          alt={galleryImages[frontIdx].name}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-opacity duration-700 ${
            frontVisible ? "opacity-100" : "opacity-0"
          }`}
          {...noInteract}
        />

        {/* Vignette: darkens all four edges */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(15,23,42,0.78) 100%)",
          }}
        />

        {/* Bottom gradient: keeps caption text legible */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-900/95 to-transparent pointer-events-none"
        />

        {/* Caption */}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-5 flex items-end justify-between gap-4 pointer-events-none">
          <p className="text-white font-semibold text-lg tracking-wide drop-shadow-sm truncate">
            {galleryImages[frontIdx].name}
          </p>
          {count > 1 && (
            <span className="text-white/50 text-sm tabular-nums shrink-0">
              {frontIdx + 1}&thinsp;/&thinsp;{count}
            </span>
          )}
        </div>

        {/* Navigation arrows */}
        {count > 1 && (
          <>
            <button
              onClick={() =>
                navigate(frontIdx === 0 ? count - 1 : frontIdx - 1)
              }
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white"
            >
              <Icons.ChevronLeft size={20} />
            </button>
            <button
              onClick={() => navigate((frontIdx + 1) % count)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white"
            >
              <Icons.ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Pill-dot indicators (top-centre, hidden when count > 15) */}
        {count > 1 && count <= 15 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {galleryImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => navigate(idx)}
                aria-label={`Image ${idx + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  idx === frontIdx
                    ? "w-5 h-2 bg-white"
                    : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {count > 1 && (
        <div className="bg-slate-900/80 px-4 py-3 flex gap-2.5 overflow-x-auto">
          {galleryImages.map((img, idx) => (
            <ThumbnailBtn
              key={img.id}
              img={img}
              isActive={idx === frontIdx}
              onClick={() => navigate(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GalleryCarousel;
