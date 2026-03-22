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
  weight: number; // in pounds
  length: number; // in inches
  width: number; // in inches
  height: number; // in inches
}

export interface ShippingRate {
  id: string;
  shipmentId?: string; // EasyPost/Shippo shipment ID needed for label creation
  carrier: "easypost" | "shippo" | "shipstation";
  service: string;
  serviceName: string;
  rate: number; // in cents
  estimatedDays: number;
  estimatedDelivery?: string;
}

export interface ShippingRateRequest {
  toAddress: ShippingAddress;
  fromAddress: ShippingAddress;
  parcel: ShippingPackage;
  carriers?: ("easypost" | "shippo" | "shipstation")[];
}
