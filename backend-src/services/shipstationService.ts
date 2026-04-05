import {
  ShippingRate,
  ShippingRateRequest,
  ShippingAddress,
} from "../types.js";

const SHIPSTATION_API_BASE = "https://ssapi.shipstation.com";
const SHIPSTATION_API_BASE_V2 = "https://api.shipstation.com";

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

function getApiKey(apiKeyOverride?: string): string {
  const apiKey = (apiKeyOverride || process.env.SHIPSTATION_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("ShipStation API key not configured");
  }
  return apiKey;
}

function hasLegacySecret(apiSecretOverride?: string): boolean {
  return Boolean((apiSecretOverride || process.env.SHIPSTATION_API_SECRET || "").trim());
}

function getV2Headers(apiKeyOverride?: string): Record<string, string> {
  return {
    "API-Key": getApiKey(apiKeyOverride),
    "Content-Type": "application/json",
  };
}

async function readResponseBody(response: Response): Promise<{
  payload: any;
  rawText: string;
}> {
  const rawText = await response.text();
  if (!rawText) {
    return { payload: null, rawText: "" };
  }

  try {
    return { payload: JSON.parse(rawText), rawText };
  } catch {
    return { payload: null, rawText };
  }
}

function extractShipStationErrorMessage(
  payload: any,
  rawText: string,
  fallback: string,
): string {
  if (payload?.message) {
    return String(payload.message);
  }
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    const firstError = payload.errors[0];
    if (typeof firstError === "string") {
      return firstError;
    }
    if (firstError?.message) {
      return String(firstError.message);
    }
  }
  if (rawText) {
    const compact = rawText.replace(/\s+/g, " ").trim();
    return compact.slice(0, 220);
  }
  return fallback;
}

function mapV2Address(address: ShippingAddress) {
  return {
    name: `${address.firstName} ${address.lastName}`.trim(),
    phone: address.phone || "",
    company_name: "",
    address_line1: address.street1,
    address_line2: address.street2 || "",
    city_locality: address.city,
    state_province: address.state,
    postal_code: address.zip,
    country_code: "US",
    address_residential_indicator: "unknown",
  };
}

async function getCarrierIdsForCodes(
  carrierCodes: string[],
  apiKeyOverride?: string,
): Promise<string[]> {
  const response = await fetch(`${SHIPSTATION_API_BASE_V2}/v2/carriers`, {
    headers: {
      "API-Key": getApiKey(apiKeyOverride),
    },
  });

  const { payload, rawText } = await readResponseBody(response);
  if (!response.ok) {
    throw new Error(
      extractShipStationErrorMessage(
        payload,
        rawText,
        `ShipStation carriers error: ${response.status}`,
      ),
    );
  }

  const carriers = Array.isArray(payload?.carriers) ? payload.carriers : [];
  const wanted = new Set(carrierCodes.map((code) => code.toLowerCase()));

  return carriers
    .filter((carrier: any) => {
      const code = String(carrier?.carrier_code || "").toLowerCase();
      return Boolean(code) && wanted.has(code);
    })
    .map((carrier: any) => String(carrier?.carrier_id || "").trim())
    .filter(Boolean);
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
    // Legacy key+secret integrations keep using v1 endpoints.
    if (hasLegacySecret(apiSecretOverride)) {
      const rates: ShippingRate[] = [];

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

          const { payload, rawText } = await readResponseBody(response);
          if (!response.ok) {
            throw new Error(
              extractShipStationErrorMessage(
                payload,
                rawText,
                `ShipStation error: ${response.status}`,
              ),
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
                rate: Math.round(parseFloat(rate.shipmentCost) * 100),
                estimatedDays: rate.deliveryDays || 0,
              });
            });
          }
        } catch (carrierError) {
          console.warn(
            `Failed to get rates for ${shipstationCarrier}:`,
            carrierError,
          );
        }
      }

      return rates;
    }

    // Key-only ShipStation accounts use v2 endpoints.
    const carrierCodes = ["usps", "fedex", "ups", "dhl"];
    const carrierIds = await getCarrierIdsForCodes(carrierCodes, apiKeyOverride);
    if (!carrierIds.length) {
      throw new Error(
        "No matching connected ShipStation carriers found. Connect USPS/UPS/FedEx/DHL in ShipStation first.",
      );
    }

    const requestBody = {
      rate_options: {
        carrier_ids: carrierIds,
      },
      shipment: {
        validate_address: "no_validation",
        ship_to: mapV2Address(request.toAddress),
        ship_from: mapV2Address(request.fromAddress),
        packages: [
          {
            package_code: "package",
            weight: {
              value: request.parcel.weight,
              unit: "pound",
            },
            dimensions: {
              unit: "inch",
              length: request.parcel.length,
              width: request.parcel.width,
              height: request.parcel.height,
            },
          },
        ],
      },
    };

    const response = await fetch(`${SHIPSTATION_API_BASE_V2}/v2/rates`, {
      method: "POST",
      headers: getV2Headers(apiKeyOverride),
      body: JSON.stringify(requestBody),
    });

    const { payload, rawText } = await readResponseBody(response);
    if (!response.ok) {
      throw new Error(
        extractShipStationErrorMessage(
          payload,
          rawText,
          `ShipStation rates error: ${response.status}`,
        ),
      );
    }

    const v2Rates = Array.isArray(payload?.rate_response?.rates)
      ? payload.rate_response.rates
      : [];

    const rates: ShippingRate[] = v2Rates.map((rate: any) => {
      const shippingAmount = Number(rate?.shipping_amount?.amount || 0);
      const insuranceAmount = Number(rate?.insurance_amount?.amount || 0);
      const confirmationAmount = Number(rate?.confirmation_amount?.amount || 0);
      const otherAmount = Number(rate?.other_amount?.amount || 0);
      const totalAmount =
        shippingAmount + insuranceAmount + confirmationAmount + otherAmount;

      const rawDays = rate?.delivery_days ?? rate?.carrier_delivery_days ?? 0;
      const estimatedDays = Number.isFinite(Number(rawDays))
        ? Number(rawDays)
        : 0;

      return {
        id: String(rate?.rate_id || `${rate?.carrier_code || "shipstation"}-${rate?.service_code || "unknown"}`),
        carrier: "shipstation",
        service: String(rate?.service_code || "unknown"),
        serviceName: String(
          rate?.service_type || rate?.carrier_friendly_name || rate?.service_code || "ShipStation Service",
        ),
        rate: Math.round(totalAmount * 100),
        estimatedDays,
      };
    });

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

    const { payload, rawText } = await readResponseBody(response);
    if (!response.ok) {
      throw new Error(
        extractShipStationErrorMessage(
          payload,
          rawText,
          `ShipStation error: ${response.status}`,
        ),
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

    const { payload, rawText } = await readResponseBody(response);
    if (!response.ok) {
      throw new Error(
        extractShipStationErrorMessage(
          payload,
          rawText,
          `ShipStation error: ${response.status}`,
        ),
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
