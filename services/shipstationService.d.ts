import { ShippingRate, ShippingRateRequest } from '../types.js';
export declare function getShippingRates(request: ShippingRateRequest): Promise<ShippingRate[]>;
export declare function createLabel(shipmentData: any, carrierCode: string, serviceCode: string): Promise<any>;
export declare function trackShipment(trackingId: string, carrierCode?: string): Promise<any>;
//# sourceMappingURL=shipstationService.d.ts.map