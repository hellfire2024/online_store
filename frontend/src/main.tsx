import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ProductProvider } from "../context/ProductContext";
import { ReviewsProvider } from "../context/ReviewsContext";
import { PagesProvider } from "../context/PagesContext";
import { SiteSettingsProvider } from "../context/SiteSettingsContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ProductProvider>
      <ReviewsProvider>
        <SiteSettingsProvider>
          <PagesProvider>
            <App />
          </PagesProvider>
        </SiteSettingsProvider>
      </ReviewsProvider>
    </ProductProvider>
  </React.StrictMode>,
);
