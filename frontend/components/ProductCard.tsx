import React from "react";
import { Link } from "react-router-dom";
import { Product } from "../types";
import { generateSlug } from "../services/slugService";
import { useSiteSettings } from "../context/SiteSettingsContext";
import {
  getCurrentProductPrice,
  isProductOnSale,
} from "../utils/productPricing";

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { siteSettings } = useSiteSettings();
  const watermarkText =
    `${siteSettings?.logoText || ""}${siteSettings?.logoTextAccent || ""}`.trim() ||
    "Watermark";
  const currentPrice = getCurrentProductPrice(product);
  const onSale = isProductOnSale(product);
  const savings = Math.max(0, Number(product.price) - Number(currentPrice));

  // Prevent image download
  const handleImageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  const handleImageDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:shadow-sky-900/50 hover:-translate-y-1 border border-slate-700 hover:border-sky-500">
      <Link to={`/product/${generateSlug(product.name)}`}>
        <div className="w-full h-64 bg-slate-700 relative overflow-hidden">
          {onSale && (
            <div className="absolute top-3 left-0 z-10 bg-red-600 text-white text-xs font-bold tracking-wide px-3 py-1 rounded-r-md shadow-lg">
              ON SALE
            </div>
          )}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none pointer-events-none"
            onContextMenu={handleImageContextMenu}
            onDragStart={handleImageDragStart}
            draggable={false}
          />
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <div
              className="absolute -inset-8 flex flex-col gap-4"
              style={{ transform: "rotate(-30deg)", opacity: 0.25 }}
            >
              {Array.from({ length: 10 }, (_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex gap-6 whitespace-nowrap"
                  style={{ marginLeft: rowIdx % 2 === 0 ? "0" : "-50px" }}
                >
                  {Array.from({ length: 8 }, (_, colIdx) => (
                    <span
                      key={colIdx}
                      className="text-white font-bold"
                      style={{ textShadow: "0 0 3px black", fontSize: "11px" }}
                    >
                      {watermarkText}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5">
          <h3 className="text-lg font-semibold text-white truncate">
            {product.name}
          </h3>
          <div className="mt-2">
            <p className="text-sky-400 font-bold">
              {product.optionLists?.length
                ? `From $${Number(currentPrice).toFixed(2)}`
                : `$${Number(currentPrice).toFixed(2)}`}
            </p>
            {onSale && (
              <div className="space-y-0.5">
                <p className="text-xs text-gray-400 line-through">
                  ${Number(product.price).toFixed(2)}
                </p>
                <p className="text-xs text-red-300 font-medium">
                  Save ${savings.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
