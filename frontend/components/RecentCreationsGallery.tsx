import React, { useState, useEffect, useCallback } from "react";
import { GalleryImage } from "../types";
import * as Icons from "./Icons";

interface RecentCreationsGalleryProps {
  galleryImages: GalleryImage[];
}

const RecentCreationsGallery: React.FC<RecentCreationsGalleryProps> = ({
  galleryImages,
}) => {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const count = galleryImages.length;

  const prev = useCallback(
    () =>
      setLightboxIdx((i) =>
        i === null ? null : i === 0 ? count - 1 : i - 1,
      ),
    [count],
  );

  const next = useCallback(
    () => setLightboxIdx((i) => (i === null ? null : (i + 1) % count)),
    [count],
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, prev, next]);

  // Lock body scroll while lightbox is open
  useEffect(() => {
    if (lightboxIdx !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxIdx]);

  if (!galleryImages || count === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-white text-center mb-12 tracking-tight">
          Recent Creations
        </h2>

        {/* Masonry grid — images at their natural aspect ratio, no cropping */}
        <div
          className="columns-2 md:columns-3 xl:columns-4"
          style={{ columnGap: "10px" }}
        >
          {galleryImages.map((img, idx) => (
            <div
              key={img.id}
              className="break-inside-avoid cursor-pointer group relative overflow-hidden rounded-xl"
              style={{ marginBottom: "10px" }}
              onClick={() => setLightboxIdx(idx)}
            >
              <img
                src={img.imageUrl}
                alt={img.name}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="w-full block rounded-xl transition-transform duration-300 group-hover:scale-[1.03]"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/45 transition-colors duration-300 flex items-end pointer-events-none">
                <p className="text-white text-sm font-semibold px-3 pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md leading-tight">
                  {img.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            aria-label="Close"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            onClick={() => setLightboxIdx(null)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Counter */}
          <span className="absolute top-5 left-5 text-white/50 text-sm tabular-nums select-none">
            {lightboxIdx + 1} / {count}
          </span>

          {/* Prev */}
          {count > 1 && (
            <button
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
            >
              <Icons.ChevronLeft size={24} />
            </button>
          )}

          {/* Image */}
          <img
            src={galleryImages[lightboxIdx].imageUrl}
            alt={galleryImages[lightboxIdx].name}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="max-w-[90vw] max-h-[88vh] object-contain rounded-lg select-none shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {count > 1 && (
            <button
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
            >
              <Icons.ChevronRight size={24} />
            </button>
          )}

          {/* Caption */}
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium max-w-xs text-center select-none">
            {galleryImages[lightboxIdx].name}
          </p>
        </div>
      )}
    </section>
  );
};

export default RecentCreationsGallery;
