import React, { useState, useEffect, useRef } from "react";
import { useGalleries } from "../../context/GalleryContext";
import { PlusIcon, TrashIcon, UploadIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Spinner from "../../components/Spinner";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import Pagination from "../../components/Pagination";

const GalleriesManagement: React.FC = () => {
  const {
    galleries,
    galleryImages,
    isLoading,
    fetchGalleryImages,
    addGalleryImage,
    deleteGalleryImage,
    addGallery,
    deleteGallery,
  } = useGalleries();
  const [newGalleryName, setNewGalleryName] = useState("");
  const [selectedGallery, setSelectedGallery] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { addToast } = useToast();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasUnsavedChanges(false);
  }, []);

  useEffect(() => {
    if (folderInputRef.current) {
      try {
        folderInputRef.current.setAttribute('webkitdirectory', '');
      } catch {}
    }
  }, []);

  const handleAddGallery = async () => {
    if (newGalleryName.trim()) {
      await addGallery({ name: newGalleryName.trim() });
      setNewGalleryName("");
      addToast("Gallery created successfully!", "success");
    }
  };

  const handleDeleteGallery = async (galleryId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this gallery? This action cannot be undone.",
      )
    ) {
      await deleteGallery(galleryId);
      if (selectedGallery === galleryId) {
        setSelectedGallery(null);
      }
      addToast("Gallery deleted.", "success");
    }
  };

  useEffect(() => {
    const init = async () => {
      if (galleries.length > 0 && !selectedGallery) {
        setSelectedGallery(galleries[0].id);
      }
    };
    init();
  }, [galleries, selectedGallery]);

  useEffect(() => {
    if (selectedGallery) {
      fetchGalleryImages(selectedGallery);
    }
  }, [selectedGallery]);

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!selectedGallery) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;

    addToast(`Uploading ${files.length} image(s)...`, "info");

    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageUrl = e.target?.result as string;
          await addGalleryImage(selectedGallery, { name: file.name, imageUrl });
        };
        reader.readAsDataURL(file);
      }
    }

    addToast(`Finished processing ${files.length} files.`, "success");
    // Reset the input value to allow re-uploading the same file/folder
    event.target.value = "";
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">
        Galleries Management
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Galleries List & Creation */}
        <div className="md:col-span-1 bg-slate-800 p-6 rounded-lg border border-slate-700 self-start">
          <h2 className="text-xl font-semibold text-white mb-4">Galleries</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newGalleryName}
              onChange={(e) => setNewGalleryName(e.target.value)}
              placeholder="New gallery name"
              className="grow p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
            <button
              onClick={handleAddGallery}
              className="bg-sky-500 text-white p-2 rounded-md hover:bg-sky-600"
            >
              <PlusIcon />
            </button>
          </div>
          <div className="space-y-2">
            {galleries.map((gallery) => (
              <div
                key={gallery.id}
                onClick={() => setSelectedGallery(gallery.id)}
                className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors ${
                  selectedGallery === gallery.id
                    ? "bg-sky-600 text-white"
                    : "bg-slate-700 hover:bg-slate-600 text-gray-300"
                }`}
              >
                <span>{gallery.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGallery(gallery.id);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Gallery Content */}
        <div className="md:col-span-2 bg-slate-800 p-6 rounded-lg border border-slate-700">
          {selectedGallery &&
          galleries.find((g) => g.id === selectedGallery) ? (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">
                  {galleries.find((g) => g.id === selectedGallery)?.name}
                </h2>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelected}
                    className="hidden"
                    multiple
                    accept="image/*"
                  />
                  <input
                    type="file"
                    ref={folderInputRef}
                    onChange={handleFileSelected}
                    className="hidden"
                    multiple
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg whitespace-nowrap"
                  >
                    <UploadIcon /> Add Image(s)
                  </button>
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg whitespace-nowrap"
                  >
                    <UploadIcon /> Add Folder
                  </button>
                </div>
              </div>

              {(() => {
                const images = galleryImages[selectedGallery] || [];
                const paginatedImages = itemsPerPage === -1 
                  ? images 
                  : images.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                
                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {paginatedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.imageUrl}
                      alt={image.name}
                      className="w-full h-32 object-cover rounded-md bg-slate-700"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <p className="text-white text-xs wrap-break-word">
                        {image.name}
                      </p>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${image.name}"? This action cannot be undone.`)) {
                            deleteGalleryImage(selectedGallery, image.id);
                          }
                        }}
                        className="self-end p-1 bg-red-500/80 rounded-full text-white hover:bg-red-500"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                      ))}
                    </div>
                    {images.length > 0 && (
                      <Pagination
                        currentPage={currentPage}
                        totalItems={images.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={(value) => {
                          setItemsPerPage(value);
                          setCurrentPage(1);
                        }}
                      />
                    )}
                    {images.length === 0 && (
                      <p className="text-center text-gray-400 mt-8">
                        This gallery is empty. Add some images to get started.
                      </p>
                    )}
                  </>
                );
              })()}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">
                Select a gallery to view its images.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleriesManagement;
