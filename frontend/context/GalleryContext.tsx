import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { Gallery, GalleryImage } from "../types";
import { apiClient } from "../services/apiClient";

interface GalleryContextType {
  galleries: Gallery[];
  galleryImages: Record<string, GalleryImage[]>;
  isLoading: boolean;
  fetchGalleryImages: (galleryId: string) => Promise<void>;
  addGallery: (gallery: Omit<Gallery, "id">) => Promise<Gallery>;
  deleteGallery: (galleryId: string) => Promise<void>;
  addGalleryImage: (
    galleryId: string,
    image: Omit<GalleryImage, "id">,
  ) => Promise<GalleryImage>;
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
        console.log("Galleries loaded from API:", galleriesData);
        setGalleries(Array.isArray(galleriesData) ? galleriesData : []);
      } catch (error) {
        console.error("Failed to load galleries from API:", error);
        // Don't fall back to mock galleries - let the error surface
        setGalleries([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadGalleries();
  }, []);

  const fetchGalleryImages = useCallback(async (galleryId: string) => {
    try {
      const images = await apiClient.galleries.getImages(galleryId);
      console.log(
        `Fetched ${images.length} images for gallery ${galleryId}:`,
        images,
      );
      setGalleryImages((prev) => ({
        ...prev,
        [galleryId]: Array.isArray(images) ? images : [],
      }));
    } catch (error) {
      console.error("Failed to fetch gallery images:", error);
      // Don't fall back to mock data - let the error surface so admin knows there's an issue
      throw error;
    }
  }, []);

  const addGallery = useCallback(async (gallery: Omit<Gallery, "id">) => {
    try {
      const newGallery = await apiClient.galleries.create(gallery);
      setGalleries((prev) => [...prev, newGallery]);
      // Initialize empty images array for new gallery
      setGalleryImages((prev) => ({
        ...prev,
        [newGallery.id]: [],
      }));
      return newGallery;
    } catch (error) {
      console.error("Failed to create gallery:", error);
      throw error;
    }
  }, []);

  const deleteGallery = useCallback(async (galleryId: string) => {
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
  }, []);

  const addGalleryImage = useCallback(
    async (galleryId: string, image: Omit<GalleryImage, "id">) => {
      try {
        console.log(
          `[GalleryContext] Adding image "${image.name}" to gallery ${galleryId}`,
        );
        const newImage = await apiClient.galleries.addImage(galleryId, image);
        console.log(`[GalleryContext] API returned image:`, newImage);

        setGalleryImages((prev) => {
          const currentImages = prev[galleryId] || [];
          const updated = {
            ...prev,
            [galleryId]: [...currentImages, newImage],
          };
          console.log(
            `[GalleryContext] Gallery ${galleryId} now has ${updated[galleryId].length} images (was ${currentImages.length})`,
          );
          console.log(
            `[GalleryContext] All image IDs in gallery:`,
            updated[galleryId].map((img) => img.id),
          );
          return updated;
        });

        return newImage;
      } catch (error) {
        console.error(
          "[GalleryContext] Failed to add gallery image to API:",
          error,
        );
        // Don't fall back to mock API - let the error propagate so UI can handle it
        throw error;
      }
    },
    [],
  );

  const updateGalleryImage = useCallback(
    async (
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
        console.error("Failed to update gallery image:", error);
        throw error;
      }
    },
    [],
  );

  const deleteGalleryImage = useCallback(
    async (galleryId: string, imageId: string) => {
      try {
        await apiClient.galleries.deleteImage(galleryId, imageId);
        setGalleryImages((prev) => ({
          ...prev,
          [galleryId]: (prev[galleryId] || []).filter(
            (img) => img.id !== imageId,
          ),
        }));
      } catch (error) {
        console.error("Failed to delete gallery image:", error);
        throw error;
      }
    },
    [],
  );

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
