import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { CartItem } from "../types";

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

  const basePrice = toNumber(item.product.price);
  const finalPrice = basePrice + optionsDelta + customTextCost + customImageCost;

  return (
    <div className="flex items-start py-5 border-b border-slate-700 gap-4">
      <div className="shrink-0">
        <img
          src={item.product.imageUrl}
          alt={item.product.name}
          className="w-24 h-24 object-cover rounded-md"
        />
      </div>
      <div className="grow">
        <h3 className="font-semibold text-white">{item.product.name}</h3>
        <p className="text-sm text-gray-300">
          Base price (each): ${basePrice.toFixed(2)}
        </p>
        {selectedOptionDetails.length > 0 && (
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-gray-300">Options (each):</p>
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
        )}
        <p className="text-sm text-gray-400 mt-1">
          Item total (each): ${finalPrice.toFixed(2)}
        </p>
        {customImageCost > 0 && (
          <div className="mt-2 bg-slate-700 p-2 rounded-lg">
            <p className="text-xs font-semibold text-sky-400 mb-1">
              Custom Image Upload Fee:
            </p>
            <p className="text-xs text-gray-300">
              +${customImageCost.toFixed(2)}
            </p>
          </div>
        )}
        {item.customization && (
          <div className="mt-2 bg-slate-700 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <img
                src={item.customization.value}
                alt="Customization"
                className="w-16 h-16 object-cover rounded border-2 border-slate-600"
              />
              <div>
                <p className="text-xs font-semibold text-sky-400">
                  {item.customization.type === "gallery"
                    ? "Gallery Design"
                    : "Uploaded Design"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
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
            <p className="text-sm text-white italic">"{item.customText}"</p>
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
      <div className="flex items-center space-x-4 shrink-0">
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) =>
            updateQuantity(
              item.product.id,
              parseInt(e.target.value),
              item.selectedOptions,
            )
          }
          className="w-16 p-1 bg-slate-700 border border-slate-600 rounded-md text-center text-white"
        />
        <p className="w-20 text-right font-semibold text-white">
          ${(finalPrice * item.quantity).toFixed(2)}
        </p>
        <button
          onClick={() => removeFromCart(item.product.id, item.selectedOptions)}
          className="text-gray-500 hover:text-red-500 transition-colors"
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
    <div className="bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
      <h1 className="text-3xl font-bold text-white mb-6">Your Shopping Cart</h1>
      <div>
        {cartItems.map((item, idx) => (
          <CartItemRow
            key={`${item.product.id}-${JSON.stringify(item.selectedOptions) || "none"}-${idx}`}
            item={item}
          />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm space-y-2">
          <div className="flex justify-between text-white">
            <span>Subtotal</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-400 text-sm">
            <span>Estimated Shipping</span>
            <span>${estimatedShipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-400 text-sm">
            <span>Estimated Tax ({(estimatedTaxRate * 100).toFixed(0)}%)</span>
            <span>${estimatedTax.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-700 pt-2 mt-2"></div>
          <div className="flex justify-between text-lg font-semibold text-white">
            <span>Estimated Total</span>
            <span>${estimatedTotal.toFixed(2)}</span>
          </div>
          <p className="text-gray-400 text-xs mt-2 text-right">
            Final taxes and shipping calculated at checkout based on your
            location.
          </p>
          <Link to="/checkout">
            <button className="w-full mt-4 bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors">
              Proceed to Checkout
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
