import React, { useEffect } from "react";

interface KeyboardShortcutHandlerProps {
  onAdminKeyPress?: () => void;
}

const KeyboardShortcutHandler: React.FC<KeyboardShortcutHandlerProps> = ({
  onAdminKeyPress,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Alt+A for admin login
      if (event.ctrlKey && event.altKey && event.key === "A") {
        event.preventDefault();
        if (onAdminKeyPress) {
          onAdminKeyPress();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onAdminKeyPress]);

  return null;
};

export default KeyboardShortcutHandler;
