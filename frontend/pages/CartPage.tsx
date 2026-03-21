import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { CartItem } from "../types";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { getCurrentProductPrice } from "../utils/productPricing";

const TrashIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const CartItemRow: React.FC<{ item: CartItem }> = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart();
  const { siteSettings } = useSiteSettings();
  const watermarkText =
    `${siteSettings?.logoText || ""}${siteSettings?.logoTextAccent || ""}`.trim() ||
    "Store";
  const handleImageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  const handleImageDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toNumber = (value: unknown, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  // Calculate total price delta from all selected options (now supporting multiple selections per list)
  let optionsDelta = 0;
  const selectedOptionDetails: {
    listName: string;
    optionName: string;
    priceDelta: number;
  }[] = [];

  if (item.selectedOptions && item.product.optionLists) {
    item.product.optionLists.forEach((list) => {
      const selectedOptionIds = item.selectedOptions?.[list.id] || [];
      if (Array.isArray(selectedOptionIds)) {
        selectedOptionIds.forEach((optionId) => {
          const option = list.options.find((o) => o.id === optionId);
          if (option) {
            const priceDelta = toNumber(option.priceDelta);
            optionsDelta += priceDelta;
            selectedOptionDetails.push({
              listName: list.name,
              optionName: option.name,
              priceDelta,
            });
          }
        });
      } else {
        // Fallback for old single-select format (for backwards compatibility)
        const option = list.options.find((o) => o.id === selectedOptionIds);
        if (option) {
          const priceDelta = toNumber(option.priceDelta);
          optionsDelta += priceDelta;
          selectedOptionDetails.push({
            listName: list.name,
            optionName: option.name,
            priceDelta,
          });
        }
      }
    });
  }

  // Add custom text cost
  let customTextCost = 0;
  if (item.customText && item.product.customTextPricePerChar) {
    customTextCost =
      item.customText.length * toNumber(item.product.customTextPricePerChar);
  }

  const customImageCost =
    item.customization?.type === "upload" &&
    item.product.allowCustomImageUpload &&
    item.product.customImageUploadPrice
      ? toNumber(item.product.customImageUploadPrice)
      : 0;

  const basePrice = toNumber(getCurrentProductPrice(item.product));
  const finalPrice =
    basePrice + optionsDelta + customTextCost + customImageCost;

  return (
    <div className="flex flex-col sm:flex-row items-start py-5 border-b border-slate-700 gap-4">
      <div className="shrink-0 w-full sm:w-auto flex sm:block justify-center">
        <div className="relative w-32 h-32 sm:w-24 sm:h-24 rounded-md overflow-hidden">
          <img
            src={item.product.imageUrl}
            alt={item.product.name}
            className="w-full h-full object-cover select-none pointer-events-none"
            onContextMenu={handleImageContextMenu}
            onDragStart={handleImageDragStart}
            draggable={false}
          />
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <div
              className="absolute -inset-4 flex flex-col gap-3"
              style={{ transform: "rotate(-30deg)", opacity: 0.35 }}
            >
              {Array.from({ length: 6 }, (_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex gap-4 whitespace-nowrap"
                  style={{ marginLeft: rowIdx % 2 === 0 ? "0" : "-30px" }}
                >
                  {Array.from({ length: 5 }, (_, colIdx) => (
                    <span
                      key={colIdx}
                      className="text-white font-bold"
                      style={{ textShadow: "0 0 2px black", fontSize: "8px" }}
                    >
                      {watermarkText}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="grow w-full sm:w-auto">
        <h3 className="font-semibold text-white text-base sm:text-lg">
          {item.product.name}
        </h3>
        <p className="text-sm text-gray-300">
          Base price (each): ${basePrice.toFixed(2)}
        </p>
        {selectedOptionDetails.length > 0 && (
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-gray-300">Options (each):</p>
            <div className="pl-4 space-y-0.5">
              {selectedOptionDetails.map((detail, idx) => (
                <p key={idx} className="text-xs text-sky-400">
                  {detail.listName}: {detail.optionName} • +$
                  {detail.priceDelta.toFixed(2)}
                </p>
              ))}
              <p className="text-xs text-gray-300">
                Options total (each): +${optionsDelta.toFixed(2)}
              </p>
            </div>
          </div>
        )}
        {customTextCost > 0 && (
          <p className="text-xs text-gray-300 mt-1">
            Custom text: {item.customText?.length} characters • +$
            {customTextCost.toFixed(2)}
          </p>
        )}
        {customImageCost > 0 && (
          <p className="text-xs text-gray-300 mt-1">
            Custom image upload • +${customImageCost.toFixed(2)}
          </p>
        )}
        <p className="text-sm text-gray-400 mt-2 font-semibold">
          Item total (each): ${finalPrice.toFixed(2)}
        </p>
        {item.customization && (
          <div className="mt-2 bg-slate-700 p-2 rounded-lg">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative shrink-0">
                <img
                  src={item.customization.value}
                  alt="Customization"
                  className="w-16 h-16 object-cover rounded border-2 border-slate-600"
                  onContextMenu={handleImageContextMenu}
                  onDragStart={handleImageDragStart}
                  draggable={false}
                />
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded">
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: "rotate(-30deg)", opacity: 0.55 }}
                  >
                    <span
                      className="text-white font-bold whitespace-nowrap"
                      style={{ textShadow: "0 0 3px black", fontSize: "9px" }}
                    >
                      {watermarkText}
                    </span>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-sky-400 wrap-break-word">
                  {item.customization.type === "gallery"
                    ? "Gallery Design"
                    : "Uploaded Design"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 wrap-break-word">
                  Custom engraving image
                </p>
              </div>
            </div>
          </div>
        )}
        {item.customText && (
          <div className="mt-2 bg-slate-700 p-2 rounded-lg">
            <p className="text-xs font-semibold text-purple-400 mb-1">
              Custom Engraving Text:
            </p>
            <p className="text-sm text-white italic wrap-break-word">
              "{item.customText}"
            </p>
            {item.product.customTextPricePerChar && (
              <p className="text-xs text-gray-400 mt-1">
                {item.customText.length} characters • +$
                {(
                  item.customText.length * item.product.customTextPricePerChar
                ).toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-4 w-full sm:w-auto shrink-0">
        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 sm:hidden">Qty:</span>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) =>
                updateQuantity(
                  item.product.id,
                  parseInt(e.target.value),
                  item.selectedOptions,
                  item.customization,
                  item.customText,
                )
              }
              className="w-16 p-1 bg-slate-700 border border-slate-600 rounded-md text-center text-white"
            />
          </div>
          <p className="font-semibold text-white text-base sm:text-lg whitespace-nowrap">
            ${(finalPrice * item.quantity).toFixed(2)}
          </p>
        </div>
        <button
          onClick={() =>
            removeFromCart(
              item.product.id,
              item.selectedOptions,
              item.customization,
              item.customText,
            )
          }
          className="text-gray-500 hover:text-red-500 transition-colors p-2"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

const CartPage: React.FC = () => {
  const { cartItems, itemCount, totalPrice } = useCart();

  if (itemCount === 0) {
    return (
      <div className="text-center bg-slate-800 p-12 rounded-lg shadow-2xl border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-4">
          Your Cart is Empty
        </h1>
        <p className="text-gray-400 mb-6">
          Looks like you haven't added anything to your cart yet.
        </p>
        <Link
          to="/store"
          className="bg-sky-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-sky-600 transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  // Estimate shipping and tax (these will be calculated precisely at checkout)
  const estimatedShipping = 5.0; // Flat rate estimate
  const estimatedTaxRate = 0.08; // 8% estimate
  const estimatedTax = totalPrice * estimatedTaxRate;
  const estimatedTotal = totalPrice + estimatedShipping + estimatedTax;

  return (
    <div className="bg-slate-800 p-4 sm:p-6 md:p-8 rounded-lg shadow-2xl border border-slate-700">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
        Your Shopping Cart
      </h1>
      <div>
        {cartItems.map((item, idx) => (
          <CartItemRow
            key={`${item.product.id}-${JSON.stringify(item.selectedOptions) || "none"}-${idx}`}
            item={item}
          />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <div className="w-full sm:max-w-sm space-y-2">
          <div className="flex justify-between text-white text-sm sm:text-base">
            <span>Subtotal</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-400 text-xs sm:text-sm">
            <span>Estimated Shipping</span>
            <span>${estimatedShipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-400 text-xs sm:text-sm">
            <span>Estimated Tax ({(estimatedTaxRate * 100).toFixed(0)}%)</span>
            <span>${estimatedTax.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-700 pt-2 mt-2"></div>
          <div className="flex justify-between text-base sm:text-lg font-semibold text-white">
            <span>Estimated Total</span>
            <span>${estimatedTotal.toFixed(2)}</span>
          </div>
          <p className="text-gray-400 text-xs mt-2 text-right">
            Final taxes and shipping calculated at checkout based on your
            location.
          </p>
          <Link to="/checkout">
            <button className="w-full mt-4 bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors text-sm sm:text-base">
              Proceed to Checkout
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
