import React, { useState, ChangeEvent } from 'react';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onFileSelect(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    onImageUrlChange(url);
    setPreviewUrl(url);
  };

  return (
    <div className="space-y-2">
      <label className="block text-gray-300 text-sm font-bold mb-1">
        {label}
      </label>
      {previewUrl && (
        <div className="mb-2">
          <img src={previewUrl} alt="Preview" className="w-32 h-32 object-cover rounded-md" />
        </div>
      )}
      <input
        type="text"
        placeholder="Image URL"
        value={imageUrl}
        onChange={handleUrlChange}
        className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white mb-2"
      />
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
