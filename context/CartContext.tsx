
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { CartItem } from '../types';
import { useToast } from '../hooks/useToast';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, selectedOptions?: { [listId: string]: string }) => void;
  updateQuantity: (productId: string, quantity: number, selectedOptions?: { [listId: string]: string }) => void;
  clearCart: () => void;
  itemCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { addToast } = useToast();

  const addToCart = (newItem: CartItem) => {
    setCartItems(prevItems => {
      // Check if exact same item exists (same product, options, AND customization)
      const existingItemIndex = prevItems.findIndex(item => 
        item.product.id === newItem.product.id && 
        JSON.stringify(item.selectedOptions) === JSON.stringify(newItem.selectedOptions) &&
        JSON.stringify(item.customization) === JSON.stringify(newItem.customization)
      );
      
      if (existingItemIndex !== -1) {
        // Item exists - increment quantity
        addToast(`${newItem.product.name} quantity increased in cart.`, 'success');
        return prevItems.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      } else {
        // New item - add to cart
        addToast(`${newItem.product.name} added to cart.`, 'success');
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (productId: string, selectedOptions?: { [listId: string]: string }) => {
    setCartItems(prevItems =>
      prevItems.filter(item =>
        !(item.product.id === productId && 
          JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions))
      )
    );
    addToast('Item removed from cart.', 'info');
  };

  const updateQuantity = (productId: string, quantity: number, selectedOptions?: { [listId: string]: string }) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId && 
        JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions)
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };
  
  const clearCart = () => {
    setCartItems([]);
  }

  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const totalPrice = cartItems.reduce((total, item) => {
    let optionsDelta = 0;
    if (item.selectedOptions && item.product.optionLists) {
      item.product.optionLists.forEach((list) => {
        const selectedOptionId = item.selectedOptions?.[list.id];
        if (selectedOptionId) {
          const option = list.options.find((o) => o.id === selectedOptionId);
          if (option) {
            optionsDelta += Number(option.priceDelta);
          }
        }
      });
    }
    // Add custom text cost
    let customTextCost = 0;
    if (item.customText && item.product.customTextPricePerChar) {
      customTextCost = item.customText.length * Number(item.product.customTextPricePerChar);
    }
    return total + (Number(item.product.price) + optionsDelta + customTextCost) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, itemCount, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
