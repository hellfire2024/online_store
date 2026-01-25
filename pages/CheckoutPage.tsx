
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/useToast';

const CheckoutPage: React.FC = () => {
  const { totalPrice, clearCart, itemCount } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (itemCount === 0) {
    navigate('/cart');
    return null;
  }

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Order placed successfully! (This is a demo)', 'success');
    clearCart();
    navigate('/');
  };

  const inputClasses = "w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-white text-center mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        {/* Shipping & Payment Form */}
        <div className="lg:col-span-3 bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
          <form onSubmit={handlePlaceOrder}>
            <h2 className="text-2xl font-semibold text-white mb-6">Shipping Information</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Full Name" className={inputClasses} required />
              <input type="email" placeholder="Email Address" className={inputClasses} required />
              <input type="text" placeholder="Address" className={inputClasses} required />
              <div className="flex space-x-4">
                <input type="text" placeholder="City" className={inputClasses} required />
                <input type="text" placeholder="ZIP Code" className={inputClasses} required />
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-white mt-8 mb-6">Payment Details</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Card Number" className={inputClasses} required />
              <div className="flex space-x-4">
                <input type="text" placeholder="MM / YY" className={inputClasses} required />
                <input type="text" placeholder="CVC" className={inputClasses} required />
              </div>
            </div>
            <div className="mt-8">
              <button type="submit" className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500">
                Place Order
              </button>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2 bg-slate-800 p-8 rounded-lg shadow-2xl h-fit border border-slate-700">
          <h2 className="text-2xl font-semibold text-white mb-6">Order Summary</h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>$5.00</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Taxes (8%)</span>
              <span>${(totalPrice * 0.08).toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-700 my-3"></div>
            <div className="flex justify-between text-xl font-bold text-white">
              <span>Total</span>
              <span>${(totalPrice + 5 + totalPrice * 0.08).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
