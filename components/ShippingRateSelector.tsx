import { useState, useEffect } from 'react';
import { ShippingRate } from '../types';
import Spinner from './Spinner';
import Toast from './Toast';

interface ShippingRateSelectorProps {
  rates: ShippingRate[];
  selectedRate: ShippingRate | null;
  onSelectRate: (rate: ShippingRate) => void;
  loading?: boolean;
  error?: string | null;
}

export default function ShippingRateSelector({
  rates,
  selectedRate,
  onSelectRate,
  loading = false,
  error = null,
}: ShippingRateSelectorProps) {
  const [sortedRates, setSortedRates] = useState<ShippingRate[]>([]);

  useEffect(() => {
    // Sort rates by price (cheapest first)
    const sorted = [...rates].sort((a, b) => a.rate - b.rate);
    setSortedRates(sorted);
  }, [rates]);

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const getCarrierIcon = (carrier: string): string => {
    switch (carrier) {
      case 'easypost':
        return '📦';
      case 'shippo':
        return '🚚';
      case 'shipstation':
        return '🛒';
      default:
        return '📫';
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Spinner />
        <p className="mt-2 text-gray-600">Calculating shipping rates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Toast type="error" message={error} onClose={() => {}} />
      </div>
    );
  }

  if (sortedRates.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No shipping rates available for this location</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Shipping Method</h3>
      {sortedRates.map((rate) => (
        <div
          key={rate.id}
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedRate?.id === rate.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
          onClick={() => onSelectRate(rate)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <input
                type="radio"
                name="shipping-method"
                checked={selectedRate?.id === rate.id}
                onChange={() => onSelectRate(rate)}
                className="mt-1 w-4 h-4 text-blue-600 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getCarrierIcon(rate.carrier)}</span>
                  <span className="font-medium text-gray-900">{rate.serviceName}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {rate.carrier === 'easypost' && 'EasyPost'}
                  {rate.carrier === 'shippo' && 'Shippo'}
                  {rate.carrier === 'shipstation' && 'ShipStation'} • Carrier: {rate.service}
                </p>
                {rate.estimatedDays > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {rate.estimatedDays === 1
                      ? 'Delivery in 1 business day'
                      : `Delivery in ${rate.estimatedDays} business days`}
                  </p>
                )}
                {rate.estimatedDelivery && (
                  <p className="text-sm text-gray-500">
                    Estimated delivery: {new Date(rate.estimatedDelivery).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600">${formatPrice(rate.rate)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
