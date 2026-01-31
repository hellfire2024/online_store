import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

interface OrderDetails {
  orderNumber: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    productImage: string;
    customization?: {
      type: 'gallery' | 'upload';
      value: string; // Full-size image URL or data URL
      fileName?: string;
    };
    selectedOptions?: string; // Formatted options string
    customText?: string; // Custom engraving text
    customTextCharCount?: number;
    customTextCost?: number;
  }>;
  shippingAddress: {
    name: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

const OrderConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use an effect to load order details from location state or sessionStorage
  const [orderDetails, setOrderDetails] = React.useState<OrderDetails | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Load order details on mount
  React.useEffect(() => {
    console.log('OrderConfirmationPage mounted - attempting to load order details');
    console.log('location.state:', location.state);
    console.log('sessionStorage:', sessionStorage.getItem('orderDetails'));
    console.log('localStorage:', localStorage.getItem('orderDetails'));
    
    // First check location.state
    const stateData = (location.state as OrderDetails) || null;
    if (stateData && stateData.orderNumber) {
      console.log('Found order in location.state:', stateData.orderNumber);
      setOrderDetails(stateData);
      setIsLoaded(true);
      return;
    }
    
    // Fall back to localStorage first (more reliable than sessionStorage)
    try {
      const stored = localStorage.getItem('orderDetails');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('Found order in localStorage:', parsed.orderNumber);
        setOrderDetails(parsed);
        setIsLoaded(true);
        return;
      }
    } catch (e) {
      console.error('Error parsing localStorage order details:', e);
    }
    
    // Fall back to sessionStorage as last resort
    try {
      const stored = sessionStorage.getItem('orderDetails');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('Found order in sessionStorage:', parsed.orderNumber);
        setOrderDetails(parsed);
        setIsLoaded(true);
        return;
      }
    } catch (e) {
      console.error('Error parsing sessionStorage order details:', e);
    }
    
    console.warn('No order details found anywhere');
    setIsLoaded(true);
  }, [location.state]);

  // Redirect if no order details after loading
  React.useEffect(() => {
    if (isLoaded && orderDetails === null) {
      const timer = setTimeout(() => {
        console.warn('No order details loaded, redirecting to home');
        navigate('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, orderDetails, navigate]);

  // Clear storage after we've loaded the data
  React.useEffect(() => {
    if (orderDetails && orderDetails.orderNumber) {
      console.log('Order loaded successfully, clearing storage');
      sessionStorage.removeItem('orderDetails');
      localStorage.removeItem('orderDetails');
      localStorage.removeItem('shouldShowOrderConfirmation');
    }
  }, [orderDetails]);

  if (!orderDetails) {
    return (
      <div className="text-center py-12">
        <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 max-w-md mx-auto">
          <p className="text-gray-400 mb-4">Loading order details...</p>
          <Link to="/cart">
            <button className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600">
              Return to Cart
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const handleDownloadCustomizationImage = (item: OrderDetails['items'][0], index: number) => {
    if (!item.customization) return;

    const link = document.createElement('a');
    link.href = item.customization.value;
    link.download = item.customization.fileName || `${orderDetails.orderNumber}-item-${index + 1}-customization.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllImages = () => {
    orderDetails.items.forEach((item, index) => {
      if (item.customization) {
        setTimeout(() => handleDownloadCustomizationImage(item, index), index * 500);
      }
    });
  };

  const handleDownloadReceipt = () => {
    // Generate receipt content
    const receiptContent = `
═══════════════════════════════════════════
           CUSTOM THREADS
        ORDER CONFIRMATION
═══════════════════════════════════════════

Order Number: ${orderDetails.orderNumber}
Date: ${new Date().toLocaleDateString()}

═══════════════════════════════════════════
SHIPPING INFORMATION
═══════════════════════════════════════════
${orderDetails.shippingAddress.name}
${orderDetails.shippingAddress.email}
${orderDetails.shippingAddress.address}
${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.state} ${orderDetails.shippingAddress.zip}

═══════════════════════════════════════════
ORDER ITEMS
═══════════════════════════════════════════
${orderDetails.items.map((item, idx) => 
  `${item.name}\n  Qty: ${item.quantity} × $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}${
    item.selectedOptions ? `\n  Options: ${item.selectedOptions}` : ''
  }${
    item.customText ? `\n  Custom Text: "${item.customText}"\n  (${item.customTextCharCount} characters • +$${item.customTextCost?.toFixed(2)})` : ''
  }${
    item.customization ? `\n  Customization: ${item.customization.type === 'gallery' ? 'Gallery Design' : 'Uploaded Design'}${item.customization.fileName ? ` (${item.customization.fileName})` : ''}\n  Image: See attachment ${idx + 1}` : ''
  }`
).join('\n\n')}

═══════════════════════════════════════════
ORDER SUMMARY
═══════════════════════════════════════════
Subtotal:        $${orderDetails.subtotal.toFixed(2)}
Shipping:        $${orderDetails.shipping.toFixed(2)}
Tax:             $${orderDetails.tax.toFixed(2)}
───────────────────────────────────────────
TOTAL:           $${orderDetails.total.toFixed(2)}

═══════════════════════════════════════════

Thank you for your order!

This is a demo receipt. In a production system,
this would be an official order receipt.

Questions? Contact us at support@customthreads.com
═══════════════════════════════════════════
    `.trim();

    // Create blob and download
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${orderDetails.orderNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Order Confirmed!</h1>
        <p className="text-gray-400 text-lg">
          Thank you for your purchase. Your order has been received.
        </p>
      </div>

      {/* Order Number */}
      <div className="bg-slate-800 p-6 rounded-lg shadow-2xl border border-slate-700 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Order Number</p>
            <p className="text-2xl font-bold text-sky-400">{orderDetails.orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm mb-1">Order Date</p>
            <p className="text-white font-semibold">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700 mb-6">
        <h2 className="text-2xl font-semibold text-white mb-6">Order Details</h2>
        
        {/* Items */}
        <div className="space-y-4 mb-6">
          {orderDetails.items.map((item, index) => (
            <div key={index} className="py-4 border-b border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="text-white font-medium">{item.name}</p>
                  <p className="text-gray-400 text-sm">Quantity: {item.quantity}</p>
                  {item.selectedOptions && (
                    <p className="text-sky-400 text-xs mt-1">{item.selectedOptions}</p>
                  )}
                </div>
                <p className="text-white font-semibold">${(item.quantity * item.price).toFixed(2)}</p>
              </div>
              {item.customText && (
                <div className="mt-3 bg-slate-700 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-purple-400 mb-1">Custom Engraving Text:</p>
                  <p className="text-sm text-white italic mb-2">"{item.customText}"</p>
                  {item.customTextCost && (
                    <p className="text-xs text-gray-400">
                      {item.customTextCharCount} characters • +${item.customTextCost.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
              {item.customization && (
                <div className="mt-3 bg-slate-700 p-3 rounded-lg">
                  <div className="flex items-start gap-3">
                    <img 
                      src={item.customization.value} 
                      alt="Customization" 
                      className="w-24 h-24 object-cover rounded border-2 border-slate-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-300 mb-2">
                        <span className="font-semibold text-sky-400">
                          {item.customization.type === 'gallery' ? 'Gallery Design' : 'Uploaded Design'}
                        </span>
                        {item.customization.fileName && (
                          <span className="text-gray-500"> • {item.customization.fileName}</span>
                        )}
                      </p>
                      <button
                        onClick={() => handleDownloadCustomizationImage(item, index)}
                        className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Full-Size Image
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-2 text-gray-300">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${orderDetails.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>${orderDetails.shipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${orderDetails.tax.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-700 pt-2 mt-2"></div>
          <div className="flex justify-between text-xl font-bold text-white">
            <span>Total</span>
            <span>${orderDetails.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700 mb-6">
        <h2 className="text-2xl font-semibold text-white mb-4">Shipping Address</h2>
        <div className="text-gray-300 space-y-1">
          <p className="font-semibold text-white">{orderDetails.shippingAddress.name}</p>
          <p>{orderDetails.shippingAddress.email}</p>
          <p>{orderDetails.shippingAddress.address}</p>
          <p>
            {orderDetails.shippingAddress.city}, {orderDetails.shippingAddress.state}{' '}
            {orderDetails.shippingAddress.zip}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleDownloadReceipt}
          className="bg-sky-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-sky-600 transition-colors flex items-center justify-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download Receipt
        </button>
        {orderDetails.items.some(item => item.customization) && (
          <button
            onClick={handleDownloadAllImages}
            className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Download All Images
          </button>
        )}
        <Link to="/store">
          <button className="w-full bg-slate-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-colors">
            Continue Shopping
          </button>
        </Link>
      </div>

      {/* Confirmation Message */}
      <div className="mt-8 text-center">
        <p className="text-gray-400 text-sm">
          A confirmation email has been sent to {orderDetails.shippingAddress.email}
        </p>
        <p className="text-gray-500 text-xs mt-2">
          (This is a demo - no actual email was sent)
        </p>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
