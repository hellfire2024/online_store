import {
  ShippingRate,
  ShippingRateRequest,
  ShippingAddress,
  ShippingPackage,
} from "../types.js";

const SHIPPO_API_BASE = "https://api.goshippo.com/v1";

const resolveApiKey = (apiKeyOverride?: string): string =>
  apiKeyOverride || process.env.SHIPPO_API_KEY || "";

// Helper to format address for Shippo
function formatAddressForShippo(address: ShippingAddress) {
  return {
    name: `${address.firstName} ${address.lastName}`,
    street1: address.street1,
    street2: address.street2 || "",
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: "US", // Shippo uses country codes
    email: address.email,
    phone: address.phone,
  };
}

// Helper to format parcel for Shippo
function formatParcelForShippo(parcel: ShippingPackage) {
  return {
    length: parcel.length.toString(),
    width: parcel.width.toString(),
    height: parcel.height.toString(),
    weight: parcel.weight.toString(),
    distance_unit: "in",
    mass_unit: "lb",
  };
}

// Map Shippo carrier/service to human-readable names
const CARRIER_SERVICE_MAP: { [key: string]: { [key: string]: string } } = {
  usps: {
    First: "USPS First Class",
    Priority: "USPS Priority Mail",
    Express: "USPS Express Mail",
    ParcelSelect: "USPS Parcel Select Ground",
  },
  fedex: {
    FEDEX_GROUND: "FedEx Ground",
    FEDEX_2_DAY: "FedEx 2-Day",
    FEDEX_2_DAY_AM: "FedEx 2-Day AM",
    FEDEX_OVERNIGHT_AM: "FedEx Overnight AM",
    FEDEX_OVERNIGHT_PM: "FedEx Overnight PM",
  },
  ups: {
    UPS_GROUND: "UPS Ground",
    UPS_2ND_DAY_AIR: "UPS 2nd Day Air",
    UPS_3_DAY_SELECT: "UPS 3 Day Select",
    UPS_NEXT_DAY_AIR: "UPS Next Day Air",
  },
  dhl_express: {
    Ground: "DHL Ground",
    Express: "DHL Express",
  },
};

export async function getShippingRates(
  request: ShippingRateRequest,
  apiKeyOverride?: string,
): Promise<ShippingRate[]> {
  const apiKey = resolveApiKey(apiKeyOverride);
  if (!apiKey) {
    throw new Error("Shippo API key not configured");
  }

  try {
    // Create shipment object
    const shipmentData = {
      address_from: formatAddressForShippo(request.fromAddress),
      address_to: formatAddressForShippo(request.toAddress),
      parcels: [formatParcelForShippo(request.parcel)],
      async: false, // Get rates synchronously
    };

    const shipmentResponse = await fetch(`${SHIPPO_API_BASE}/shipments`, {
      method: "POST",
      headers: {
        Authorization: `ShippoToken ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shipmentData),
    });

    const shipment = (await shipmentResponse.json()) as any;
    if (!shipmentResponse.ok) {
      throw new Error(
        shipment?.detail || `Shippo error: ${shipmentResponse.status}`,
      );
    }
    const rates: ShippingRate[] = [];

    // Extract rates from shipment
    if (shipment.rates && Array.isArray(shipment.rates)) {
      shipment.rates.forEach((rate: any) => {
        const carrier = rate.provider?.toLowerCase() || "unknown";
        const service =
          rate.servicelevel?.name || rate.servicelevel?.token || "Standard";
        const carrierServiceMap = CARRIER_SERVICE_MAP[carrier] || {};
        const serviceName =
          carrierServiceMap[service] || `${carrier} ${service}`;

        rates.push({
          id: rate.object_id,
          carrier: "shippo",
          service: service,
          serviceName: serviceName,
          rate: Math.round(parseFloat(rate.amount) * 100), // Convert to cents
          estimatedDays: rate.estimated_days || 0,
          estimatedDelivery: rate.estimated_delivery_date,
        });
      });
    }

    return rates;
  } catch (error) {
    console.error("Shippo error:", error);
    throw new Error(
      `Failed to get Shippo rates: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function createLabel(
  shipmentId: string,
  rateId: string,
  labelFormat: string = "PDF",
  apiKeyOverride?: string,
): Promise<any> {
  const apiKey = resolveApiKey(apiKeyOverride);
  if (!apiKey) {
    throw new Error("Shippo API key not configured");
  }

  try {
    const labelData = {
      shipment: shipmentId,
      rate: rateId,
      label_file_type: labelFormat.toLowerCase(),
    };

    const response = await fetch(`${SHIPPO_API_BASE}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `ShippoToken ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(labelData),
    });

    const payload = (await response.json()) as any;
    if (!response.ok) {
      throw new Error(payload?.detail || `Shippo error: ${response.status}`);
    }

    return payload;
  } catch (error) {
    console.error("Shippo label creation error:", error);
    throw new Error(
      `Failed to create Shippo label: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function trackShipment(
  trackingId: string,
  carrier?: string,
  apiKeyOverride?: string,
): Promise<any> {
  const apiKey = resolveApiKey(apiKeyOverride);
  if (!apiKey) {
    throw new Error("Shippo API key not configured");
  }

  try {
    // For Shippo, tracking requires both tracking number and carrier
    // Format: /v1/tracks/CARRIER_CODE/TRACKING_NUMBER
    const url = new URL(`${SHIPPO_API_BASE}/tracks/`);
    url.searchParams.set("tracking_number", trackingId);
    if (carrier) {
      url.searchParams.set("carrier", carrier);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `ShippoToken ${apiKey}`,
      },
    });

    const payload = (await response.json()) as any;
    if (!response.ok) {
      throw new Error(payload?.detail || `Shippo error: ${response.status}`);
    }

    return payload;
  } catch (error) {
    console.error("Shippo tracking error:", error);
    throw new Error(
      `Failed to track Shippo shipment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
