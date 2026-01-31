import axios from 'axios';
import { ShippingRate, ShippingRateRequest, ShippingAddress, ShippingPackage } from '../../types';

const SHIPSTATION_API_BASE = 'https://ssapi.shipstation.com';
const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY;
const SHIPSTATION_API_SECRET = process.env.SHIPSTATION_API_SECRET;

// Helper to create Basic Auth header
function getAuthHeader() {
  if (!SHIPSTATION_API_KEY || !SHIPSTATION_API_SECRET) {
    throw new Error('ShipStation API credentials not configured');
  }
  const credentials = `${SHIPSTATION_API_KEY}:${SHIPSTATION_API_SECRET}`;
  const auth = Buffer.from(credentials).toString('base64');
  return `Basic ${auth}`;
}

// Helper to format address for ShipStation
function formatAddressForShipStation(address: ShippingAddress) {
  return {
    name: `${address.firstName} ${address.lastName}`,
    street1: address.street1,
    street2: address.street2 || '',
    city: address.city,
    state: address.state,
    postalCode: address.zip,
    country: 'US',
    phone: address.phone,
    email: address.email,
  };
}

// Map ShipStation carrier/service codes to human-readable names
const CARRIER_SERVICE_MAP: { [key: string]: { [key: string]: string } } = {
  'usps': {
    'USPS First Class': 'USPS First Class',
    'USPS Priority Mail': 'USPS Priority Mail',
    'USPS Express Mail': 'USPS Express Mail',
    'USPS Ground Advantage': 'USPS Ground Advantage',
  },
  'fedex': {
    'FedEx Ground': 'FedEx Ground',
    'FedEx 2Day': 'FedEx 2-Day',
    'FedEx Overnight': 'FedEx Overnight',
    'FedEx Home Delivery': 'FedEx Home Delivery',
  },
  'ups': {
    'UPS Ground': 'UPS Ground',
    'UPS 2nd Day Air': 'UPS 2nd Day Air',
    'UPS 3 Day Select': 'UPS 3 Day Select',
    'UPS Next Day Air': 'UPS Next Day Air',
  },
  'dhl': {
    'DHL Ground': 'DHL Ground',
    'DHL Express': 'DHL Express',
  },
};

export async function getShippingRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
  try {
    const rateData = {
      carrierCode: 'usps', // Can request specific carrier
      serviceCode: null, // null gets all services
      fromPostalCode: request.fromAddress.zip,
      toPostalCode: request.toAddress.zip,
      toCountry: 'US',
      weight: {
        value: request.parcel.weight,
        units: 'pounds',
      },
      dimensions: {
        length: request.parcel.length,
        width: request.parcel.width,
        height: request.parcel.height,
        units: 'inches',
      },
      confirmation: 'delivery',
      insurance: {
        provider: 'carrier',
      },
    };

    const rates: ShippingRate[] = [];

    // Get rates from ShipStation for each enabled carrier
    const carriersToCheck = request.carriers || ['easypost', 'shippo', 'shipstation'];
    const shipstationCarriers = ['usps', 'fedex', 'ups', 'dhl'];

    for (const shipstationCarrier of shipstationCarriers) {
      try {
        const response = await axios.get(
          `${SHIPSTATION_API_BASE}/shipments/getrates`,
          {
            params: {
              carrierCode: shipstationCarrier,
              serviceCode: null,
              fromPostalCode: request.fromAddress.zip,
              toPostalCode: request.toAddress.zip,
              toCountry: 'US',
              weight: request.parcel.weight,
              dimensionsLength: request.parcel.length,
              dimensionsWidth: request.parcel.width,
              dimensionsHeight: request.parcel.height,
            },
            headers: {
              Authorization: getAuthHeader(),
            },
          }
        );

        if (response.data && Array.isArray(response.data)) {
          response.data.forEach((rate: any) => {
            const carrierServiceMap = CARRIER_SERVICE_MAP[shipstationCarrier] || {};
            const serviceName = carrierServiceMap[rate.serviceName] || rate.serviceName;

            rates.push({
              id: `${shipstationCarrier}-${rate.serviceCode}`,
              carrier: 'shipstation',
              service: rate.serviceCode,
              serviceName: serviceName,
              rate: Math.round(parseFloat(rate.shipmentCost) * 100), // Convert to cents
              estimatedDays: rate.deliveryDays || 0,
            });
          });
        }
      } catch (carrierError) {
        console.warn(`Failed to get rates for ${shipstationCarrier}:`, carrierError);
        // Continue with next carrier
      }
    }

    return rates;
  } catch (error) {
    console.error('ShipStation error:', error);
    throw new Error(
      `Failed to get ShipStation rates: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function createLabel(
  shipmentData: any,
  carrierCode: string,
  serviceCode: string
): Promise<any> {
  try {
    const labelData = {
      carrierCode: carrierCode,
      serviceCode: serviceCode,
      testLabel: false,
      shipTo: formatAddressForShipStation(shipmentData.toAddress),
      shipFrom: formatAddressForShipStation(shipmentData.fromAddress),
      weight: {
        value: shipmentData.parcel.weight,
        units: 'pounds',
      },
      dimensions: {
        length: shipmentData.parcel.length,
        width: shipmentData.parcel.width,
        height: shipmentData.parcel.height,
        units: 'inches',
      },
      confirmationChecked: true,
    };

    const response = await axios.post(
      `${SHIPSTATION_API_BASE}/shipments/createlabel`,
      labelData,
      {
        headers: {
          Authorization: getAuthHeader(),
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('ShipStation label creation error:', error);
    throw new Error(
      `Failed to create ShipStation label: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function trackShipment(trackingId: string, carrierCode?: string): Promise<any> {
  try {
    const response = await axios.get(
      `${SHIPSTATION_API_BASE}/shipments/track`,
      {
        params: {
          trackingNumber: trackingId,
          carrierCode: carrierCode,
        },
        headers: {
          Authorization: getAuthHeader(),
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('ShipStation tracking error:', error);
    throw new Error(
      `Failed to track ShipStation shipment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
