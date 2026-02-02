import React, { useState, useEffect } from 'react';
import { useGalleries } from '../../context/GalleryContext';
import { TrashIcon, PlusIcon, EditIcon } from '../../components/Icons';
import { useToast } from '../../hooks/useToast';
import Pagination from '../../components/Pagination';

const GalleriesManagement: React.FC = () => {
    const { galleries, galleryImages, addGallery, deleteGallery, fetchGalleryImages, addGalleryImage, updateGalleryImage, deleteGalleryImage: delImg } = useGalleries();
    const { addToast } = useToast();
    const [newGalleryName, setNewGalleryName] = useState('');
    const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
    const [newImageName, setNewImageName] = useState('');
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [galleryError, setGalleryError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [editingImageName, setEditingImageName] = useState('');

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
        
        const trimmedImageName = newImageName.trim();
        
        if (!trimmedImageName) {
            addToast("Image name is required", "error");
            return;
        }
        if (!newImageFile) {
            addToast("Please select an image file", "error");
            return;
        }
        if (!selectedGalleryId) {
            addToast("Please select a gallery first", "error");
            return;
        }
        
        try {
            // Convert file to base64
            const reader = new FileReader();
            reader.onload = async (event) => {
                const imageUrl = event.target?.result as string;
                await addGalleryImage(selectedGalleryId, { name: trimmedImageName, imageUrl });
                addToast("Image added!", "success");
                setNewImageName('');
                setNewImageFile(null);
            };
            reader.readAsDataURL(newImageFile);
        } catch (error) {
            console.error("Failed to add image:", error);
            addToast("Failed to add image.", "error");
        }
    };

    const handleEditImage = async (imageId: string, newName: string) => {
        if (!selectedGalleryId) return;
        
        if (!newName.trim()) {
            addToast("Image name cannot be empty", "error");
            return;
        }

        try {
            await updateGalleryImage(selectedGalleryId, imageId, { name: newName.trim() });
            addToast("Image renamed successfully!", "success");
            setEditingImageId(null);
            setEditingImageName('');
        } catch (error) {
            console.error("Failed to update image:", error);
            addToast("Failed to rename image.", "error");
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
                            <input type="text" name="newGalleryName" value={newGalleryName} onChange={e => { setNewGalleryName(e.target.value); setGalleryError(''); }} placeholder="New Gallery Name" className="grow p-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                            <button type="button" onClick={handleAddGallery} className="bg-sky-500 text-white p-2 rounded-lg flex items-center justify-center hover:bg-sky-600"><PlusIcon className="w-5 h-5" /></button>
                        </div>
                        {galleryError && <p className="text-red-400 text-sm">{galleryError}</p>}
                    </div>
                    <div className="space-y-2">
                        {galleries.map(gallery => (
                            <div key={gallery.id} onClick={() => setSelectedGalleryId(gallery.id)} className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors ${selectedGalleryId === gallery.id ? 'bg-sky-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                <span className="text-white truncate">{gallery.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Are you sure you want to delete "${gallery.name}"? This action cannot be undone.`)) { deleteGallery(gallery.id); } }} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Image Management for Selected Gallery */}
                <div className="lg:col-span-2">
                    {selectedGalleryId ? (
                        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                            <h2 className="text-xl font-semibold text-white mb-4">Images in "{galleries.find(g => g.id === selectedGalleryId)?.name}"</h2>
                             <form onSubmit={handleAddImage} className="flex flex-col gap-4 mb-6">
                                <input 
                                    type="text" 
                                    value={newImageName} 
                                    onChange={(e) => setNewImageName(e.target.value)} 
                                    placeholder="Image Name/Description" 
                                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white" 
                                />
                                <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-sky-500 hover:bg-slate-700/50 transition-colors">
                                    <div className="flex flex-col items-center">
                                        <span className="text-sky-400 font-medium">
                                            {newImageFile ? newImageFile.name : "Click to upload image"}
                                        </span>
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                </label>
                                <button 
                                    type="submit" 
                                    className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center hover:bg-sky-600 w-full"
                                >
                                    <PlusIcon className="w-5 h-5 mr-2" />Upload Image
                                </button>
                            </form>
                            {(() => {
                              const paginatedImages = itemsPerPage === -1 
                                ? currentImages 
                                : currentImages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                              
                              return (
                                <>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {paginatedImages.map(image => (
                                    <div key={image.id} className="relative group">
                                        <img src={image.imageUrl} alt={image.name} className="w-full h-32 object-cover rounded-lg" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                                            {editingImageId === image.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingImageName}
                                                        onChange={(e) => setEditingImageName(e.target.value)}
                                                        className="text-xs p-1 bg-slate-700 rounded text-white"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleEditImage(image.id, editingImageName)}
                                                            className="flex-1 text-xs bg-sky-500 hover:bg-sky-600 px-2 py-1 rounded"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingImageId(null)}
                                                            className="flex-1 text-xs bg-slate-600 hover:bg-slate-700 px-2 py-1 rounded"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-xs font-semibold truncate">{image.name}</p>
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => {
                                                                setEditingImageId(image.id);
                                                                setEditingImageName(image.name);
                                                            }}
                                                            className="text-gray-300 hover:text-blue-400"
                                                            title="Edit image name"
                                                        >
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => delImg(selectedGalleryId, image.id)}
                                                            className="text-gray-300 hover:text-red-500"
                                                            title="Delete image"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    ))}
                                    {paginatedImages.length === 0 && <p className="text-gray-400 col-span-full text-center py-4">This gallery has no images. Add one above.</p>}
                                  </div>
                                  {currentImages.length > 0 && (
                                    <Pagination
                                      currentPage={currentPage}
                                      totalItems={currentImages.length}
                                      itemsPerPage={itemsPerPage}
                                      onPageChange={setCurrentPage}
                                      onItemsPerPageChange={(value) => {
                                        setItemsPerPage(value);
                                        setCurrentPage(1);
                                      }}
                                    />
                                  )}
                                </>
                              );
                            })()}
                        </div>
                    ) : (
                        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex items-center justify-center h-full min-h-80">
                            <p className="text-gray-400">Select a gallery on the left to manage its images, or create a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GalleriesManagement;
