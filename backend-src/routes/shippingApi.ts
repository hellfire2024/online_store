import { Router, Request, Response } from "express";
import { RowDataPacket } from "mysql2";
import { pool } from "../db/connection.js";
import * as easypostService from "../services/easypostService.js";
import * as shippoService from "../services/shippoService.js";
import * as shipstationService from "../services/shipstationService.js";
import { ShippingRateRequest, ShippingRate } from "../types.js";

const router = Router();

interface SettingsRow extends RowDataPacket {
  settings: string | null;
}

const normalizeEnabledFlag = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return null;
};

const isAddressComplete = (address: any): boolean =>
  Boolean(address?.street1) &&
  Boolean(address?.city) &&
  Boolean(address?.state) &&
  Boolean(address?.zip);

const isPOBoxAddress = (value: unknown): boolean => {
  const text = String(value || "").toLowerCase();
  return /\b(p\.?\s*o\.?\s*box|post\s+office\s+box)\b/.test(text);
};

const readShippingConfig = async () => {
  const [rows] = await pool.query<SettingsRow[]>(
    "SELECT settings FROM site_settings WHERE id = 1 LIMIT 1",
  );

  if (!rows.length || !rows[0].settings) {
    return {
      easypost: { enabled: false, apiKey: "" },
      shippo: { enabled: false, apiKey: "" },
      shipstation: { enabled: false, apiKey: "", apiSecret: "" },
      fromAddress: {},
      enabledCarriers: [],
    };
  }

  let parsed: any = {};
  try {
    const raw = rows[0].settings;
    // mysql2 returns JSON columns as already-parsed objects; only JSON.parse if it's a string
    parsed = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
  } catch {
    parsed = {};
  }

  const configuredCarriers = parsed?.shippingCarriers || {};

  // Backward-compatible key lookup: support both current and legacy settings shapes.
  const easypostKey = String(
    configuredCarriers?.easypost?.apiKey ||
      parsed?.shippingApiKeys?.easypost ||
      "",
  ).trim();
  const shippoKey = String(
    configuredCarriers?.shippo?.apiKey || parsed?.shippingApiKeys?.shippo || "",
  ).trim();
  const shipstationKey = String(
    configuredCarriers?.shipstation?.apiKey ||
      parsed?.shippingApiKeys?.shipstation ||
      "",
  ).trim();
  const shipstationSecret = String(
    configuredCarriers?.shipstation?.apiSecret ||
      parsed?.shippingApiKeys?.shipstationSecret ||
      "",
  ).trim();

  const defaultCarrier = String(parsed?.defaultShippingCarrier || "").trim();
  const shippingProvider = String(parsed?.shippingProvider || "").trim();

  const easypostEnabledSetting = normalizeEnabledFlag(
    configuredCarriers?.easypost?.enabled,
  );
  const shippoEnabledSetting = normalizeEnabledFlag(
    configuredCarriers?.shippo?.enabled,
  );
  const shipstationEnabledSetting = normalizeEnabledFlag(
    configuredCarriers?.shipstation?.enabled,
  );

  const easypostEnabled =
    Boolean(easypostKey) &&
    (easypostEnabledSetting !== null
      ? easypostEnabledSetting
      : defaultCarrier === "easypost" || shippingProvider === "easypost");
  const shippoEnabled =
    Boolean(shippoKey) &&
    (shippoEnabledSetting !== null
      ? shippoEnabledSetting
      : defaultCarrier === "shippo" || shippingProvider === "shippo");
  const shipstationEnabled =
    Boolean(shipstationKey && shipstationSecret) &&
    (shipstationEnabledSetting !== null
      ? shipstationEnabledSetting
      : defaultCarrier === "shipstation" || shippingProvider === "shipstation");

  const enabledCarriers = [
    easypostEnabled ? "easypost" : null,
    shippoEnabled ? "shippo" : null,
    shipstationEnabled ? "shipstation" : null,
  ].filter(Boolean) as string[];

  return {
    easypost: {
      enabled: easypostEnabled,
      apiKey: easypostKey,
    },
    shippo: {
      enabled: shippoEnabled,
      apiKey: shippoKey,
    },
    shipstation: {
      enabled: shipstationEnabled,
      apiKey: shipstationKey,
      apiSecret: shipstationSecret,
    },
    fromAddress: parsed?.fromAddress || {},
    enabledCarriers,
  };
};

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const config = await readShippingConfig();
    const fromAddressReady =
      Boolean(config.fromAddress?.street1) &&
      Boolean(config.fromAddress?.city) &&
      Boolean(config.fromAddress?.state) &&
      Boolean(config.fromAddress?.zip);

    const carrierStatuses = [
      {
        carrier: "easypost",
        enabled: config.easypost.enabled,
        configured: Boolean(config.easypost.apiKey),
      },
      {
        carrier: "shippo",
        enabled: config.shippo.enabled,
        configured: Boolean(config.shippo.apiKey),
      },
      {
        carrier: "shipstation",
        enabled: config.shipstation.enabled,
        configured: Boolean(
          config.shipstation.apiKey && config.shipstation.apiSecret,
        ),
      },
    ];

    const available = carrierStatuses.some(
      (carrier) => carrier.enabled && carrier.configured,
    );

    res.json({
      available: available && fromAddressReady,
      fromAddressReady,
      carriers: carrierStatuses,
      enabledCarriers: config.enabledCarriers,
      reason: !available
        ? "No shipping carrier is fully configured"
        : !fromAddressReady
          ? "Sender address is incomplete"
          : null,
    });
    return;
  } catch (error) {
    console.error("Shipping status error:", error);
    res.status(500).json({ error: "Failed to determine shipping status" });
    return;
  }
});

/**
 * POST /api/shipping/rates
 * Get shipping rates from enabled carriers
 * Body: ShippingRateRequest
 * Returns: ShippingRate[]
 */
router.post("/rates", async (req: Request, res: Response) => {
  try {
    const rateRequest: ShippingRateRequest & { testMode?: boolean } = req.body;
    const config = await readShippingConfig();

    const normalizedRateRequest: ShippingRateRequest & { testMode?: boolean } =
      {
        ...rateRequest,
        fromAddress: isAddressComplete(rateRequest?.fromAddress)
          ? rateRequest.fromAddress
          : (config.fromAddress as any),
      };

    // Validate required fields
    if (
      !normalizedRateRequest.toAddress ||
      !normalizedRateRequest.fromAddress ||
      !normalizedRateRequest.parcel
    ) {
      res.status(400).json({
        error: "Missing required fields: toAddress, fromAddress, parcel",
      });
      return;
    }

    // Only allow mock rates when explicitly requested.
    const testMode = Boolean(normalizedRateRequest.testMode);

    const requestedCarriers = Array.isArray(normalizedRateRequest.carriers)
      ? normalizedRateRequest.carriers.filter((carrier) =>
          ["easypost", "shippo", "shipstation"].includes(carrier),
        )
      : [];

    const carriersToTry =
      requestedCarriers.length > 0
        ? requestedCarriers
        : (config.enabledCarriers as Array<
            "easypost" | "shippo" | "shipstation"
          >);

    console.log(
      `[Shipping] /rates request: testMode=${testMode}, requested=${requestedCarriers.join(",") || "(none)"}, enabled=${config.enabledCarriers.join(",") || "(none)"}, trying=${carriersToTry.join(",") || "(none)"}`,
    );

    if (!testMode && !carriersToTry.length) {
      res.status(400).json({
        error:
          "No shipping providers are enabled/configured. Configure a provider in Settings > Shipping.",
      });
      return;
    }

    if (testMode) {
      // Return representative mock rates across multiple carrier networks.
      // This avoids showing USPS-only options when real carrier APIs are unavailable.
      const mockRates = [
        // EasyPost (mixed underlying carriers)
        {
          id: "ep-usps-priority",
          shipmentId: "ep-shipment-1",
          carrier: "easypost",
          service: "Priority",
          serviceName: "USPS Priority Mail",
          rate: 1299,
          estimatedDays: 3,
          estimatedDelivery: null,
        },
        {
          id: "ep-ups-ground",
          shipmentId: "ep-shipment-1",
          carrier: "easypost",
          service: "UPSGround",
          serviceName: "UPS Ground",
          rate: 1699,
          estimatedDays: 4,
          estimatedDelivery: null,
        },
        {
          id: "ep-fedex-2day",
          shipmentId: "ep-shipment-1",
          carrier: "easypost",
          service: "FedEx2Day",
          serviceName: "FedEx 2-Day",
          rate: 2399,
          estimatedDays: 2,
          estimatedDelivery: null,
        },
        // Shippo (mixed providers)
        {
          id: "sp-usps-priority",
          shipmentId: "sp-shipment-1",
          carrier: "shippo",
          service: "Priority",
          serviceName: "USPS Priority Mail",
          rate: 1399,
          estimatedDays: 3,
          estimatedDelivery: null,
        },
        {
          id: "sp-ups-ground",
          shipmentId: "sp-shipment-1",
          carrier: "shippo",
          service: "UPS_GROUND",
          serviceName: "UPS Ground",
          rate: 1749,
          estimatedDays: 4,
          estimatedDelivery: null,
        },
        {
          id: "sp-fedex-2day",
          shipmentId: "sp-shipment-1",
          carrier: "shippo",
          service: "FEDEX_2_DAY",
          serviceName: "FedEx 2-Day",
          rate: 2449,
          estimatedDays: 2,
          estimatedDelivery: null,
        },
        // ShipStation
        {
          id: "ss-usps-priority",
          shipmentId: "ss-shipment-1",
          carrier: "shipstation",
          service: "usps_priority_mail",
          serviceName: "USPS Priority Mail",
          rate: 1349,
          estimatedDays: 3,
          estimatedDelivery: null,
        },
        {
          id: "ss-ups-ground",
          shipmentId: "ss-shipment-1",
          carrier: "shipstation",
          service: "ups_ground",
          serviceName: "UPS Ground",
          rate: 1799,
          estimatedDays: 4,
          estimatedDelivery: null,
        },
        {
          id: "ss-fedex-home-delivery",
          shipmentId: "ss-shipment-1",
          carrier: "shipstation",
          service: "fedex_home_delivery",
          serviceName: "FedEx Home Delivery",
          rate: 2199,
          estimatedDays: 2,
          estimatedDelivery: null,
        },
        {
          id: "ss-dhl-express",
          shipmentId: "ss-shipment-1",
          carrier: "shipstation",
          service: "dhl_express_worldwide",
          serviceName: "DHL Express Worldwide",
          rate: 2899,
          estimatedDays: 2,
          estimatedDelivery: null,
        },
      ];
      res.json({ rates: mockRates, unavailable: false, testMode: true });
      return;
    }

    const allRates: ShippingRate[] = [];
    const errors: { [key: string]: string } = {};
    const warnings: string[] = [];

    const fromIsPOBox = isPOBoxAddress(
      normalizedRateRequest?.fromAddress?.street1,
    );
    const toIsPOBox = isPOBoxAddress(normalizedRateRequest?.toAddress?.street1);
    if (fromIsPOBox || toIsPOBox) {
      warnings.push(
        "PO Box addresses can limit available services to USPS only. Use a physical street address to get full UPS/FedEx/DHL rates.",
      );
    }

    // Get rates from requested carriers, or from enabled carriers when not specified.

    if (carriersToTry.includes("easypost")) {
      if (!config.easypost.apiKey) {
        errors.easypost = "EasyPost API key not configured";
      } else {
        try {
          const easypostRates = await easypostService.getShippingRates(
            normalizedRateRequest,
            config.easypost.apiKey,
          );
          allRates.push(...easypostRates);
        } catch (error) {
          errors.easypost =
            error instanceof Error ? error.message : "Unknown error";
          console.error("EasyPost error:", error);
        }
      }
    }

    if (carriersToTry.includes("shippo")) {
      if (!config.shippo.apiKey) {
        errors.shippo = "Shippo API key not configured";
      } else {
        try {
          const shippoRates = await shippoService.getShippingRates(
            normalizedRateRequest,
            config.shippo.apiKey,
          );
          allRates.push(...shippoRates);
        } catch (error) {
          errors.shippo =
            error instanceof Error ? error.message : "Unknown error";
          console.error("Shippo error:", error);
        }
      }
    }

    if (carriersToTry.includes("shipstation")) {
      if (!config.shipstation.apiKey || !config.shipstation.apiSecret) {
        errors.shipstation = "ShipStation API credentials not configured";
      } else {
        try {
          const shipstationRates = await shipstationService.getShippingRates(
            normalizedRateRequest,
            config.shipstation.apiKey,
            config.shipstation.apiSecret,
          );
          allRates.push(...shipstationRates);
        } catch (error) {
          errors.shipstation =
            error instanceof Error ? error.message : "Unknown error";
          console.error("ShipStation error:", error);
        }
      }
    }

    // Return rates even if some carriers fail
    res.json({
      rates: allRates,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      unavailable: allRates.length === 0,
      message:
        allRates.length === 0
          ? "Shipping options are not available at this time. Please submit an approval request for sales-team follow-up."
          : undefined,
    });
    console.log(
      `[Shipping] /rates result: rates=${allRates.length}, errors=${Object.keys(errors).length}`,
    );
    return;
  } catch (error) {
    console.error("Shipping rates error:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to get shipping rates",
    });
    return;
  }
});

/**
 * POST /api/shipping/label
 * Create a shipping label
 * Body: { carrier, rateId, shipmentId, shipmentData }
 * Returns: Label information
 */
router.post("/label", async (req: Request, res: Response) => {
  try {
    const config = await readShippingConfig();
    const { carrier, rateId, shipmentId } = req.body;
    const normalizedCarrier = String(carrier || "").toLowerCase();
    const resolvedCarrier = ["ups", "fedex", "usps", "dhl"].includes(
      normalizedCarrier,
    )
      ? "shipstation"
      : normalizedCarrier;

    if (!resolvedCarrier || !rateId) {
      res.status(400).json({
        error: "Missing required fields: carrier, rateId",
      });
      return;
    }

    const configuredProviders = [
      config.easypost.enabled ? "easypost" : null,
      config.shippo.enabled ? "shippo" : null,
      config.shipstation.enabled ? "shipstation" : null,
    ].filter(Boolean) as Array<"easypost" | "shippo" | "shipstation">;

    if (!configuredProviders.length) {
      res.status(400).json({
        error: "No shipping provider is configured for label generation",
      });
      return;
    }

    const inferProviderFromPayload = ():
      | "easypost"
      | "shippo"
      | "shipstation"
      | null => {
      const inferredShipmentId = String(shipmentId || "").toLowerCase();
      if (
        inferredShipmentId.startsWith("ep-") ||
        inferredShipmentId.startsWith("shp_")
      ) {
        return "easypost";
      }
      if (inferredShipmentId.startsWith("sp-")) {
        return "shippo";
      }
      if (inferredShipmentId.startsWith("ss-")) {
        return "shipstation";
      }

      const ratePrefix = String(rateId || "")
        .split("-")[0]
        .toLowerCase();
      if (["ups", "fedex", "usps", "dhl"].includes(ratePrefix)) {
        return "shipstation";
      }
      return null;
    };

    let finalCarrier = resolvedCarrier as "easypost" | "shippo" | "shipstation";

    if (!configuredProviders.includes(finalCarrier)) {
      const inferred = inferProviderFromPayload();
      if (inferred && configuredProviders.includes(inferred)) {
        finalCarrier = inferred;
      } else {
        finalCarrier = configuredProviders[0];
      }
    }

    const attemptOrder = [
      finalCarrier,
      ...configuredProviders.filter((provider) => provider !== finalCarrier),
    ] as Array<"easypost" | "shippo" | "shipstation">;

    const toAddress = req.body.toAddress;
    const parcel = req.body.parcel || {
      weight: 1,
      length: 12,
      width: 9,
      height: 3,
    };

    if (!req.body.carrierCode || !req.body.serviceCode) {
      const rateIdParts = String(rateId).split("-");
      if (rateIdParts.length > 1) {
        req.body.carrierCode = req.body.carrierCode || rateIdParts[0];
        req.body.serviceCode =
          req.body.serviceCode || rateIdParts.slice(1).join("-");
      }
    }

    let label;
    let usedCarrier: "easypost" | "shippo" | "shipstation" | null = null;
    const attemptErrors: string[] = [];

    for (const candidate of attemptOrder) {
      try {
        if (candidate === "easypost") {
          if (!config.easypost.apiKey) {
            attemptErrors.push("EasyPost API key not configured");
            continue;
          }
          if (!shipmentId) {
            attemptErrors.push("Missing shipmentId required for EasyPost");
            continue;
          }
          label = await easypostService.createLabel(
            shipmentId,
            rateId,
            "PDF",
            config.easypost.apiKey,
          );
          usedCarrier = "easypost";
          break;
        }

        if (candidate === "shippo") {
          if (!config.shippo.apiKey) {
            attemptErrors.push("Shippo API key not configured");
            continue;
          }
          if (!shipmentId) {
            attemptErrors.push("Missing shipmentId required for Shippo");
            continue;
          }
          label = await shippoService.createLabel(
            shipmentId,
            rateId,
            "PDF",
            config.shippo.apiKey,
          );
          usedCarrier = "shippo";
          break;
        }

        if (candidate === "shipstation") {
          if (!config.shipstation.apiKey || !config.shipstation.apiSecret) {
            attemptErrors.push("ShipStation API credentials not configured");
            continue;
          }
          if (!req.body.carrierCode || !req.body.serviceCode) {
            attemptErrors.push(
              "ShipStation requires carrierCode and serviceCode",
            );
            continue;
          }
          if (!toAddress) {
            attemptErrors.push("ShipStation requires toAddress");
            continue;
          }

          const mergedShipmentData = {
            toAddress,
            fromAddress: config.fromAddress,
            parcel,
          };

          label = await shipstationService.createLabel(
            mergedShipmentData,
            req.body.carrierCode,
            req.body.serviceCode,
            config.shipstation.apiKey,
            config.shipstation.apiSecret,
          );
          usedCarrier = "shipstation";
          break;
        }
      } catch (candidateError) {
        attemptErrors.push(
          candidateError instanceof Error
            ? `${candidate}: ${candidateError.message}`
            : `${candidate}: label creation failed`,
        );
      }
    }

    if (!label || !usedCarrier) {
      res.status(400).json({
        error:
          attemptErrors[attemptErrors.length - 1] ||
          "Unable to create shipping label with configured providers",
      });
      return;
    }

    // Normalize the label response across all carriers
    let labelUrl: string | null = null;
    let trackingNumber: string | null = null;

    if (usedCarrier === "easypost") {
      labelUrl = label?.postage_label?.label_url || label?.label_url || null;
      trackingNumber = label?.tracking_code || null;
    } else if (usedCarrier === "shippo") {
      labelUrl = label?.label_url || null;
      trackingNumber = label?.tracking_number || null;
    } else if (usedCarrier === "shipstation") {
      labelUrl = label?.labelUrl || null;
      trackingNumber = label?.trackingNumber || null;
    }

    res.json({
      labelUrl,
      trackingNumber,
      rawLabel: label,
      carrier: usedCarrier,
    });
    return;
  } catch (error) {
    console.error("Label creation error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create label",
    });
    return;
  }
});

/**
 * GET /api/shipping/track/:trackingId
 * Track a shipment
 * Query params: carrier (optional), carrierCode (optional)
 * Returns: Tracking information
 */
router.get("/track/:trackingId", async (req: Request, res: Response) => {
  try {
    const config = await readShippingConfig();
    const { trackingId } = req.params;
    const { carrier, carrierCode } = req.query;

    if (!trackingId) {
      res.status(400).json({
        error: "Tracking ID is required",
      });
      return;
    }

    let tracking;

    if (carrier === "easypost") {
      tracking = await easypostService.trackShipment(
        trackingId as string,
        config.easypost.apiKey,
      );
    } else if (carrier === "shippo") {
      tracking = await shippoService.trackShipment(
        trackingId as string,
        carrierCode as string,
        config.shippo.apiKey,
      );
    } else if (carrier === "shipstation") {
      tracking = await shipstationService.trackShipment(
        trackingId as string,
        carrierCode as string,
        config.shipstation.apiKey,
        config.shipstation.apiSecret,
      );
    } else {
      res.status(400).json({
        error: "Unknown or missing carrier",
      });
      return;
    }

    res.json(tracking);
    return;
  } catch (error) {
    console.error("Tracking error:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to track shipment",
    });
    return;
  }
});

export default router;
