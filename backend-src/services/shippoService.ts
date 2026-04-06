import {
  ShippingRate,
  ShippingRateRequest,
  ShippingAddress,
  ShippingPackage,
} from "../types.js";

const SHIPPO_API_BASE = "https://api.goshippo.com";

const resolveApiKey = (apiKeyOverride?: string): string =>
  apiKeyOverride || process.env.SHIPPO_API_KEY || "";

async function getActiveCarrierAccountIds(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`${SHIPPO_API_BASE}/carrier_accounts`, {
      headers: {
        Authorization: `ShippoToken ${apiKey}`,
      },
    });

    const payload = (await response.json()) as any;
    if (!response.ok) {
      console.warn(
        `[Shippo] Could not fetch carrier accounts (${response.status})`,
      );
      return [];
    }

    const rows = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
        ? payload
        : [];

    const activeAccounts = rows.filter(
      (row: any) => row?.object_id && row?.carrier && row?.active !== false,
    );

    const activeCarriers = Array.from(
      new Set(
        activeAccounts.map((row: any) => String(row.carrier).toLowerCase()),
      ),
    );
    console.log(
      `[Shippo] Active carrier accounts: ${activeCarriers.join(",") || "(none)"}`,
    );

    return activeAccounts.map((row: any) => String(row.object_id));
  } catch (error) {
    console.warn("[Shippo] Failed to load carrier accounts:", error);
    return [];
  }
}

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
    if (apiKey.startsWith("shippo_test_")) {
      console.warn(
        "[Shippo] Using a test API key. Carrier options may be limited (often USPS-only) unless test carrier accounts are connected.",
      );
    }

    const activeCarrierAccounts = await getActiveCarrierAccountIds(apiKey);

    // Create shipment object
    const shipmentData: any = {
      address_from: formatAddressForShippo(request.fromAddress),
      address_to: formatAddressForShippo(request.toAddress),
      parcels: [formatParcelForShippo(request.parcel)],
      async: false, // Get rates synchronously
    };
    if (activeCarrierAccounts.length > 0) {
      shipmentData.carrier_accounts = activeCarrierAccounts;
    }

    console.log(
      `[Shippo] POST ${SHIPPO_API_BASE}/shipments (key: ${apiKey.slice(0, 12)}..., accounts: ${activeCarrierAccounts.length})`,
    );
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
      console.error(
        `[Shippo] API error ${shipmentResponse.status}:`,
        JSON.stringify(shipment),
      );
      throw new Error(
        shipment?.detail || `Shippo error: ${shipmentResponse.status}`,
      );
    }
    console.log(
      `[Shippo] Shipment created: ${shipment.object_id}, rates: ${Array.isArray(shipment.rates) ? shipment.rates.length : 0}`,
    );
    const extractRates = (src: any): ShippingRate[] => {
      const out: ShippingRate[] = [];
      if (src.rates && Array.isArray(src.rates)) {
        src.rates.forEach((rate: any) => {
          const c = rate.provider?.toLowerCase() || "unknown";
          const service =
            rate.servicelevel?.name || rate.servicelevel?.token || "Standard";
          const serviceName =
            (CARRIER_SERVICE_MAP[c] || {})[service] || `${c} ${service}`;
          out.push({
            id: rate.object_id,
            shipmentId: src.object_id,
            carrier: "shippo",
            service,
            serviceName,
            rate: Math.round(parseFloat(rate.amount) * 100),
            estimatedDays: rate.estimated_days || 0,
            estimatedDelivery: rate.estimated_delivery_date,
          });
        });
      }
      return out;
    };

    let rates = extractRates(shipment);

    // If the carrier-account filter returned 0 rates (e.g. all connected
    // accounts are international but the route is domestic), retry without
    // the restriction so Shippo can quote via its default carriers (USPS etc).
    if (rates.length === 0 && activeCarrierAccounts.length > 0) {
      console.log(
        "[Shippo] 0 rates with carrier account filter; retrying without restriction",
      );
      const retryData: any = {
        address_from: formatAddressForShippo(request.fromAddress),
        address_to: formatAddressForShippo(request.toAddress),
        parcels: [formatParcelForShippo(request.parcel)],
        async: false,
      };
      const retryResponse = await fetch(`${SHIPPO_API_BASE}/shipments`, {
        method: "POST",
        headers: {
          Authorization: `ShippoToken ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(retryData),
      });
      if (retryResponse.ok) {
        const retryShipment = (await retryResponse.json()) as any;
        console.log(
          `[Shippo] Retry shipment: ${retryShipment.object_id}, rates: ${Array.isArray(retryShipment.rates) ? retryShipment.rates.length : 0}`,
        );
        rates = extractRates(retryShipment);
      }
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
