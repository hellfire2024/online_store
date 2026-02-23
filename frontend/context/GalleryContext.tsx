import React, {
	createContext,
	useState,
	useContext,
	ReactNode,
	useEffect,
} from "react";
import { Gallery, GalleryImage } from "../types";
import { apiClient } from "../services/apiClient";

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
	const [galleryImages, setGalleryImages] = useState<Record<string, GalleryImage[]>>({});
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadGalleries = async () => {
			setIsLoading(true);
			try {
				setGalleries([]);
			} catch (error) {
				setGalleries([]);
			} finally {
				setIsLoading(false);
			}
		};
		loadGalleries();
	}, []);

	const fetchGalleryImages = async (galleryId: string) => {};
	const addGallery = async (gallery: Omit<Gallery, "id">) => {};
	const deleteGallery = async (galleryId: string) => {};
	const addGalleryImage = async (galleryId: string, image: Omit<GalleryImage, "id">) => {};
	const updateGalleryImage = async (galleryId: string, imageId: string, updates: Partial<Omit<GalleryImage, "id">>) => {};
	const deleteGalleryImage = async (galleryId: string, imageId: string) => {};

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
// ...existing code...
