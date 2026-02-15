import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ProductProvider } from "../context/ProductContext";
import { ReviewsProvider } from "../context/ReviewsContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ProductProvider>
      <ReviewsProvider>
        <App />
      </ReviewsProvider>
    </ProductProvider>
  </React.StrictMode>,
);
