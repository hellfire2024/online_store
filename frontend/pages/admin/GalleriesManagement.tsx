import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  DragEvent,
} from "react";
import { useGalleries } from "../../context/GalleryContext";
import { TrashIcon, PlusIcon, EditIcon, UploadIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Spinner from "../../components/Spinner";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import Pagination from "../../components/Pagination";
import { apiClient } from "../../services/apiClient";

interface UploadJob {
  id: string;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface LightboxState {
  images: { id: string; name: string; imageUrl: string }[];
  index: number;
}

// ─── Image card with skeleton loader ──────────────────────────────────────────

interface ImageCardProps {
  image: { id: string; name: string; imageUrl: string };
  isRenaming: boolean;
  renamingValue: string;
  onRenameStart: () => void;
  onRenameChange: (v: string) => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  isRenaming,
  renamingValue,
  onRenameStart,
  onRenameChange,
  onRenameSave,
  onRenameCancel,
  onDelete,
  onPreview,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group relative flex flex-col bg-slate-800 rounded-xl border border-slate-700/60 overflow-hidden hover:border-slate-500 hover:shadow-lg hover:shadow-black/30 transition-all duration-200">
      {/* Image area */}
      <div
        className="relative aspect-square overflow-hidden bg-slate-700 cursor-zoom-in"
        onClick={onPreview}
      >
        {/* Skeleton shown while image is decoding */}
        {!loaded && !imgError && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-600 animate-pulse" />
        )}

        {imgError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Failed to load</span>
          </div>
        ) : (
          <img
            src={image.imageUrl}
            alt={image.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Hover overlay */}
        {!imgError && (
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Name + actions bar */}
      <div className="px-2.5 py-2 flex items-center gap-1 min-w-0 bg-slate-800">
        {isRenaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRenameSave();
            }}
            className="flex-1 flex gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={renamingValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && onRenameCancel()}
              className="flex-1 min-w-0 px-2 py-0.5 text-xs bg-slate-700 border border-sky-500 rounded text-white focus:outline-none"
            />
            <button
              type="submit"
              className="text-sky-400 hover:text-sky-300 transition-colors"
              title="Save"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onRenameCancel}
              className="text-slate-400 hover:text-slate-300 transition-colors"
              title="Cancel"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </form>
        ) : (
          <>
            <p
              title={image.name}
              onDoubleClick={onRenameStart}
              className="flex-1 min-w-0 text-xs text-slate-300 truncate cursor-default select-none"
            >
              {image.name}
            </p>
            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onRenameStart}
                className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-700 transition-colors"
                title="Rename (or double-click name)"
              >
                <EditIcon className="w-3 h-3" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                title="Delete image"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Lightbox ─────────────────────────────────────────────────────────────────

const Lightbox: React.FC<{
  state: LightboxState;
  onClose: () => void;
  onNav: (delta: number) => void;
}> = ({ state, onClose, onNav }) => {
  const img = state.images[state.index];
  const hasPrev = state.index > 0;
  const hasNext = state.index < state.images.length - 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNav(-1);
      if (e.key === "ArrowRight" && hasNext) onNav(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNav, hasPrev, hasNext]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Prev */}
      <button
        onClick={(e) => { e.stopPropagation(); onNav(-1); }}
        disabled={!hasPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 disabled:cursor-default transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Image */}
      <div
        className="max-w-[88vw] max-h-[90vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={img.id}
          src={img.imageUrl}
          alt={img.name}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        <div className="text-center">
          <p className="text-white/80 text-sm font-medium">{img.name}</p>
          <p className="text-white/40 text-xs mt-0.5">
            {state.index + 1} / {state.images.length}
          </p>
        </div>
      </div>

      {/* Next */}
      <button
        onClick={(e) => { e.stopPropagation(); onNav(1); }}
        disabled={!hasNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 disabled:cursor-default transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

const GalleriesManagement: React.FC = () => {
  const {
    galleries,
    galleryImages,
    isLoading,
    fetchGalleryImages,
    addGalleryImage,
    deleteGalleryImage,
    updateGalleryImage,
    addGallery,
    deleteGallery,
  } = useGalleries();

  const [newGalleryName, setNewGalleryName] = useState("");
  const [selectedGallery, setSelectedGallery] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([]);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");

  const { addToast } = useToast();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasUnsavedChanges(false);
  }, []);

  useEffect(() => {
    if (galleries.length > 0 && !selectedGallery) {
      setSelectedGallery(galleries[0].id);
    }
  }, [galleries, selectedGallery]);

  useEffect(() => {
    if (selectedGallery) {
      fetchGalleryImages(selectedGallery).catch(() => {
        addToast("Failed to load gallery images", "error");
      });
    }
  }, [selectedGallery, fetchGalleryImages]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!selectedGallery) {
        addToast("Select a gallery first", "error");
        return;
      }
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (!imageFiles.length) {
        addToast("No image files found in selection", "error");
        return;
      }

      const jobs: UploadJob[] = imageFiles.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        name: f.name,
        status: "pending",
      }));
      setUploadQueue(jobs);

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const jobId = jobs[i].id;

        setUploadQueue((q) =>
          q.map((j) => (j.id === jobId ? { ...j, status: "uploading" } : j)),
        );
        try {
          const upload = await apiClient.upload.image(file, {
            target: "gallery",
          });
          if (!upload.success || !upload.imageUrl)
            throw new Error("Upload endpoint returned no image URL");
          await addGalleryImage(selectedGallery, {
            name: file.name,
            imageUrl: upload.imageUrl,
          });
          setUploadQueue((q) =>
            q.map((j) => (j.id === jobId ? { ...j, status: "done" } : j)),
          );
        } catch (err) {
          setUploadQueue((q) =>
            q.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    status: "error",
                    error: err instanceof Error ? err.message : "Failed",
                  }
                : j,
            ),
          );
        }
      }

      setTimeout(() => setUploadQueue([]), 4000);
    },
    [selectedGallery, addGalleryImage, addToast],
  );

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const handleAddGallery = async () => {
    if (!newGalleryName.trim()) return;
    try {
      const created = await addGallery({ name: newGalleryName.trim() });
      setNewGalleryName("");
      addToast("Gallery created!", "success");
      if (created?.id) setSelectedGallery(created.id);
    } catch {
      addToast("Failed to create gallery", "error");
    }
  };

  const handleDeleteGallery = async (galleryId: string) => {
    if (
      !window.confirm(
        "Delete this gallery and all its images? This cannot be undone.",
      )
    )
      return;
    try {
      await deleteGallery(galleryId);
      if (selectedGallery === galleryId) setSelectedGallery(null);
      addToast("Gallery deleted", "success");
    } catch {
      addToast("Failed to delete gallery", "error");
    }
  };

  const handleRename = async (galleryId: string, imageId: string) => {
    if (!renamingValue.trim()) {
      addToast("Image name cannot be empty", "error");
      return;
    }
    try {
      await updateGalleryImage(galleryId, imageId, {
        name: renamingValue.trim(),
      });
      setRenamingId(null);
      addToast("Image renamed", "success");
    } catch {
      addToast("Failed to rename image", "error");
    }
  };

  const currentImages = selectedGallery
    ? galleryImages[selectedGallery] || []
    : [];
  const totalPages = Math.ceil(
    currentImages.length / (itemsPerPage === -1 ? 1 : itemsPerPage),
  );
  const paginatedImages =
    itemsPerPage === -1
      ? currentImages
      : currentImages.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage,
        );

  if (isLoading) return <Spinner />;

  return (
    <>
      {/* Lightbox portal */}
      {lightbox && (
        <Lightbox
          state={lightbox}
          onClose={() => setLightbox(null)}
          onNav={(delta) =>
            setLightbox((prev) =>
              prev
                ? { ...prev, index: Math.max(0, Math.min(prev.images.length - 1, prev.index + delta)) }
                : null,
            )
          }
        />
      )}

      <div className="w-full max-w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">
          Galleries
        </h1>

        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
          {/* ── Sidebar ── */}
          <aside className="bg-slate-800 rounded-xl border border-slate-700 p-4 self-start">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Your Galleries
            </p>

            {/* New gallery input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newGalleryName}
                onChange={(e) => setNewGalleryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddGallery()}
                placeholder="New gallery name"
                className="flex-1 min-w-0 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
              />
              <button
                onClick={handleAddGallery}
                disabled={!newGalleryName.trim()}
                className="shrink-0 p-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                title="Create gallery"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>

            {galleries.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">
                No galleries yet
              </p>
            ) : (
              <ul className="space-y-0.5">
                {galleries.map((g) => (
                  <li key={g.id}>
                    <div
                      onClick={() => {
                        setSelectedGallery(g.id);
                        setCurrentPage(1);
                      }}
                      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        selectedGallery === g.id
                          ? "bg-sky-600 text-white"
                          : "text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      <span className="flex-1 text-sm truncate">{g.name}</span>
                      <span
                        className={`text-xs tabular-nums shrink-0 ${
                          selectedGallery === g.id
                            ? "text-sky-200"
                            : "text-slate-500"
                        }`}
                      >
                        {(galleryImages[g.id] || []).length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGallery(g.id);
                        }}
                        className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${
                          selectedGallery === g.id
                            ? "text-sky-200 hover:text-red-300"
                            : "text-slate-500 hover:text-red-400"
                        }`}
                        title="Delete gallery"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* ── Main content ── */}
          <main className="min-w-0 space-y-4">
            {!selectedGallery ? (
              <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-slate-300 font-semibold">
                  Select a gallery to manage its images
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  or create a new one on the left
                </p>
              </div>
            ) : (
              <>
                {/* Gallery header */}
                <div className="flex items-baseline gap-3">
                  <h2 className="text-xl font-semibold text-white">
                    {galleries.find((g) => g.id === selectedGallery)?.name}
                  </h2>
                  <span className="text-slate-400 text-sm">
                    {currentImages.length} image
                    {currentImages.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Upload dropzone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl px-6 py-7 text-center cursor-pointer select-none transition-all duration-150 ${
                    isDragOver
                      ? "border-sky-400 bg-sky-500/10 scale-[1.005]"
                      : "border-slate-600 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) =>
                      uploadFiles(Array.from(e.target.files || []))
                    }
                    className="hidden"
                    multiple
                    accept="image/*"
                  />
                  <UploadIcon
                    className={`w-7 h-7 mx-auto mb-2 transition-colors ${
                      isDragOver ? "text-sky-400" : "text-slate-500"
                    }`}
                  />
                  <p
                    className={`font-medium text-sm transition-colors ${
                      isDragOver ? "text-sky-300" : "text-slate-300"
                    }`}
                  >
                    {isDragOver
                      ? "Release to upload"
                      : "Drop images here, or click to browse"}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    JPEG · PNG · WebP · GIF · up to 10 MB each
                  </p>
                </div>

                {/* Upload progress */}
                {uploadQueue.length > 0 && (
                  <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                      Uploading {uploadQueue.length} file
                      {uploadQueue.length !== 1 ? "s" : ""}
                    </p>
                    <ul className="space-y-2">
                      {uploadQueue.map((job) => (
                        <li key={job.id} className="flex items-center gap-3">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              job.status === "done"
                                ? "bg-green-400"
                                : job.status === "error"
                                  ? "bg-red-400"
                                  : job.status === "uploading"
                                    ? "bg-sky-400 animate-pulse"
                                    : "bg-slate-600"
                            }`}
                          />
                          <span className="flex-1 text-sm text-slate-300 truncate">
                            {job.name}
                          </span>
                          <span
                            className={`text-xs shrink-0 tabular-nums ${
                              job.status === "done"
                                ? "text-green-400"
                                : job.status === "error"
                                  ? "text-red-400"
                                  : "text-slate-500"
                            }`}
                          >
                            {job.status === "done"
                              ? "Done"
                              : job.status === "error"
                                ? job.error || "Failed"
                                : job.status === "uploading"
                                  ? "Uploading…"
                                  : "Waiting"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Image grid */}
                {currentImages.length === 0 && uploadQueue.length === 0 ? (
                  <div className="bg-slate-800 rounded-xl border border-slate-700 py-16 text-center">
                    <p className="text-slate-500 text-sm">
                      This gallery is empty. Upload some images above.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {paginatedImages.map((image, idx) => {
                      const globalIdx =
                        (currentPage - 1) *
                          (itemsPerPage === -1
                            ? currentImages.length
                            : itemsPerPage) +
                        idx;
                      return (
                        <ImageCard
                          key={image.id}
                          image={image}
                          isRenaming={renamingId === image.id}
                          renamingValue={renamingValue}
                          onRenameStart={() => {
                            setRenamingId(image.id);
                            setRenamingValue(image.name);
                          }}
                          onRenameChange={setRenamingValue}
                          onRenameSave={() =>
                            handleRename(selectedGallery, image.id)
                          }
                          onRenameCancel={() => setRenamingId(null)}
                          onDelete={() => {
                            if (
                              window.confirm(
                                `Delete "${image.name}"? This cannot be undone.`,
                              )
                            ) {
                              deleteGalleryImage(selectedGallery, image.id);
                            }
                          }}
                          onPreview={() =>
                            setLightbox({
                              images: currentImages,
                              index: globalIdx,
                            })
                          }
                        />
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {currentImages.length > 0 && totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalItems={currentImages.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(v) => {
                      setItemsPerPage(v);
                      setCurrentPage(1);
                    }}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default GalleriesManagement;
