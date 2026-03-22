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
