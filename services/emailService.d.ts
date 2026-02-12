export declare function sendOrderConfirmationEmail(customerEmail: string, customerName: string, orderNumber: string, orderDetails: any): Promise<{
    success: boolean;
    message: string;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: unknown;
}>;
export declare function sendShippingNotificationEmail(customerEmail: string, customerName: string, orderNumber: string, trackingNumber: string, shipper: string, shippingUrl?: string): Promise<{
    success: boolean;
    message: string;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: unknown;
}>;
export declare function sendTicketEmail(supportEmail: string, subject: string, ticketNumber: string, orderId: string | undefined, priority: string, message: string, customerInfo: {
    subject: string;
    date: string;
}): Promise<{
    success: boolean;
    message: string;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: unknown;
}>;
//# sourceMappingURL=emailService.d.ts.map