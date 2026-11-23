import React from "react";
import { GalleryImage } from "../types";
import GalleryCarousel from "./GalleryCarousel";

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
  if (!galleryImages || galleryImages.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-white text-center mb-12 tracking-tight">
          Recent Creations
        </h2>
        <GalleryCarousel
          galleryImages={galleryImages}
          autoScroll={autoScroll}
          autoScrollInterval={autoScrollInterval}
        />
      </div>
    </section>
  );
};

export default RecentCreationsGallery;
