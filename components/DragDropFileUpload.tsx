import React, { useState, useRef } from "react";

interface DragDropFileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string; // e.g., "image/*" or ".pdf,.doc"
  maxSize?: number; // in bytes
  label?: string;
  showPreview?: boolean;
  previewUrl?: string;
  previewAlt?: string;
  disabled?: boolean;
  error?: string;
}

const DragDropFileUpload: React.FC<DragDropFileUploadProps> = ({
  onFileSelect,
  acceptedFormats = "image/*",
  maxSize = 10 * 1024 * 1024, // 10MB default
  label = "Upload file",
  showPreview = false,
  previewUrl,
  previewAlt = "Preview",
  disabled = false,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");

  const validateFile = (file: File): boolean => {
    setFileError("");

    // Check file size
    if (file.size > maxSize) {
      setFileError(
        `File is too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB`
      );
      return false;
    }

    // Check file type if needed (basic check)
    if (acceptedFormats !== "*") {
      const acceptedArray = acceptedFormats.split(",").map((f) => f.trim());
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const fileType = file.type;

      const isAccepted = acceptedArray.some(
        (format) =>
          fileType.match(format.replace("*", ".*")) ||
          fileExtension === format
      );

      if (!isAccepted) {
        setFileError(
          `File type not accepted. Please use: ${acceptedFormats}`
        );
        return false;
      }
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          w-full p-8 rounded-lg border-2 border-dashed transition-all cursor-pointer
          ${
            disabled
              ? "bg-slate-800 border-slate-600 cursor-not-allowed opacity-50"
              : isDragging
                ? "bg-sky-900/20 border-sky-400 bg-opacity-40"
                : "bg-slate-700/50 border-slate-500 hover:border-sky-400 hover:bg-slate-700"
          }
          ${error || fileError ? "border-red-500 bg-red-900/10" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="text-center">
          {/* Icon */}
          <svg
            className={`w-12 h-12 mx-auto mb-4 transition-colors ${
              isDragging
                ? "text-sky-400"
                : error || fileError
                  ? "text-red-400"
                  : "text-sky-300"
            }`}
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3V7h2v4z" />
          </svg>

          {/* Main text */}
          <div className="font-semibold text-white mb-1">
            {isDragging ? "Drop your file here" : label}
          </div>

          {/* File name if selected */}
          {fileName && (
            <div className="text-sm text-green-400 font-medium mb-2">
              ✓ {fileName}
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-gray-400">
            Drag and drop or click to browse
          </div>

          {/* File size info */}
          <div className="text-xs text-gray-500 mt-2">
            Maximum size: {formatBytes(maxSize)}
          </div>
        </div>
      </div>

      {/* Error message */}
      {(fileError || error) && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-300 text-sm">
          {fileError || error}
        </div>
      )}

      {/* Preview */}
      {showPreview && previewUrl && (
        <div className="mt-4 p-3 bg-slate-700 rounded-lg">
          <div className="text-xs text-gray-400 mb-2">Preview:</div>
          <img
            src={previewUrl}
            alt={previewAlt}
            className="max-w-full max-h-48 rounded border border-slate-600"
            style={{ maxWidth: "100%" }}
          />
        </div>
      )}
    </div>
  );
};

export default DragDropFileUpload;
