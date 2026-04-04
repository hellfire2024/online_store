import {
  ShippingRate,
  ShippingRateRequest,
  ShippingAddress,
} from "../types.js";

const SHIPSTATION_API_BASE = "https://ssapi.shipstation.com";

// Helper to create auth header. Supports legacy Basic (key+secret) and current Bearer (key-only).
function getAuthHeader(apiKeyOverride?: string, apiSecretOverride?: string) {
  const apiKey = (
    apiKeyOverride ||
    process.env.SHIPSTATION_API_KEY ||
    ""
  ).trim();
  const apiSecret = (
    apiSecretOverride ||
    process.env.SHIPSTATION_API_SECRET ||
    ""
  ).trim();
  if (!apiKey) {
    throw new Error("ShipStation API key not configured");
  }
  // Prefer legacy Basic auth when a secret is provided.
  if (apiSecret) {
    const credentials = `${apiKey}:${apiSecret}`;
    const auth = Buffer.from(credentials).toString("base64");
    return `Basic ${auth}`;
  }
  // Current ShipStation keys are bearer tokens.
  return `Bearer ${apiKey}`;
}

// Helper to format address for ShipStation
function formatAddressForShipStation(address: ShippingAddress) {
  return {
    name: `${address.firstName} ${address.lastName}`,
    street1: address.street1,
    street2: address.street2 || "",
    city: address.city,
    state: address.state,
    postalCode: address.zip,
    country: "US",
    phone: address.phone,
    email: address.email,
  };
}

// Map ShipStation carrier/service codes to human-readable names
const CARRIER_SERVICE_MAP: { [key: string]: { [key: string]: string } } = {
  usps: {
    "USPS First Class": "USPS First Class",
    "USPS Priority Mail": "USPS Priority Mail",
    "USPS Express Mail": "USPS Express Mail",
    "USPS Ground Advantage": "USPS Ground Advantage",
  },
  fedex: {
    "FedEx Ground": "FedEx Ground",
    "FedEx 2Day": "FedEx 2-Day",
    "FedEx Overnight": "FedEx Overnight",
    "FedEx Home Delivery": "FedEx Home Delivery",
  },
  ups: {
    "UPS Ground": "UPS Ground",
    "UPS 2nd Day Air": "UPS 2nd Day Air",
    "UPS 3 Day Select": "UPS 3 Day Select",
    "UPS Next Day Air": "UPS Next Day Air",
  },
  dhl: {
    "DHL Ground": "DHL Ground",
    "DHL Express": "DHL Express",
  },
};

export async function getShippingRates(
  request: ShippingRateRequest,
  apiKeyOverride?: string,
  apiSecretOverride?: string,
): Promise<ShippingRate[]> {
  try {
    const rates: ShippingRate[] = [];

    // Get rates from ShipStation for each enabled carrier
    const shipstationCarriers = ["usps", "fedex", "ups", "dhl"];

    for (const shipstationCarrier of shipstationCarriers) {
      try {
        const url = new URL(`${SHIPSTATION_API_BASE}/shipments/getrates`);
        url.searchParams.set("carrierCode", shipstationCarrier);
        url.searchParams.set("fromPostalCode", request.fromAddress.zip);
        url.searchParams.set("toPostalCode", request.toAddress.zip);
        url.searchParams.set("toCountry", "US");
        url.searchParams.set("weight", request.parcel.weight.toString());
        url.searchParams.set(
          "dimensionsLength",
          request.parcel.length.toString(),
        );
        url.searchParams.set(
          "dimensionsWidth",
          request.parcel.width.toString(),
        );
        url.searchParams.set(
          "dimensionsHeight",
          request.parcel.height.toString(),
        );

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: getAuthHeader(apiKeyOverride, apiSecretOverride),
          },
        });

        const payload = (await response.json()) as any;
        if (!response.ok) {
          throw new Error(
            payload?.message || `ShipStation error: ${response.status}`,
          );
        }

        if (payload && Array.isArray(payload)) {
          payload.forEach((rate: any) => {
            const carrierServiceMap =
              CARRIER_SERVICE_MAP[shipstationCarrier] || {};
            const serviceName =
              carrierServiceMap[rate.serviceName] || rate.serviceName;

            rates.push({
              id: `${shipstationCarrier}-${rate.serviceCode}`,
              carrier: "shipstation",
              service: rate.serviceCode,
              serviceName: serviceName,
              rate: Math.round(parseFloat(rate.shipmentCost) * 100), // Convert to cents
              estimatedDays: rate.deliveryDays || 0,
            });
          });
        }
      } catch (carrierError) {
        console.warn(
          `Failed to get rates for ${shipstationCarrier}:`,
          carrierError,
        );
        // Continue with next carrier
      }
    }

    return rates;
  } catch (error) {
    console.error("ShipStation error:", error);
    throw new Error(
      `Failed to get ShipStation rates: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function createLabel(
  shipmentData: any,
  carrierCode: string,
  serviceCode: string,
  apiKeyOverride?: string,
  apiSecretOverride?: string,
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
        units: "pounds",
      },
      dimensions: {
        length: shipmentData.parcel.length,
        width: shipmentData.parcel.width,
        height: shipmentData.parcel.height,
        units: "inches",
      },
      confirmationChecked: true,
    };

    const response = await fetch(
      `${SHIPSTATION_API_BASE}/shipments/createlabel`,
      {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(apiKeyOverride, apiSecretOverride),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(labelData),
      },
    );

    const payload = (await response.json()) as any;
    if (!response.ok) {
      throw new Error(
        payload?.message || `ShipStation error: ${response.status}`,
      );
    }

    return payload;
  } catch (error) {
    console.error("ShipStation label creation error:", error);
    throw new Error(
      `Failed to create ShipStation label: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function trackShipment(
  trackingId: string,
  carrierCode?: string,
  apiKeyOverride?: string,
  apiSecretOverride?: string,
): Promise<any> {
  try {
    const url = new URL(`${SHIPSTATION_API_BASE}/shipments/track`);
    url.searchParams.set("trackingNumber", trackingId);
    if (carrierCode) {
      url.searchParams.set("carrierCode", carrierCode);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: getAuthHeader(apiKeyOverride, apiSecretOverride),
      },
    });

    const payload = (await response.json()) as any;
    if (!response.ok) {
      throw new Error(
        payload?.message || `ShipStation error: ${response.status}`,
      );
    }

    return payload;
  } catch (error) {
    console.error("ShipStation tracking error:", error);
    throw new Error(
      `Failed to track ShipStation shipment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
