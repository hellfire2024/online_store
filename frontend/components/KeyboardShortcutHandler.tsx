import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const KeyboardShortcutHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+A for admin login
      if (event.ctrlKey && event.shiftKey && event.key === "A") {
        event.preventDefault();
        navigate("/admin");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return null; // This component doesn't render anything visible
};

export default KeyboardShortcutHandler;
