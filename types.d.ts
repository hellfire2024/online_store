export interface ShippingAddress {
    firstName: string;
    lastName: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    email: string;
    phone: string;
}
export interface ShippingPackage {
    weight: number;
    length: number;
    width: number;
    height: number;
}
export interface ShippingRate {
    id: string;
    carrier: 'easypost' | 'shippo' | 'shipstation';
    service: string;
    serviceName: string;
    rate: number;
    estimatedDays: number;
    estimatedDelivery?: string;
}
export interface ShippingRateRequest {
    toAddress: ShippingAddress;
    fromAddress: ShippingAddress;
    parcel: ShippingPackage;
    carriers?: ('easypost' | 'shippo' | 'shipstation')[];
}
//# sourceMappingURL=types.d.ts.map