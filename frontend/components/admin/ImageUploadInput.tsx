import React, { useState, useEffect } from "react";
import DragDropFileUpload from "../DragDropFileUpload";

interface ImageUploadInputProps {
  label: string;
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  onFileSelect: (file: File) => void;
  enableFocalCrop?: boolean;
  cropAspect?: number;
  outputWidth?: number;
  outputHeight?: number;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  label,
  imageUrl,
  onFileSelect,
  onImageUrlChange,
  enableFocalCrop = false,
  cropAspect = 16 / 9,
  outputWidth = 1920,
  outputHeight = 1080,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [selectedRawFile, setSelectedRawFile] = useState<File | null>(null);
  const [focalX, setFocalX] = useState(50);
  const [focalY, setFocalY] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const processFocalCrop = async (file: File): Promise<File> => {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImage(objectUrl);
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      const baseW = imgW / imgH > cropAspect ? imgH * cropAspect : imgW;
      const baseH = baseW / cropAspect;

      const zoomFactor = clamp(zoom, 100, 250) / 100;
      const srcW = baseW / zoomFactor;
      const srcH = baseH / zoomFactor;

      const centerX = (focalX / 100) * imgW;
      const centerY = (focalY / 100) * imgH;

      const srcX = clamp(centerX - srcW / 2, 0, imgW - srcW);
      const srcY = clamp(centerY - srcH / 2, 0, imgH - srcH);

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not initialize image canvas");
      }

      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcW,
        srcH,
        0,
        0,
        outputWidth,
        outputHeight,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );

      if (!blob) {
        throw new Error("Image processing failed");
      }

      const filenameBase = file.name.replace(/\.[^.]+$/, "");
      return new File([blob], `${filenameBase}-cropped.jpg`, {
        type: "image/jpeg",
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  useEffect(() => {
    setPreviewUrl(imageUrl || null);
    setImageError(false);
  }, [imageUrl]);

  const handleFileSelect = async (file: File) => {
    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);
    setImageError(false);

    if (enableFocalCrop) {
      setSelectedRawFile(file);
      setFocalX(50);
      setFocalY(50);
      setZoom(100);
      return;
    }

    onFileSelect(file);
  };

  const applyFocalCrop = async () => {
    if (!selectedRawFile) return;
    setIsProcessing(true);
    try {
      const processed = await processFocalCrop(selectedRawFile);
      const processedPreview = URL.createObjectURL(processed);
      setPreviewUrl(processedPreview);
      onFileSelect(processed);
    } catch (error) {
      setImageError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-gray-300 text-sm font-bold mb-3">
        {label}
      </label>
      <DragDropFileUpload
        onFileSelect={handleFileSelect}
        acceptedFormats="image/*"
        maxSize={10 * 1024 * 1024}
        label={label || "Upload image"}
        showPreview={true}
        previewUrl={previewUrl || undefined}
        previewAlt={label}
        error={imageError ? "Failed to load image" : undefined}
      />

      {/* Remove/Clear button, shown if an image is loaded */}
      {previewUrl && (
        <button
          type="button"
          className="mt-2 px-3 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => {
            setPreviewUrl(null);
            setSelectedRawFile(null);
            setImageError(false);
            setFocalX(50);
            setFocalY(50);
            setZoom(100);
            onImageUrlChange("");
          }}
        >
          Remove Image
        </button>
      )}

      {enableFocalCrop && selectedRawFile && (
        <div className="mt-4 p-4 rounded-md border border-slate-600 bg-slate-800/60 space-y-3">
          <p className="text-xs text-gray-300">
            Adjust focal point and zoom, then apply crop for best hero preview
            framing.
          </p>

          <div className="relative w-full aspect-video overflow-hidden rounded border border-slate-600 bg-slate-900">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Crop preview"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  objectPosition: `${focalX}% ${focalY}%`,
                  transform: `scale(${clamp(zoom, 100, 250) / 100})`,
                  transformOrigin: `${focalX}% ${focalY}%`,
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-300">
            <label className="space-y-1">
              <span>Horizontal Focus</span>
              <input
                type="range"
                min={0}
                max={100}
                value={focalX}
                onChange={(e) => setFocalX(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <label className="space-y-1">
              <span>Vertical Focus</span>
              <input
                type="range"
                min={0}
                max={100}
                value={focalY}
                onChange={(e) => setFocalY(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <label className="space-y-1">
              <span>Zoom</span>
              <input
                type="range"
                min={100}
                max={250}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyFocalCrop}
              disabled={isProcessing}
              className="px-3 py-2 text-xs bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-60"
            >
              {isProcessing ? "Processing..." : "Apply Crop"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFocalX(50);
                setFocalY(50);
                setZoom(100);
              }}
              className="px-3 py-2 text-xs bg-slate-700 text-white rounded hover:bg-slate-600"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadInput;
