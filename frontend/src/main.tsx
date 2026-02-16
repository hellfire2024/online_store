
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { setApiClientBaseUrl } from "../../services/apiClient";

function Root() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/settings")
      .then((res) => res.json())
      .then((settings) => {
        if (settings.apiBaseUrl) {
          setApiClientBaseUrl(settings.apiBaseUrl);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading configuration...</div>;
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
