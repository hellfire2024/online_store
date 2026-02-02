import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Gallery, GalleryImage } from "../types";
import * as mockApi from "../services/mockApi";

interface GalleryContextType {
  galleries: Gallery[];
  galleryImages: Record<string, GalleryImage[]>;
  isLoading: boolean;
  fetchGalleryImages: (galleryId: string) => Promise<void>;
  addGallery: (gallery: Omit<Gallery, "id">) => Promise<void>;
  deleteGallery: (galleryId: string) => Promise<void>;
  addGalleryImage: (
    galleryId: string,
    image: Omit<GalleryImage, "id">,
  ) => Promise<void>;
  updateGalleryImage: (
    galleryId: string,
    imageId: string,
    updates: Partial<Omit<GalleryImage, "id">>,
  ) => Promise<void>;
  deleteGalleryImage: (galleryId: string, imageId: string) => Promise<void>;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export const GalleryProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [galleryImages, setGalleryImages] = useState<
    Record<string, GalleryImage[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGalleries = async () => {
      setIsLoading(true);
      try {
        const galleriesData = await mockApi.fetchGalleries();
        setGalleries(galleriesData);
      } catch (error) {
        console.error("Failed to load galleries", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGalleries();
  }, []);

  const addGallery = async (galleryData: Omit<Gallery, "id">) => {
    const newGallery = await mockApi.addGallery(galleryData);
    setGalleries((prev) => [...prev, newGallery]);
  };

  const deleteGallery = async (galleryId: string) => {
    await mockApi.deleteGallery(galleryId);
    setGalleries((prev) => prev.filter((g) => g.id !== galleryId));
    // Also update products context if a product was using this gallery, though that's an advanced case for later.
  };

  const fetchGalleryImages = async (galleryId: string) => {
    const images = await mockApi.fetchGalleryImages(galleryId);
    setGalleryImages((prev) => ({ ...prev, [galleryId]: images }));
  };

  const addGalleryImage = async (
    galleryId: string,
    imageData: Omit<GalleryImage, "id">,
  ) => {
    const newImage = await mockApi.addGalleryImage(galleryId, imageData);
    setGalleryImages((prev) => ({
      ...prev,
      [galleryId]: [...(prev[galleryId] || []), newImage],
    }));
  };

  const deleteGalleryImage = async (galleryId: string, imageId: string) => {
    await mockApi.deleteGalleryImage(galleryId, imageId);
    setGalleryImages((prev) => ({
      ...prev,
      [galleryId]: prev[galleryId].filter((img) => img.id !== imageId),
    }));
  };

  const updateGalleryImage = async (
    galleryId: string,
    imageId: string,
    updates: Partial<Omit<GalleryImage, "id">>,
  ) => {
    await mockApi.updateGalleryImage(galleryId, imageId, updates);
    setGalleryImages((prev) => ({
      ...prev,
      [galleryId]: prev[galleryId].map((img) =>
        img.id === imageId ? { ...img, ...updates } : img,
      ),
    }));
  };

  return (
    <GalleryContext.Provider
      value={{
        galleries,
        galleryImages,
        isLoading,
        fetchGalleryImages,
        addGallery,
        deleteGallery,
        addGalleryImage,
        updateGalleryImage,
        deleteGalleryImage,
      }}
    >
      {children}
    </GalleryContext.Provider>
  );
};

export const useGalleries = () => {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error("useGalleries must be used within a GalleryProvider");
  }
  return context;
};
