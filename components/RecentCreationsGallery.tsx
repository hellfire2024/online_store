import React, { useState, useEffect } from "react";
import { GalleryImage } from "../types";
import * as Icons from "./Icons";

interface RecentCreationsGalleryProps {
  galleryImages: GalleryImage[];
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

const RecentCreationsGallery: React.FC<RecentCreationsGalleryProps> = ({
  galleryImages,
  autoScroll = true,
  autoScrollInterval = 5,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || galleryImages.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % galleryImages.length);
    }, autoScrollInterval * 1000);

    return () => clearInterval(timer);
  }, [autoScroll, autoScrollInterval, galleryImages.length]);

  if (!galleryImages || galleryImages.length === 0) {
    return null;
  }

  const currentImage = galleryImages[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? galleryImages.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % galleryImages.length);
  };

  return (
    <div className="py-16 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-white text-center mb-12">
          Recent Creations
        </h2>

        {/* Main carousel */}
        <div className="relative bg-slate-900 rounded-lg overflow-hidden">
          {/* Image container */}
          <div className="relative h-96 md:h-[500px] overflow-hidden">
            <img
              key={currentImage.id}
              src={currentImage.imageUrl}
              alt={currentImage.name}
              className="w-full h-full object-cover transition-opacity duration-500"
            />
          </div>

          {/* Image info */}
          <div className="bg-slate-800 p-6 text-center">
            <h3 className="text-2xl font-semibold text-white mb-2">
              {currentImage.name}
            </h3>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/3 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-all duration-200"
            aria-label="Previous image"
          >
            <Icons.ChevronLeft size={24} />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/3 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-all duration-200"
            aria-label="Next image"
          >
            <Icons.ChevronRight size={24} />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2">
            {galleryImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "bg-white w-3 h-3"
                    : "bg-white/50 w-2 h-2 hover:bg-white/75"
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {galleryImages.length}
          </div>
        </div>

        {/* Thumbnail strip (optional) */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {galleryImages.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 h-24 w-24 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                idx === currentIndex
                  ? "border-blue-500 ring-2 ring-blue-400"
                  : "border-slate-600 hover:border-slate-500"
              }`}
              aria-label={`Select ${img.name}`}
            >
              <img
                src={img.imageUrl}
                alt={img.name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentCreationsGallery;
