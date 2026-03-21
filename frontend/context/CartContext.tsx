import React, { createContext, useState, useContext, ReactNode } from "react";
import { CartItem } from "../types";
import { useToast } from "../hooks/useToast";
import {
  getCurrentProductPrice,
  isProductOnSale,
} from "../utils/productPricing";

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (
    productId: string,
    selectedOptions?: { [listId: string]: string[] },
    customization?: CartItem["customization"],
    customText?: string,
  ) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    selectedOptions?: { [listId: string]: string[] },
    customization?: CartItem["customization"],
    customText?: string,
  ) => void;
  clearCart: () => void;
  itemCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { addToast } = useToast();

  const normalizeCustomText = (text?: string) => (text || "").trim();

  const isSameCartLine = (
    item: CartItem,
    productId: string,
    selectedOptions?: { [listId: string]: string[] },
    customization?: CartItem["customization"],
    customText?: string,
  ) =>
    item.product.id === productId &&
    JSON.stringify(item.selectedOptions || {}) ===
      JSON.stringify(selectedOptions || {}) &&
    JSON.stringify(item.customization || null) ===
      JSON.stringify(customization || null) &&
    normalizeCustomText(item.customText) === normalizeCustomText(customText);

  const addToCart = (newItem: CartItem) => {
    setCartItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((item) =>
        isSameCartLine(
          item,
          newItem.product.id,
          newItem.selectedOptions,
          newItem.customization,
          newItem.customText,
        ),
      );

      if (existingItemIndex !== -1) {
        addToast(
          isProductOnSale(newItem.product)
            ? `${newItem.product.name} quantity increased in cart. Sale price applied. Final sale.`
            : `${newItem.product.name} quantity increased in cart.`,
          "success",
        );
        return prevItems.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item,
        );
      } else {
        addToast(
          isProductOnSale(newItem.product)
            ? `${newItem.product.name} added to cart on sale. Sale prices are final.`
            : `${newItem.product.name} added to cart.`,
          "success",
        );
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (
    productId: string,
    selectedOptions?: { [listId: string]: string[] },
    customization?: CartItem["customization"],
    customText?: string,
  ) => {
    setCartItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !isSameCartLine(
            item,
            productId,
            selectedOptions,
            customization,
            customText,
          ),
      ),
    );
    addToast("Item removed from cart.", "info");
  };

  const updateQuantity = (
    productId: string,
    quantity: number,
    selectedOptions?: { [listId: string]: string[] },
    customization?: CartItem["customization"],
    customText?: string,
  ) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        isSameCartLine(
          item,
          productId,
          selectedOptions,
          customization,
          customText,
        )
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      ),
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const totalPrice = cartItems.reduce((total, item) => {
    let optionsDelta = 0;
    if (item.selectedOptions && item.product.optionLists) {
      item.product.optionLists.forEach((list) => {
        const selectedOptionIds = item.selectedOptions?.[list.id] || [];
        selectedOptionIds.forEach((optionId) => {
          const option = list.options.find((o) => o.id === optionId);
          if (option) {
            optionsDelta += Number(option.priceDelta);
          }
        });
      });
    }
    let customTextCost = 0;
    if (item.customText && item.product.customTextPricePerChar) {
      customTextCost =
        item.customText.length * Number(item.product.customTextPricePerChar);
    }
    const customImageCost =
      item.customization?.type === "upload" &&
      item.product.allowCustomImageUpload &&
      item.product.customImageUploadPrice
        ? Number(item.product.customImageUploadPrice)
        : 0;
    return (
      total +
      (getCurrentProductPrice(item.product) +
        optionsDelta +
        customTextCost +
        customImageCost) *
        item.quantity
    );
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
// ...existing code...
