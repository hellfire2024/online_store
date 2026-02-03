
import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import apiClient from '../services/apiClient';
import { useToast } from '../hooks/useToast';
import { calculateTax } from '../services/taxService';

const CheckoutPage: React.FC = () => {
  const { cartItems, clearCart, itemCount } = useCart();
  const { customer } = useCustomerAuth();
  const { siteSettings } = useSiteSettings();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [shippingState, setShippingState] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [isCalculatingTax, setIsCalculatingTax] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'account' | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  });
  const [taxCalculation, setTaxCalculation] = useState({
    subtotal: 0,
    taxableAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
  });

  const toNumber = (value: unknown, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const sanitizeTaxResult = (
    result: any,
    fallbackSubtotal: number,
    shippingCost: number,
  ) => {
    const subtotal = toNumber(result?.subtotal, fallbackSubtotal);
    const taxableAmount = toNumber(result?.taxableAmount, subtotal);
    const taxRate = toNumber(result?.taxRate, 0);
    const taxAmount = toNumber(result?.taxAmount, 0);
    const total = toNumber(result?.total, subtotal + shippingCost + taxAmount);

    return {
      subtotal,
      taxableAmount,
      taxRate,
      taxAmount,
      total,
    };
  };

  // Auto-populate customer data when logged in
  React.useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: '',
        city: '',
      });
      
      // If customer has a default shipping address, select it
      const defaultShippingAddress = customer.addresses?.find(
        addr => addr.type === 'shipping' && addr.isDefault
      );
      
      if (defaultShippingAddress) {
        setSelectedAddressId(defaultShippingAddress.id);
        // Parse full name into first/last
        const nameParts = defaultShippingAddress.fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        setFormData({
          firstName,
          lastName,
          email: customer.email || '',
          phone: defaultShippingAddress.phone || customer.phone || '',
          address: defaultShippingAddress.streetAddress || '',
          city: defaultShippingAddress.city || '',
        });
        setShippingState(defaultShippingAddress.state || '');
        setShippingZip(defaultShippingAddress.zipCode || '');
      }
    }
  }, [customer]);

  // Handle address selection
  const handleAddressSelect = (addressId: string) => {
    if (addressId === 'new') {
      setSelectedAddressId('');
      setFormData({
        firstName: customer?.firstName || '',
        lastName: customer?.lastName || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        address: '',
        city: '',
      });
      setShippingState('');
      setShippingZip('');
    } else {
      setSelectedAddressId(addressId);
      const address = customer?.addresses?.find(addr => addr.id === addressId);
      if (address) {
        // Parse full name into first/last
        const nameParts = address.fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        setFormData({
          firstName,
          lastName,
          email: customer?.email || '',
          phone: address.phone || customer?.phone || '',
          address: address.streetAddress || '',
          city: address.city || '',
        });
        setShippingState(address.state || '');
        setShippingZip(address.zipCode || '');
      }
    }
  };

  // Redirect to cart if empty (must be in effect to avoid setState during render)
  // But only if we're still on the checkout page
  React.useEffect(() => {
    if (itemCount === 0 && window.location.hash === '#/checkout') {
      navigate('/cart');
    }
  }, [itemCount, navigate]);

  // Calculate tax when state/zip changes
  useMemo(() => {
    const calculateTaxAsync = async () => {
      const shippingCost = toNumber(siteSettings?.shippingFlatRate, 5);

      // Calculate subtotal first
      const subtotal = cartItems.reduce((total, item) => {
        let optionsDelta = 0;
        if (item.selectedOptions && item.product.optionLists) {
          item.product.optionLists.forEach((list) => {
            const selectedOptionIds = item.selectedOptions?.[list.id] || [];
            if (Array.isArray(selectedOptionIds)) {
              selectedOptionIds.forEach((optionId) => {
                const option = list.options.find((o) => o.id === optionId);
                if (option) {
                  optionsDelta += toNumber(option.priceDelta);
                }
              });
            } else {
              // Fallback for old single-select format
              const option = list.options.find((o) => o.id === selectedOptionIds);
              if (option) {
                optionsDelta += toNumber(option.priceDelta);
              }
            }
          });
        }
        const itemPrice = toNumber(item.product.price);
        const quantity = toNumber(item.quantity);
        return total + (itemPrice + optionsDelta) * quantity;
      }, 0);

      if (!siteSettings || !siteSettings.taxConfig || !shippingState) {
        setTaxCalculation(
          sanitizeTaxResult(
            {
              subtotal,
              taxableAmount: subtotal,
              taxRate: 0,
              taxAmount: 0,
              total: subtotal + shippingCost,
            },
            subtotal,
            shippingCost,
          ),
        );
        return;
      }

      const provider = siteSettings.taxConfig.provider;
      const credentials = siteSettings.taxConfig.credentials;

      // Use API for supported providers (requires credentials)
      if (
        provider !== 'manual' &&
        (provider === 'stripe' && credentials?.stripeApiKey) ||
        (provider === 'taxjar' && credentials?.taxjarApiKey) ||
        (provider === 'avalara' && credentials?.avalaraAccountId && credentials?.avalaraLicenseKey) ||
        (provider === 'taxcloud' && credentials?.taxcloudApiKey && credentials?.taxcloudUserId) ||
        (provider === 'zamp' && credentials?.zampApiKey) ||
        (provider === 'anrok' && credentials?.anrokApiKey)
      ) {
        setIsCalculatingTax(true);
        try {
          const response = await fetch(`/api/tax/providers/${provider}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cartItems,
              shippingCost,
              shippingState,
              shippingZip,
              ...(provider === 'stripe' && { stripeApiKey: credentials?.stripeApiKey }),
              ...(provider === 'taxjar' && { apiKey: credentials?.taxjarApiKey }),
              ...(provider === 'avalara' && {
                accountId: credentials?.avalaraAccountId,
                licenseKey: credentials?.avalaraLicenseKey,
                environment: credentials?.avalaraEnvironment || 'sandbox',
              }),
              ...(provider === 'taxcloud' && {
                apiKey: credentials?.taxcloudApiKey,
                userId: credentials?.taxcloudUserId,
              }),
              ...(provider === 'zamp' && { apiKey: credentials?.zampApiKey }),
              ...(provider === 'anrok' && { apiKey: credentials?.anrokApiKey }),
            }),
          });

          if (!response.ok) {
            throw new Error(`Tax API error: ${response.statusText}`);
          }

          const result = await response.json();
          setTaxCalculation(sanitizeTaxResult(result, subtotal, shippingCost));
        } catch (error) {
          console.error(`${provider} tax calculation failed, falling back to manual:`, error);
          const manualTax = calculateTax(
            cartItems,
            shippingCost,
            shippingState,
            siteSettings.taxConfig,
          );
          setTaxCalculation(sanitizeTaxResult(manualTax, subtotal, shippingCost));
          addToast('Using fallback tax calculation', 'info');
        } finally {
          setIsCalculatingTax(false);
        }
      } else {
        // Use manual tax rules
        const manualTax = calculateTax(
          cartItems,
          shippingCost,
          shippingState,
          siteSettings.taxConfig,
        );
        setTaxCalculation(sanitizeTaxResult(manualTax, subtotal, shippingCost));
      }
    };

    calculateTaxAsync();
  }, [cartItems, shippingState, shippingZip, siteSettings, addToast]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.address || !formData.city) {
      addToast('Please fill in all shipping information', 'error');
      return;
    }
    
    if (!shippingState) {
      addToast('Please select a state for tax calculation', 'error');
      return;
    }

    if (!shippingZip) {
      addToast('Please enter a ZIP code', 'error');
      return;
    }

    try {
      // Generate order number in the same format as backend: AGIS-XXXXXXXXXX
      // Use a combination of timestamp and random number to ensure uniqueness
      const randomNum = Math.floor(Math.random() * 1000000000);
      const orderNumber = `AGIS-${String(randomNum).padStart(10, '0')}`;

      // Prepare order details
      const orderDetails = {
        orderNumber,
        subtotal: taxCalculation.subtotal,
        shipping: siteSettings?.shippingFlatRate || 5,
        tax: taxCalculation.taxAmount,
        total: taxCalculation.total,
        items: cartItems.map(item => {
          let optionsDelta = 0;
          let selectedOptionsText = '';
          
          if (item.selectedOptions && item.product.optionLists) {
            const optionParts: string[] = [];
            item.product.optionLists.forEach((list) => {
              const selectedOptionIds = item.selectedOptions?.[list.id] || [];
              if (Array.isArray(selectedOptionIds)) {
                selectedOptionIds.forEach((optionId) => {
                  const option = list.options.find((o) => o.id === optionId);
                  if (option) {
                    optionsDelta += option.priceDelta;
                    optionParts.push(`${list.name}: ${option.name}`);
                  }
                });
              } else {
                // Fallback for old single-select format
                const option = list.options.find((o) => o.id === selectedOptionIds);
                if (option) {
                  optionsDelta += option.priceDelta;
                  optionParts.push(`${list.name}: ${option.name}`);
                }
              }
            });
            selectedOptionsText = optionParts.join(', ');
          }
          
          // Add custom text cost
          let customTextCost = 0;
          if (item.customText && item.product.customTextPricePerChar) {
            customTextCost = item.customText.length * item.product.customTextPricePerChar;
          }
          
          return {
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price + optionsDelta + customTextCost,
            productImage: item.product.imageUrl,
            customization: item.customization ? {
              type: item.customization.type,
              value: item.customization.value, // Full-size image URL or data URL
              fileName: item.customization.type === 'upload' ? `${item.product.name}-custom.png` : undefined,
            } : undefined,
            selectedOptions: selectedOptionsText || undefined,
            customText: item.customText || undefined,
            customTextCharCount: item.customText ? item.customText.length : undefined,
            customTextCost: customTextCost > 0 ? customTextCost : undefined,
          };
        }),
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          street1: formData.address,
          city: formData.city,
          state: shippingState,
          zip: shippingZip,
          country: 'US',
          phone: formData.phone || '',
        },
      };

      // Store in both sessionStorage and localStorage for HashRouter compatibility
      sessionStorage.setItem('orderDetails', JSON.stringify(orderDetails));
      localStorage.setItem('orderDetails', JSON.stringify(orderDetails));
      localStorage.setItem('shouldShowOrderConfirmation', 'true');
      
      console.log('Order placed. Stored in sessionStorage and localStorage:', orderDetails.orderNumber);
      
      // Try to send order to backend API to create order and trigger email
      try {
        const result = await apiClient.orders.create({
          orderNumber: orderDetails.orderNumber,
          customerId: customer?.id || null,
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          orderData: orderDetails,
        });

        console.log('Order sent to backend:', result);
        if (result?.emailSent) {
          addToast('Order confirmation email sent!', 'success');
        }
      } catch (error) {
        console.warn('Could not send order to backend (expected if server is down):', error);
      }
      
      addToast('Order placed successfully!', 'success');
      
      // Navigate FIRST, then clear cart (clearing cart first causes redirect back to cart)
      navigate('/order-confirmation', { state: orderDetails, replace: true });
      
      // Clear cart after navigation to avoid triggering the empty cart redirect
      setTimeout(() => clearCart(), 100);
    } catch (error) {
      console.error('Error processing order:', error);
      addToast('An error occurred while processing your order. Please try again.', 'error');
    }
  };

  const inputClasses = "w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  ];

  // Guard against rendering if cart is empty (redirect will happen via useEffect)
  if (itemCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Redirecting to cart...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-white text-center mb-8">Checkout</h1>
      
      {/* Show login/guest prompt if not authenticated and mode not selected */}
      {!customer && !checkoutMode && (
        <div className="bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">How would you like to checkout?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guest Checkout */}
            <div className="border border-slate-600 rounded-lg p-6 hover:border-sky-500 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-3">Guest Checkout</h3>
              <p className="text-gray-400 mb-4">Checkout quickly without creating an account</p>
              <button
                onClick={() => setCheckoutMode('guest')}
                className="w-full bg-slate-700 text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Continue as Guest
              </button>
            </div>

            {/* Account Checkout */}
            <div className="border border-slate-600 rounded-lg p-6 hover:border-sky-500 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-3">Sign In or Register</h3>
              <p className="text-gray-400 mb-4">Track orders, save addresses, and checkout faster</p>
              <div className="space-y-3">
                <Link to="/login?redirect=/checkout">
                  <button className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors">
                    Sign In
                  </button>
                </Link>
                <Link to="/register?redirect=/checkout">
                  <button className="w-full bg-slate-700 text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors">
                    Create Account
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show logged-in user info with option to switch to guest */}
      {customer && (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm">Checking out as</p>
              <p className="text-white font-semibold">{customer.name} ({customer.email})</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Switch to guest checkout? You will need to re-enter shipping information.')) {
                  // Clear form data when switching to guest
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    address: '',
                    city: '',
                  });
                  setCheckoutMode('guest');
                }
              }}
              className="text-sky-400 hover:text-sky-300 text-sm underline"
            >
              Checkout as guest instead
            </button>
          </div>
        </div>
      )}

      {/* Show checkout form if authenticated or guest mode selected */}
      {(customer || checkoutMode === 'guest') && (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        {/* Shipping & Payment Form */}
        <div className="lg:col-span-3 bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
          <form onSubmit={handlePlaceOrder}>
            <h2 className="text-2xl font-semibold text-white mb-6">Shipping Information</h2>
            
            {/* Address Selection for Logged-in Users */}
            {customer && customer.addresses && customer.addresses.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Shipping Address
                </label>
                <select
                  value={selectedAddressId}
                  onChange={(e) => handleAddressSelect(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Choose an address...</option>
                  {customer.addresses
                    .filter(addr => addr.type === 'shipping')
                    .map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.fullName} - {addr.streetAddress}, {addr.city}, {addr.state} {addr.zipCode}
                        {addr.isDefault ? ' (Default)' : ''}
                      </option>
                    ))}
                  <option value="new">+ Add New Address</option>
                </select>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="First Name" 
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className={inputClasses} 
                  required 
                />
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className={inputClasses} 
                  required 
                />
              </div>
              <input 
                type="email" 
                placeholder="Email Address" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className={inputClasses} 
                required 
              />
              <input 
                type="tel" 
                placeholder="Phone Number" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className={inputClasses} 
              />
              <input 
                type="text" 
                placeholder="Address" 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className={inputClasses} 
                required 
              />
              <div className="flex space-x-4">
                <input 
                  type="text" 
                  placeholder="City" 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className={inputClasses} 
                  required 
                />
                <select
                  value={shippingState}
                  onChange={(e) => setShippingState(e.target.value)}
                  className={inputClasses}
                  required
                >
                  <option value="">Select State</option>
                  {usStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                <input 
                  type="text" 
                  placeholder="ZIP Code" 
                  value={shippingZip}
                  onChange={(e) => setShippingZip(e.target.value)}
                  className={inputClasses} 
                  required 
                />
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-white mt-8 mb-6">Payment Details</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Card Number" className={inputClasses} />
              <div className="flex space-x-4">
                <input type="text" placeholder="MM / YY" className={inputClasses} />
                <input type="text" placeholder="CVC" className={inputClasses} />
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
              <span>${toNumber(taxCalculation.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>${toNumber(siteSettings?.shippingFlatRate, 5).toFixed(2)}</span>
            </div>
            {siteSettings.taxConfig.enableTaxCollection && shippingState && (
              <>
                <div className="flex justify-between text-gray-400">
                  <span>{isCalculatingTax ? 'Calculating tax...' : `Tax (${toNumber(taxCalculation.taxRate)}%)`}</span>
                  <span>{isCalculatingTax ? '...' : `$${toNumber(taxCalculation.taxAmount).toFixed(2)}`}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {siteSettings.taxConfig.provider === "stripe" ? (
                    <span>💳 Stripe Tax • {shippingState} {shippingZip}</span>
                  ) : siteSettings.taxConfig.provider === "taxjar" ? (
                    <span>📊 TaxJar • {shippingState} {shippingZip}</span>
                  ) : siteSettings.taxConfig.provider === "avalara" ? (
                    <span>🏛️ Avalara AvaTax • {shippingState} {shippingZip}</span>
                  ) : siteSettings.taxConfig.provider === "taxcloud" ? (
                    <span>☁️ TaxCloud • {shippingState} {shippingZip}</span>
                  ) : siteSettings.taxConfig.provider === "zamp" ? (
                    <span>⚡ Zamp • {shippingState} {shippingZip}</span>
                  ) : siteSettings.taxConfig.provider === "anrok" ? (
                    <span>🌍 Anrok • {shippingState} {shippingZip}</span>
                  ) : (
                    <span>Based on: {shippingState}</span>
                  )}
                </div>
              </>
            )}
            <div className="border-t border-slate-700 my-3"></div>
            <div className="flex justify-between text-xl font-bold text-white">
              <span>Total</span>
              <span>${toNumber(taxCalculation.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default CheckoutPage;
