import React, { useState, useEffect } from 'react';
import { useGalleries } from '../../context/GalleryContext';
import { TrashIcon, PlusIcon } from '../../components/Icons';
import { useToast } from '../../hooks/useToast';

const GalleriesManagement: React.FC = () => {
    const { galleries, galleryImages, addGallery, deleteGallery, fetchGalleryImages, addGalleryImage, deleteGalleryImage: delImg } = useGalleries();
    const { addToast } = useToast();
    const [newGalleryName, setNewGalleryName] = useState('');
    const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
    const [newImageName, setNewImageName] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [galleryError, setGalleryError] = useState('');
    const [imageError, setImageError] = useState('');

    useEffect(() => {
        if (galleries.length > 0 && !selectedGalleryId) {
            setSelectedGalleryId(galleries[0].id);
        }
        if (galleries.length === 0) {
            setSelectedGalleryId(null);
        }
    }, [galleries, selectedGalleryId]);

    useEffect(() => {
        if (selectedGalleryId) {
            fetchGalleryImages(selectedGalleryId);
        }
    }, [selectedGalleryId, fetchGalleryImages]);

    const handleAddGallery = async () => {
        console.log("handleAddGallery triggered"); // Debugging line
        setGalleryError(''); // Clear previous errors
        
        const trimmedName = newGalleryName.trim();
        
        if (!trimmedName) {
            setGalleryError('Gallery name is required');
            addToast("Gallery name is required", "error");
            return;
        }
        
        try {
            await addGallery({ name: trimmedName });
            addToast("Gallery added!", "success");
            setNewGalleryName(''); // Clear input after successful add
            setGalleryError(''); // Clear any lingering error
        } catch (error) {
            console.error("Failed to add gallery:", error);
            addToast("Failed to add gallery.", "error");
            setGalleryError("Failed to add gallery.");
        }
    };

    const handleAddImage = async (e: React.FormEvent) => {
        e.preventDefault();
        setImageError('');
        
        const trimmedImageName = newImageName.trim();
        const trimmedImageUrl = newImageUrl.trim();
        
        if (!trimmedImageName) {
            setImageError('Image name is required');
            addToast("Image name is required", "error");
            return;
        }
        if (!trimmedImageUrl) {
            setImageError('Image URL is required');
            addToast("Image URL is required", "error");
            return;
        }
        if (!selectedGalleryId) {
            setImageError('Please select a gallery first');
            addToast("Please select a gallery first", "error");
            return;
        }
        
        try {
            await addGalleryImage(selectedGalleryId, { name: trimmedImageName, imageUrl: trimmedImageUrl });
            addToast("Image added!", "success");
            setNewImageName('');
            setNewImageUrl('');
            setImageError('');
        } catch (error) {
            console.error("Failed to add image:", error);
            addToast("Failed to add image.", "error");
            setImageError("Failed to add image.");
        }
    };

    const currentImages = selectedGalleryId ? galleryImages[selectedGalleryId] || [] : [];

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Galleries Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gallery List */}
                <div className="lg:col-span-1 bg-slate-800 p-6 rounded-lg border border-slate-700 self-start">
                    <h2 className="text-xl font-semibold text-white mb-4">Galleries</h2>
                    <div className="mb-4">
                        <div className="flex gap-2 mb-2">
                            <input type="text" name="newGalleryName" value={newGalleryName} onChange={e => { setNewGalleryName(e.target.value); setGalleryError(''); }} placeholder="New Gallery Name" className="flex-grow p-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                            <button type="button" onClick={handleAddGallery} className="bg-sky-500 text-white p-2 rounded-lg flex items-center justify-center hover:bg-sky-600"><PlusIcon className="w-5 h-5" /></button>
                        </div>
                        {galleryError && <p className="text-red-400 text-sm">{galleryError}</p>}
                    </div>
                    <div className="space-y-2">
                        {galleries.map(gallery => (
                            <div key={gallery.id} onClick={() => setSelectedGalleryId(gallery.id)} className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors ${selectedGalleryId === gallery.id ? 'bg-sky-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                <span className="text-white truncate">{gallery.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); deleteGallery(gallery.id); }} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Image Management for Selected Gallery */}
                <div className="lg:col-span-2">
                    {selectedGalleryId ? (
                        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                            <h2 className="text-xl font-semibold text-white mb-4">Images in "{galleries.find(g => g.id === selectedGalleryId)?.name}"</h2>
                             <form onSubmit={handleAddImage} className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                                <input type="text" value={newImageName} onChange={(e) => setNewImageName(e.target.value)} placeholder="Image Name" className="flex-grow w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                <input type="text" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Image URL" className="flex-grow w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                <button type="submit" className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center hover:bg-sky-600 w-full md:w-auto">
                                    <PlusIcon className="w-5 h-5 mr-2" />Add
                                </button>
                            </form>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {currentImages.map(image => (
                                    <div key={image.id} className="relative group">
                                        <img src={image.imageUrl} alt={image.name} className="w-full h-32 object-cover rounded-lg" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                                            <p className="text-xs font-semibold truncate">{image.name}</p>
                                            <button onClick={() => delImg(selectedGalleryId, image.id)} className="self-end text-gray-300 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                                {currentImages.length === 0 && <p className="text-gray-400 col-span-full text-center py-4">This gallery has no images. Add one above.</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex items-center justify-center h-full min-h-[20rem]">
                            <p className="text-gray-400">Select a gallery on the left to manage its images, or create a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GalleriesManagement;
