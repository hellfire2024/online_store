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

  const [backIdx, setBackIdx] = useState(0);
  const [frontIdx, setFrontIdx] = useState(0);
  const [frontVisible, setFrontVisible] = useState(true);

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
    <div className="rounded-2xl overflow-hidden shadow-2xl bg-slate-950">
      {/* ── Main stage: 3:2 ratio, near-black bg, image contained ── */}
      <div
        className="relative bg-slate-950"
        style={{ aspectRatio: "3 / 2" }}
      >
        {/* Back layer */}
        <img
          src={galleryImages[backIdx].imageUrl}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-opacity duration-700 ${
            frontVisible ? "opacity-0" : "opacity-100"
          }`}
          {...noInteract}
        />

        {/* Front layer */}
        <img
          src={galleryImages[frontIdx].imageUrl}
          alt={galleryImages[frontIdx].name}
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-opacity duration-700 ${
            frontVisible ? "opacity-100" : "opacity-0"
          }`}
          {...noInteract}
        />

        {/* Navigation arrows */}
        {count > 1 && (
          <>
            <button
              onClick={() =>
                navigate(frontIdx === 0 ? count - 1 : frontIdx - 1)
              }
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white"
            >
              <Icons.ChevronLeft size={20} />
            </button>
            <button
              onClick={() => navigate((frontIdx + 1) % count)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white"
            >
              <Icons.ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* ── Caption + counter ── */}
      <div className="bg-slate-900 px-5 py-3 flex items-center justify-between gap-4 border-t border-slate-800">
        <p className="text-white font-medium text-sm truncate">
          {galleryImages[frontIdx].name}
        </p>
        {count > 1 && (
          <span className="text-slate-400 text-sm tabular-nums shrink-0">
            {frontIdx + 1}&thinsp;/&thinsp;{count}
          </span>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {count > 1 && (
        <div className="bg-slate-900/80 px-4 py-3 flex gap-2.5 overflow-x-auto border-t border-slate-800">
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
