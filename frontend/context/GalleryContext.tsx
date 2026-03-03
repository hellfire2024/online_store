import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Gallery, GalleryImage } from "../types";
import { apiClient } from "../services/apiClient";
import {
  fetchGalleries as fetchMockGalleries,
  fetchGalleryImages as fetchMockGalleryImages,
  addGallery as addMockGallery,
  deleteGallery as deleteMockGallery,
  addGalleryImage as addMockGalleryImage,
  updateGalleryImage as updateMockGalleryImage,
  deleteGalleryImage as deleteMockGalleryImage,
} from "../services/mockApi";

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
        const galleriesData = await apiClient.galleries.getAll();
        setGalleries(Array.isArray(galleriesData) ? galleriesData : []);
      } catch (error) {
        try {
          const mockGalleries = await fetchMockGalleries();
          setGalleries(Array.isArray(mockGalleries) ? mockGalleries : []);
        } catch {
          setGalleries([]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadGalleries();
  }, []);

  const fetchGalleryImages = async (galleryId: string) => {
    try {
      const images = await apiClient.galleries.getImages(galleryId);
      console.log(`Fetched ${images.length} images for gallery ${galleryId}:`, images);
      setGalleryImages((prev) => ({
        ...prev,
        [galleryId]: Array.isArray(images) ? images : [],
      }));
    } catch (error) {
      console.error("Failed to fetch gallery images:", error);
      // Don't fall back to mock data - let the error surface so admin knows there's an issue
      throw error;
    }
  };

  const addGallery = async (gallery: Omit<Gallery, "id">) => {
    try {
      const newGallery = await apiClient.galleries.create(gallery);
      setGalleries((prev) => [...prev, newGallery]);
    } catch (error) {
      console.error("Failed to create gallery:", error);
      throw error;
    }
  };

  const deleteGallery = async (galleryId: string) => {
    try {
      await apiClient.galleries.delete(galleryId);
      setGalleries((prev) => prev.filter((g) => g.id !== galleryId));
      setGalleryImages((prev) => {
        const next = { ...prev };
        delete next[galleryId];
        return next;
      });
    } catch (error) {
      console.error("Failed to delete gallery:", error);
      throw error;
    }
  };

  const addGalleryImage = async (
    galleryId: string,
    image: Omit<GalleryImage, "id">,
  ) => {
    try {
      const newImage = await apiClient.galleries.addImage(galleryId, image);
      console.log("Image uploaded successfully:", newImage);
      setGalleryImages((prev) => {
        const updated = {
          ...prev,
          [galleryId]: [...(prev[galleryId] || []), newImage],
        };
        console.log(`Gallery ${galleryId} now has ${updated[galleryId].length} images:`, updated[galleryId]);
        return updated;
      });
    } catch (error) {
      console.error("Failed to add gallery image to API:", error);
      // Don't fall back to mock API - let the error propagate so UI can handle it
      throw error;
    }
  };

  const updateGalleryImage = async (
    galleryId: string,
    imageId: string,
    updates: Partial<Omit<GalleryImage, "id">>,
  ) => {
    try {
      const updatedImage = await apiClient.galleries.updateImage(
        galleryId,
        imageId,
        updates,
      );
      setGalleryImages((prev) => ({
        ...prev,
        [galleryId]: (prev[galleryId] || []).map((img) =>
          img.id === imageId ? updatedImage : img,
        ),
      }));
    } catch (error) {
      const currentImage = (galleryImages[galleryId] || []).find(
        (img) => img.id === imageId,
      );
      if (!currentImage) return;

      const updatedImage = await updateMockGalleryImage(galleryId, {
        ...currentImage,
        ...updates,
      });
      setGalleryImages((prev) => ({
        ...prev,
        [galleryId]: (prev[galleryId] || []).map((img) =>
          img.id === imageId ? updatedImage : img,
        ),
      }));
    }
  };

  const deleteGalleryImage = async (galleryId: string, imageId: string) => {
    try {
      await apiClient.galleries.deleteImage(galleryId, imageId);
    } catch (error) {
      await deleteMockGalleryImage(galleryId, imageId);
    }

    setGalleryImages((prev) => ({
      ...prev,
      [galleryId]: (prev[galleryId] || []).filter((img) => img.id !== imageId),
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

export const useGallery = () => {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error("useGallery must be used within a GalleryProvider");
  }
  return context;
};

export const useGalleries = useGallery;
// ...existing code...
