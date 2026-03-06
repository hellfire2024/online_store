import React, { useState, useRef } from "react";

interface DragDropFileUploadProps {
	onFileSelect: (file: File) => void;
	acceptedFormats?: string;
	maxSize?: number;
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
	maxSize = 10 * 1024 * 1024,
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
	const [imageLoadError, setImageLoadError] = useState(false);

	// Reset image load error when preview URL changes
	React.useEffect(() => {
		setImageLoadError(false);
	}, [previewUrl]);

	const validateFile = (file: File): boolean => {
		setFileError("");
		if (file.size > maxSize) {
			setFileError(
				`File is too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB`
			);
			return false;
		}
		return true;
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && validateFile(file)) {
			setFileName(file.name);
			onFileSelect(file);
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file && validateFile(file)) {
			setFileName(file.name);
			onFileSelect(file);
		}
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	return (
		<div
			className={`border-2 border-dashed rounded p-4 text-center ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-400"}`}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			style={{ cursor: disabled ? "not-allowed" : "pointer" }}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept={acceptedFormats}
				disabled={disabled}
				style={{ display: "none" }}
				onChange={handleFileChange}
			/>
			<button
				type="button"
				className="bg-blue-600 text-white px-4 py-2 rounded mb-2"
				disabled={disabled}
				onClick={() => fileInputRef.current?.click()}
			>
				{label}
			</button>
			{fileName && <div className="text-sm text-gray-600">Selected: {fileName}</div>}
			{(fileError || error) && <div className="text-red-500 text-xs mt-2">{fileError || error}</div>}
			{showPreview && previewUrl && !imageLoadError && (
				<div className="mt-4">
					<img
						src={previewUrl}
						alt={previewAlt}
						className="max-w-full max-h-48 rounded border border-slate-600"
						style={{ maxWidth: "100%" }}
						onError={() => setImageLoadError(true)}
					/>
				</div>
			)}
			{showPreview && previewUrl && imageLoadError && (
				<div className="mt-4 text-gray-500 text-sm italic">
					No image available (upload one to see preview)
				</div>
			)}
		</div>
	);
};

export default DragDropFileUpload;
