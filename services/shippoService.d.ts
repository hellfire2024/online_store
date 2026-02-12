import { ShippingRate, ShippingRateRequest } from '../types.js';
export declare function getShippingRates(request: ShippingRateRequest): Promise<ShippingRate[]>;
export declare function createLabel(shipmentId: string, rateId: string, labelFormat?: string): Promise<any>;
export declare function trackShipment(trackingId: string, carrier?: string): Promise<any>;
//# sourceMappingURL=shippoService.d.ts.map