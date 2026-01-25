import React, { useState, useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";
import { TrashIcon, PlusIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Spinner from "../../components/Spinner";

const GalleriesManagement: React.FC = () => {
  const {
    galleries,
    addGallery,
    deleteGallery,
    galleryImages,
    fetchGalleryImages,
    addGalleryImage,
    deleteGalleryImage: delImg,
  } = useAdmin();
  const [newGalleryName, setNewGalleryName] = useState("");
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(
    null,
  );
  const [newImageName, setNewImageName] = useState("");
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);

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

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newGalleryName) {
      await addGallery({ name: newGalleryName });
      setNewGalleryName("");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newImageName && newImageUrl && selectedGalleryId) {
      await addGalleryImage(selectedGalleryId, {
        name: newImageName,
        url: newImageUrl,
      });
      setNewImageName("");
      setNewImageUrl(null);
    }
  };

  const currentImages = selectedGalleryId
    ? galleryImages[selectedGalleryId] || []
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">
        Galleries Management
      </h1>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Galleries</h2>
        <form onSubmit={handleAddGallery} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newGalleryName}
            onChange={(e) => setNewGalleryName(e.target.value)}
            placeholder="New Gallery Name"
            className="flex-grow min-w-0 p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
          />
          <button
            type="submit"
            className="bg-sky-500 text-white p-2 rounded-lg flex items-center justify-center hover:bg-sky-600 shrink-0"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </form>
        <div className="space-y-2">
          {galleries.map((gallery) => (
            <div
              key={gallery.id}
              onClick={() => setSelectedGalleryId(gallery.id)}
              className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors ${selectedGalleryId === gallery.id ? "bg-sky-600" : "bg-slate-700 hover:bg-slate-600"}`}
            >
              <span className="text-white truncate">{gallery.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteGallery(gallery.id);
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Image Management for Selected Gallery */}
      <div className="lg:col-span-2">
        {selectedGalleryId ? (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Images in "
              {galleries.find((g) => g.id === selectedGalleryId)?.name}"
            </h2>
            <form
              onSubmit={handleAddImage}
              className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto] gap-4 mb-6 items-end"
            >
              <input
                type="text"
                value={newImageName}
                onChange={(e) => setNewImageName(e.target.value)}
                placeholder="Image Name"
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
              <div className="flex items-center gap-2">
                {newImageUrl && (
                  <img
                    src={newImageUrl}
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <label className="cursor-pointer bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg w-full text-center">
                  <span>Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              <button
                type="submit"
                className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center hover:bg-sky-600 w-full md:w-auto shrink-0"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add
              </button>
            </form>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {currentImages.map((image) => (
                <div key={image.id} className="relative group aspect-square">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                    <p className="text-xs font-semibold truncate">
                      {image.name}
                    </p>
                    <button
                      onClick={() => delImg(selectedGalleryId, image.id)}
                      className="self-end text-gray-300 hover:text-red-500"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {currentImages.length === 0 && (
                <p className="text-gray-400 col-span-full text-center py-4">
                  This gallery has no images. Add one above.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex items-center justify-center h-full min-h-[20rem]">
            <p className="text-gray-400">
              Select a gallery on the left to manage its images, or create a new
              one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleriesManagement;
