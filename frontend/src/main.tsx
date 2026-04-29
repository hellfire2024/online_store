import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { setApiClientBaseUrl } from "../services/apiClient";

const normalizeUrl = (value: string) => value.trim().replace(/\/$/, "");
const ALLOW_CROSS_ORIGIN_API =
  String(import.meta.env.VITE_ALLOW_CROSS_ORIGIN_API || "") === "1";

const isDevHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("dev.") ||
    normalized.startsWith("devapi.") ||
    normalized.includes("-dev")
  );
};

const shouldUseSettingsApiBaseUrl = (value: string): boolean => {
  const trimmed = normalizeUrl(value);
  if (!trimmed) return false;

  // Relative API paths are always safe (e.g. /api).
  if (trimmed.startsWith("/")) return true;

  try {
    const parsed = new URL(trimmed);
    const siteOrigin = window.location.origin.toLowerCase();

    // Default to strict same-origin API usage to prevent cross-environment bleed.
    if (!ALLOW_CROSS_ORIGIN_API) {
      return parsed.origin.toLowerCase() === siteOrigin;
    }

    const apiHost = parsed.hostname.toLowerCase();
    const siteHost = window.location.hostname.toLowerCase();
    const siteIsDev = isDevHostname(siteHost);
    const apiIsDev = isDevHostname(apiHost);

    // Keep environments isolated: dev site -> dev API, prod site -> prod API.
    if (siteIsDev !== apiIsDev) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

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
      let apiBaseAppliedFromSettings = false;
      try {
        const response = await fetch("/api/settings", {
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
            if (shouldUseSettingsApiBaseUrl(settings.apiBaseUrl)) {
              setApiClientBaseUrl(normalizeUrl(settings.apiBaseUrl));
              apiBaseAppliedFromSettings = true;
            } else {
              console.warn(
                "Ignoring unsafe apiBaseUrl from settings in this environment:",
                settings.apiBaseUrl,
              );
            }
          }
        }
      } catch (error) {
        console.warn(
          "Skipping /api/settings bootstrap due to non-JSON response or network error",
          error,
        );
      } finally {
        const envBaseUrl = import.meta.env.VITE_API_URL;
        if (
          !apiBaseAppliedFromSettings &&
          typeof envBaseUrl === "string" &&
          envBaseUrl.trim()
        ) {
          if (shouldUseSettingsApiBaseUrl(envBaseUrl)) {
            setApiClientBaseUrl(normalizeUrl(envBaseUrl));
          } else {
            console.warn(
              "Ignoring unsafe VITE_API_URL for this environment:",
              envBaseUrl,
            );
          }
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
