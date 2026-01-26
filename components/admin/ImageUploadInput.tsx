import React, { useState, ChangeEvent } from "react";

interface ImageUploadInputProps {
  label: string;
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  onFileSelect: (file: File) => void;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  label,
  imageUrl,
  onImageUrlChange,
  onFileSelect,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  React.useEffect(() => {
    setPreviewUrl(imageUrl || null);
    setImageError(false);
  }, [imageUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onFileSelect(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImageError(false);
    }
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    onImageUrlChange(url);
    setPreviewUrl(url);
    setImageError(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-gray-300 text-sm font-bold mb-1">
        {label}
      </label>
      {previewUrl && (
        <div className="mb-2 p-2 bg-slate-700 rounded-md">
          {!imageError ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-32 h-32 object-contain rounded-md"
              style={{ backgroundColor: 'white' }}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-32 h-32 flex items-center justify-center bg-slate-600 rounded-md text-gray-400 text-xs text-center p-2">
              Image unavailable<br/><span className="text-red-400 break-all">{previewUrl}</span>
            </div>
          )}
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="w-full text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-500 file:text-white hover:file:bg-sky-600"
      />
    </div>
  );
};

export default ImageUploadInput;
