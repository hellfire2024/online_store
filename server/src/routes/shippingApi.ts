import express, { Router, Request, Response } from 'express';
import * as easypostService from '../services/easypostService';
import * as shippoService from '../services/shippoService';
import * as shipstationService from '../services/shipstationService';
import { ShippingRateRequest, ShippingRate } from '../../types';

const router = Router();

/**
 * POST /api/shipping/rates
 * Get shipping rates from enabled carriers
 * Body: ShippingRateRequest
 * Returns: ShippingRate[]
 */
router.post('/rates', async (req: Request, res: Response) => {
  try {
    const rateRequest: ShippingRateRequest = req.body;

    // Validate required fields
    if (
      !rateRequest.toAddress ||
      !rateRequest.fromAddress ||
      !rateRequest.parcel
    ) {
      return res.status(400).json({
        error: 'Missing required fields: toAddress, fromAddress, parcel',
      });
    }

    const allRates: ShippingRate[] = [];
    const errors: { [key: string]: string } = {};

    // Get rates from each enabled carrier
    const carriersToTry = rateRequest.carriers || ['easypost', 'shippo', 'shipstation'];

    if (carriersToTry.includes('easypost')) {
      try {
        const easypostRates = await easypostService.getShippingRates(rateRequest);
        allRates.push(...easypostRates);
      } catch (error) {
        errors.easypost = error instanceof Error ? error.message : 'Unknown error';
        console.error('EasyPost error:', error);
      }
    }

    if (carriersToTry.includes('shippo')) {
      try {
        const shippoRates = await shippoService.getShippingRates(rateRequest);
        allRates.push(...shippoRates);
      } catch (error) {
        errors.shippo = error instanceof Error ? error.message : 'Unknown error';
        console.error('Shippo error:', error);
      }
    }

    if (carriersToTry.includes('shipstation')) {
      try {
        const shipstationRates = await shipstationService.getShippingRates(rateRequest);
        allRates.push(...shipstationRates);
      } catch (error) {
        errors.shipstation = error instanceof Error ? error.message : 'Unknown error';
        console.error('ShipStation error:', error);
      }
    }

    // Return rates even if some carriers fail
    res.json({
      rates: allRates,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Shipping rates error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get shipping rates',
    });
  }
});

/**
 * POST /api/shipping/label
 * Create a shipping label
 * Body: { carrier, rateId, shipmentId, shipmentData }
 * Returns: Label information
 */
router.post('/label', async (req: Request, res: Response) => {
  try {
    const { carrier, rateId, shipmentId, shipmentData } = req.body;

    if (!carrier || !rateId) {
      return res.status(400).json({
        error: 'Missing required fields: carrier, rateId',
      });
    }

    let label;

    switch (carrier) {
      case 'easypost':
        label = await easypostService.createLabel(shipmentId, rateId);
        break;
      case 'shippo':
        label = await shippoService.createLabel(shipmentId, rateId);
        break;
      case 'shipstation':
        if (!shipmentData) {
          return res.status(400).json({
            error: 'ShipStation requires shipmentData',
          });
        }
        label = await shipstationService.createLabel(
          shipmentData,
          shipmentData.carrierCode,
          shipmentData.serviceCode
        );
        break;
      default:
        return res.status(400).json({
          error: `Unknown carrier: ${carrier}`,
        });
    }

    res.json(label);
  } catch (error) {
    console.error('Label creation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create label',
    });
  }
});

/**
 * GET /api/shipping/track/:trackingId
 * Track a shipment
 * Query params: carrier (optional), carrierCode (optional)
 * Returns: Tracking information
 */
router.get('/track/:trackingId', async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params;
    const { carrier, carrierCode } = req.query;

    if (!trackingId) {
      return res.status(400).json({
        error: 'Tracking ID is required',
      });
    }

    let tracking;

    if (carrier === 'easypost') {
      tracking = await easypostService.trackShipment(trackingId as string);
    } else if (carrier === 'shippo') {
      tracking = await shippoService.trackShipment(trackingId as string, carrierCode as string);
    } else if (carrier === 'shipstation') {
      tracking = await shipstationService.trackShipment(trackingId as string, carrierCode as string);
    } else {
      return res.status(400).json({
        error: 'Unknown or missing carrier',
      });
    }

    res.json(tracking);
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to track shipment',
    });
  }
});

export default router;
