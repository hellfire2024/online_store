const EASYPOST_API_BASE = 'https://api.easypost.com/v2';
const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY;
// Helper to format address for EasyPost
function formatAddressForEasyPost(address) {
    return {
        name: `${address.firstName} ${address.lastName}`,
        street1: address.street1,
        street2: address.street2 || '',
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
        email: address.email,
        phone: address.phone,
    };
}
// Helper to format parcel for EasyPost
function formatParcelForEasyPost(parcel) {
    return {
        length: parcel.length,
        width: parcel.width,
        height: parcel.height,
        weight: parcel.weight,
    };
}
// Map EasyPost service names to human-readable names
const SERVICE_NAME_MAP = {
    'First': 'USPS First Class',
    'Priority': 'USPS Priority Mail',
    'Express': 'USPS Express Mail',
    'ParcelSelect': 'USPS Parcel Select',
    'FedExHomeDelivery': 'FedEx Home Delivery',
    'FedEx2Day': 'FedEx 2-Day',
    'FedExOvernight': 'FedEx Overnight',
    'UPSGround': 'UPS Ground',
    '2ndDayAir': 'UPS 2nd Day Air',
    'NextDayAir': 'UPS Next Day Air',
    'DHLGround': 'DHL Ground',
};
export async function getShippingRates(request) {
    if (!EASYPOST_API_KEY) {
        throw new Error('EasyPost API key not configured');
    }
    try {
        const auth = Buffer.from(`${EASYPOST_API_KEY}:`).toString('base64');
        // Create shipment with from and to addresses and parcel
        const shipmentData = {
            shipment: {
                from_address: formatAddressForEasyPost(request.fromAddress),
                to_address: formatAddressForEasyPost(request.toAddress),
                parcel: formatParcelForEasyPost(request.parcel),
            },
        };
        const shipmentResponse = await fetch(`${EASYPOST_API_BASE}/shipments`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(shipmentData),
        });
        const shipmentPayload = (await shipmentResponse.json());
        if (!shipmentResponse.ok) {
            throw new Error(shipmentPayload?.error?.message || `EasyPost error: ${shipmentResponse.status}`);
        }
        const shipment = shipmentPayload.shipment;
        const rates = [];
        // Extract rates from shipment
        if (shipment.rates && Array.isArray(shipment.rates)) {
            shipment.rates.forEach((rate) => {
                rates.push({
                    id: rate.id,
                    carrier: 'easypost',
                    service: rate.service,
                    serviceName: SERVICE_NAME_MAP[rate.service] || rate.service,
                    rate: Math.round(parseFloat(rate.rate) * 100), // Convert to cents
                    estimatedDays: rate.est_delivery_days || 0,
                    estimatedDelivery: rate.est_delivery_date,
                });
            });
        }
        return rates;
    }
    catch (error) {
        console.error('EasyPost error:', error);
        throw new Error(`Failed to get EasyPost rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
export async function createLabel(shipmentId, rateId, labelFormat = 'PDF') {
    if (!EASYPOST_API_KEY) {
        throw new Error('EasyPost API key not configured');
    }
    try {
        const auth = Buffer.from(`${EASYPOST_API_KEY}:`).toString('base64');
        const response = await fetch(`${EASYPOST_API_BASE}/shipments/${shipmentId}/buy`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rate_id: rateId, label_format: labelFormat }),
        });
        const payload = (await response.json());
        if (!response.ok) {
            throw new Error(payload?.error?.message || `EasyPost error: ${response.status}`);
        }
        return payload.shipment;
    }
    catch (error) {
        console.error('EasyPost label creation error:', error);
        throw new Error(`Failed to create EasyPost label: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
export async function trackShipment(trackingId) {
    if (!EASYPOST_API_KEY) {
        throw new Error('EasyPost API key not configured');
    }
    try {
        const auth = Buffer.from(`${EASYPOST_API_KEY}:`).toString('base64');
        const response = await fetch(`${EASYPOST_API_BASE}/trackers/${trackingId}`, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });
        const payload = (await response.json());
        if (!response.ok) {
            throw new Error(payload?.error?.message || `EasyPost error: ${response.status}`);
        }
        return payload.tracker;
    }
    catch (error) {
        console.error('EasyPost tracking error:', error);
        throw new Error(`Failed to track EasyPost shipment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
//# sourceMappingURL=easypostService.js.map