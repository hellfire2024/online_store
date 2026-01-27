
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CartItem } from '../types';

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
);

const CartItemRow: React.FC<{ item: CartItem }> = ({ item }) => {
    const { updateQuantity, removeFromCart } = useCart();
    
    // Calculate total price delta from all selected options
    let optionsDelta = 0;
    const selectedOptionDetails: { listName: string; optionName: string }[] = [];
    
    if (item.selectedOptions && item.product.optionLists) {
      item.product.optionLists.forEach((list) => {
        const selectedOptionId = item.selectedOptions?.[list.id];
        if (selectedOptionId) {
          const option = list.options.find((o) => o.id === selectedOptionId);
          if (option) {
            optionsDelta += option.priceDelta;
            selectedOptionDetails.push({ listName: list.name, optionName: option.name });
          }
        }
      });
    }
    
    const finalPrice = item.product.price + optionsDelta;

    return (
        <div className="flex items-center py-5 border-b border-slate-700">
            <img src={item.product.imageUrl} alt={item.product.name} className="w-24 h-24 object-cover rounded-md" />
            <div className="grow ml-4">
                <h3 className="font-semibold text-white">{item.product.name}</h3>
                <p className="text-sm text-gray-400">${finalPrice.toFixed(2)}</p>
                {selectedOptionDetails.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                        {selectedOptionDetails.map((detail, idx) => (
                            <p key={idx} className="text-xs text-sky-400">
                                {detail.listName}: {detail.optionName}
                            </p>
                        ))}
                    </div>
                )}
                {item.customization && (
                    <div className="text-sm text-sky-400 mt-1">
                        Customization: {item.customization.type === 'gallery' ? 'Gallery Design' : 'Uploaded Design'}
                    </div>
                )}
            </div>
            <div className="flex items-center space-x-4">
                <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value), item.selectedOptions)}
                    className="w-16 p-1 bg-slate-700 border border-slate-600 rounded-md text-center text-white"
                />
                <p className="w-20 text-right font-semibold text-white">${(finalPrice * item.quantity).toFixed(2)}</p>
                <button onClick={() => removeFromCart(item.product.id, item.selectedOptions)} className="text-gray-500 hover:text-red-500 transition-colors">
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
        <h1 className="text-3xl font-bold text-white mb-4">Your Cart is Empty</h1>
        <p className="text-gray-400 mb-6">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/store" className="bg-sky-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-sky-600 transition-colors">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
      <h1 className="text-3xl font-bold text-white mb-6">Your Shopping Cart</h1>
      <div>
        {cartItems.map((item, idx) => (
          <CartItemRow key={`${item.product.id}-${JSON.stringify(item.selectedOptions) || 'none'}-${idx}`} item={item} />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-lg font-semibold text-white">
            <span>Subtotal</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
          <p className="text-gray-400 text-sm mt-2 text-right">Taxes and shipping calculated at checkout.</p>
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
