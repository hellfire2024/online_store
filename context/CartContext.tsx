
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { CartItem } from '../types';
import { useToast } from '../hooks/useToast';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, selectedOptionId?: string) => void;
  updateQuantity: (productId: string, quantity: number, selectedOptionId?: string) => void;
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
      const existingItem = prevItems.find(item => item.product.id === newItem.product.id && item.selectedOptionId === newItem.selectedOptionId);
      if (existingItem) {
        addToast(`${newItem.product.name} updated in cart.`, 'success');
        return prevItems.map(item =>
          item.product.id === newItem.product.id && item.selectedOptionId === newItem.selectedOptionId
            ? newItem
            : item
        );
      } else {
        addToast(`${newItem.product.name} added to cart.`, 'success');
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (productId: string, selectedOptionId?: string) => {
    setCartItems(prevItems =>
      prevItems.filter(item =>
        !(item.product.id === productId && item.selectedOptionId === selectedOptionId)
      )
    );
    addToast('Item removed from cart.', 'info');
  };

  const updateQuantity = (productId: string, quantity: number, selectedOptionId?: string) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId && item.selectedOptionId === selectedOptionId
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
    const optionDelta = item.selectedOptionId
      ? item.product.options?.find((o) => o.id === item.selectedOptionId)?.priceDelta || 0
      : 0;
    return total + (item.product.price + optionDelta) * item.quantity;
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
