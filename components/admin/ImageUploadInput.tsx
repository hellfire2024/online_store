import React, { useState, useEffect } from "react";
import DragDropFileUpload from "../DragDropFileUpload";

interface ImageUploadInputProps {
  label: string;
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  onFileSelect: (file: File) => void;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  label,
  imageUrl,
  onFileSelect,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setPreviewUrl(imageUrl || null);
    setImageError(false);
  }, [imageUrl]);

  const handleFileSelect = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setPreviewUrl(previewUrl);
    setImageError(false);
    onFileSelect(file);
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
    </div>
  );
};

export default ImageUploadInput;

export default ImageUploadInput;
