import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Gallery, GalleryImage } from "../types";
import * as apiClient from "../services/apiClient";

const api = apiClient.default || (apiClient as any);

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
        const galleriesData = await api.galleries.getAll();
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
    const newGallery = await api.galleries.create(galleryData);
    setGalleries((prev) => [...prev, newGallery]);
  };

  const deleteGallery = async (galleryId: string) => {
    await api.galleries.delete(galleryId);
    setGalleries((prev) => prev.filter((g) => g.id !== galleryId));
  };

  const fetchGalleryImages = async (galleryId: string) => {
    const images = await api.galleries.getImages(galleryId);
    setGalleryImages((prev) => ({ ...prev, [galleryId]: images }));
  };

  const addGalleryImage = async (
    galleryId: string,
    imageData: Omit<GalleryImage, "id">,
  ) => {
    const newImage = await api.galleries.addImage(galleryId, imageData);
    setGalleryImages((prev) => ({
      ...prev,
      [galleryId]: [...(prev[galleryId] || []), newImage],
    }));
  };

  const deleteGalleryImage = async (galleryId: string, imageId: string) => {
    await api.galleries.deleteImage(galleryId, imageId);
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
    await api.galleries.updateImage(galleryId, imageId, updates);
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
