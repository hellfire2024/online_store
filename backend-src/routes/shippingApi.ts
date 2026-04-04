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
    parsed = JSON.parse(rows[0].settings);
  } catch {
    parsed = {};
  }

  const configuredCarriers = parsed?.shippingCarriers || {};
  const easypostKey = String(configuredCarriers?.easypost?.apiKey || "").trim();
  const shippoKey = String(configuredCarriers?.shippo?.apiKey || "").trim();
  const shipstationKey = String(
    configuredCarriers?.shipstation?.apiKey || "",
  ).trim();
  const shipstationSecret = String(
    configuredCarriers?.shipstation?.apiSecret || "",
  ).trim();

  const easypostEnabled =
    Boolean(configuredCarriers?.easypost?.enabled) && Boolean(easypostKey);
  const shippoEnabled =
    Boolean(configuredCarriers?.shippo?.enabled) && Boolean(shippoKey);
  const shipstationEnabled =
    Boolean(configuredCarriers?.shipstation?.enabled) &&
    Boolean(shipstationKey && shipstationSecret);

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

    // Validate required fields
    if (
      !rateRequest.toAddress ||
      !rateRequest.fromAddress ||
      !rateRequest.parcel
    ) {
      res.status(400).json({
        error: "Missing required fields: toAddress, fromAddress, parcel",
      });
      return;
    }

    // Enable test mode if explicitly requested or if no carriers are enabled
    const testMode =
      Boolean(rateRequest.testMode) || !config.enabledCarriers.length;

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

    // Get rates from each enabled carrier
    const carriersToTry =
      Array.isArray(rateRequest.carriers) && rateRequest.carriers.length > 0
        ? rateRequest.carriers
        : config.enabledCarriers;

    if (carriersToTry.includes("easypost")) {
      try {
        const easypostRates = await easypostService.getShippingRates(
          rateRequest,
          config.easypost.apiKey,
        );
        allRates.push(...easypostRates);
      } catch (error) {
        errors.easypost =
          error instanceof Error ? error.message : "Unknown error";
        console.error("EasyPost error:", error);
      }
    }

    if (carriersToTry.includes("shippo")) {
      try {
        const shippoRates = await shippoService.getShippingRates(
          rateRequest,
          config.shippo.apiKey,
        );
        allRates.push(...shippoRates);
      } catch (error) {
        errors.shippo =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Shippo error:", error);
      }
    }

    if (carriersToTry.includes("shipstation")) {
      try {
        const shipstationRates = await shipstationService.getShippingRates(
          rateRequest,
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

    // Return rates even if some carriers fail
    res.json({
      rates: allRates,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      unavailable: allRates.length === 0,
      message:
        allRates.length === 0
          ? "Shipping options are not available at this time. Please submit an approval request for sales-team follow-up."
          : undefined,
    });
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

    let label;

    switch (resolvedCarrier) {
      case "easypost":
        label = await easypostService.createLabel(
          shipmentId,
          rateId,
          "PDF",
          config.easypost.apiKey,
        );
        break;
      case "shippo":
        label = await shippoService.createLabel(
          shipmentId,
          rateId,
          "PDF",
          config.shippo.apiKey,
        );
        break;
      case "shipstation":
        if (!req.body.carrierCode || !req.body.serviceCode) {
          const rateIdParts = String(rateId).split("-");
          if (rateIdParts.length > 1) {
            req.body.carrierCode = req.body.carrierCode || rateIdParts[0];
            req.body.serviceCode =
              req.body.serviceCode || rateIdParts.slice(1).join("-");
          }
        }

        if (!req.body.carrierCode || !req.body.serviceCode) {
          res.status(400).json({
            error: "ShipStation requires carrierCode and serviceCode",
          });
          return;
        }
        {
          const toAddress = req.body.toAddress;
          if (!toAddress) {
            res.status(400).json({ error: "ShipStation requires toAddress" });
            return;
          }
          const mergedShipmentData = {
            toAddress,
            fromAddress: config.fromAddress,
            parcel: req.body.parcel || {
              weight: 1,
              length: 12,
              width: 9,
              height: 3,
            },
          };
          label = await shipstationService.createLabel(
            mergedShipmentData,
            req.body.carrierCode,
            req.body.serviceCode,
            config.shipstation.apiKey,
            config.shipstation.apiSecret,
          );
        }
        break;
      default:
        res.status(400).json({
          error: `Unknown carrier: ${carrier}`,
        });
        return;
    }

    // Normalize the label response across all carriers
    let labelUrl: string | null = null;
    let trackingNumber: string | null = null;

    if (resolvedCarrier === "easypost") {
      labelUrl = label?.postage_label?.label_url || label?.label_url || null;
      trackingNumber = label?.tracking_code || null;
    } else if (resolvedCarrier === "shippo") {
      labelUrl = label?.label_url || null;
      trackingNumber = label?.tracking_number || null;
    } else if (resolvedCarrier === "shipstation") {
      labelUrl = label?.labelUrl || null;
      trackingNumber = label?.trackingNumber || null;
    }

    res.json({ labelUrl, trackingNumber, rawLabel: label });
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
