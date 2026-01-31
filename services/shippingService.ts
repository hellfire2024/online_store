import { ShippingRate, ShippingRateRequest } from '../types';

/**
 * Fetch shipping rates from multiple carriers
 */
export async function getShippingRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
  try {
    const response = await fetch('/api/shipping/rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch shipping rates: ${response.statusText}`);
    }

    const data = await response.json();
    return data.rates || [];
  } catch (error) {
    console.error('Error fetching shipping rates:', error);
    throw error;
  }
}

/**
 * Create a shipping label
 */
export async function createShippingLabel(
  carrier: 'easypost' | 'shippo' | 'shipstation',
  rateId: string,
  shipmentId: string,
  shipmentData?: any
): Promise<any> {
  try {
    const response = await fetch('/api/shipping/label', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        carrier,
        rateId,
        shipmentId,
        shipmentData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create shipping label: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating shipping label:', error);
    throw error;
  }
}

/**
 * Track a shipment
 */
export async function trackShipment(
  trackingId: string,
  carrier: 'easypost' | 'shippo' | 'shipstation',
  carrierCode?: string
): Promise<any> {
  try {
    const params = new URLSearchParams();
    params.append('carrier', carrier);
    if (carrierCode) {
      params.append('carrierCode', carrierCode);
    }

    const response = await fetch(`/api/shipping/track/${encodeURIComponent(trackingId)}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to track shipment: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error tracking shipment:', error);
    throw error;
  }
}
