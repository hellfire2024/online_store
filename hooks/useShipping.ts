import { useState, useCallback } from 'react';
import { ShippingRate, ShippingRateRequest } from '../types';
import { getShippingRates } from '../services/shippingService';

interface UseShippingResult {
  rates: ShippingRate[];
  selectedRate: ShippingRate | null;
  loading: boolean;
  error: string | null;
  fetchRates: (request: ShippingRateRequest) => Promise<void>;
  selectRate: (rate: ShippingRate) => void;
  clearRates: () => void;
}

export function useShipping(): UseShippingResult {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async (request: ShippingRateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedRates = await getShippingRates(request);
      setRates(fetchedRates);
      if (fetchedRates.length > 0) {
        setSelectedRate(fetchedRates[0]); // Select cheapest by default
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch shipping rates';
      setError(errorMessage);
      console.error('Shipping error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectRate = useCallback((rate: ShippingRate) => {
    setSelectedRate(rate);
  }, []);

  const clearRates = useCallback(() => {
    setRates([]);
    setSelectedRate(null);
    setError(null);
  }, []);

  return {
    rates,
    selectedRate,
    loading,
    error,
    fetchRates,
    selectRate,
    clearRates,
  };
}
