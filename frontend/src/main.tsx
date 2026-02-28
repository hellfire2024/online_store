import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { setApiClientBaseUrl } from "../services/apiClient";

// Suppress browser extension errors from polluting console
window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason?.message?.includes(
      "message channel closed before a response was received",
    )
  ) {
    event.preventDefault();
    // Silently ignore browser extension async listener errors
  }
});

function Root() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/settings", {
          headers: {
            Accept: "application/json",
          },
        });

        const contentType = (
          response.headers.get("content-type") || ""
        ).toLowerCase();
        if (response.ok && contentType.includes("application/json")) {
          const settings = await response.json();
          if (settings?.apiBaseUrl && typeof settings.apiBaseUrl === "string") {
            setApiClientBaseUrl(settings.apiBaseUrl);
          }
        }
      } catch (error) {
        console.warn(
          "Skipping /settings bootstrap due to non-JSON response or network error",
          error,
        );
      } finally {
        const envBaseUrl = import.meta.env.VITE_API_URL;
        if (typeof envBaseUrl === "string" && envBaseUrl.trim()) {
          setApiClientBaseUrl(envBaseUrl.trim());
        }
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  if (loading) return <div>Loading configuration...</div>;
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
