import React from "react";

type ToastType = "success" | "error" | "info";
interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}
const typeClasses = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  return (
    <div
      className={`flex items-center justify-between w-full max-w-xs p-4 text-white rounded-lg shadow-lg ${typeClasses[type]} animate-fade-in-right`}
    >
      <div className="text-sm font-normal">{message}</div>
      <button
        onClick={onClose}
        className="ml-4 -mx-1.5 -my-1.5 bg-white/20 text-white hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
      >
        <span className="sr-only">Close</span>
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          ></path>
        </svg>
      </button>
    </div>
  );
};

export default Toast;
// ...existing code...
