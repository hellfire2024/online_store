/**
 * Invoice generation service
 * Provides utilities for generating and formatting invoice data
 */

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoiceData {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  trackingNumber?: string;
  paymentMethod?: string;
  notes?: string;
}

export const generateInvoiceHTML = (invoice: InvoiceData): string => {
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .invoice { background: white; max-width: 900px; margin: 0 auto; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; }
        .company-name { font-size: 28px; font-weight: bold; color: #1e293b; }
        .invoice-title { font-size: 24px; font-weight: bold; color: #0ea5e9; }
        .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
        .detail-section { }
        .detail-label { font-weight: bold; color: #1e293b; margin-top: 10px; margin-bottom: 5px; }
        .detail-value { color: #475569; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #e2e8f0; padding: 12px; text-align: left; font-weight: bold; color: #1e293b; border: 1px solid #cbd5e1; }
        td { padding: 12px; border: 1px solid #cbd5e1; color: #475569; }
        tr:nth-child(even) { background: #f8fafc; }
        .text-right { text-align: right; }
        .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
        .totals-table { width: 300px; }
        .total-row { border: none; }
        .total-row td { border: none; padding: 8px 12px; }
        .total-row .label { font-weight: bold; color: #1e293b; }
        .total-row.final { border-top: 2px solid #0ea5e9; font-weight: bold; font-size: 16px; color: #0ea5e9; }
        .notes { background: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin-bottom: 20px; color: #475569; }
        .footer { text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <div class="company-name">Your Store</div>
          <div class="invoice-title">INVOICE</div>
        </div>

        <div class="invoice-details">
          <div class="detail-section">
            <div class="detail-label">Invoice Number</div>
            <div class="detail-value">${invoice.orderNumber}</div>
            <div class="detail-label" style="margin-top: 15px;">Invoice Date</div>
            <div class="detail-value">${formatDate(invoice.orderDate)}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Bill To</div>
            <div class="detail-value">
              <strong>${invoice.customerName}</strong><br/>
              ${invoice.customerEmail}<br/>
              ${invoice.customerPhone ? invoice.customerPhone + '<br/>' : ''}
              ${invoice.shippingAddress.street}<br/>
              ${invoice.shippingAddress.city}, ${invoice.shippingAddress.state} ${invoice.shippingAddress.zip}<br/>
              ${invoice.shippingAddress.country}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.price)}</td>
                <td class="text-right">${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-section">
          <table class="totals-table">
            <tr class="total-row">
              <td class="label">Subtotal:</td>
              <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
            </tr>
            <tr class="total-row">
              <td class="label">Tax:</td>
              <td class="text-right">${formatCurrency(invoice.tax)}</td>
            </tr>
            <tr class="total-row">
              <td class="label">Shipping:</td>
              <td class="text-right">${formatCurrency(invoice.shipping)}</td>
            </tr>
            <tr class="total-row final">
              <td class="label">Total:</td>
              <td class="text-right">${formatCurrency(invoice.total)}</td>
            </tr>
          </table>
        </div>

        ${invoice.trackingNumber ? `
          <div class="detail-section">
            <div class="detail-label">Tracking Number</div>
            <div class="detail-value">${invoice.trackingNumber}</div>
          </div>
        ` : ''}

        ${invoice.paymentMethod ? `
          <div class="detail-section">
            <div class="detail-label">Payment Method</div>
            <div class="detail-value">${invoice.paymentMethod}</div>
          </div>
        ` : ''}

        ${invoice.notes ? `
          <div class="notes">
            <strong>Notes:</strong><br/>
            ${invoice.notes}
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>If you have any questions about this invoice, please contact us.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const downloadInvoicePDF = (invoice: InvoiceData) => {
  const html = generateInvoiceHTML(invoice);
  const printWindow = window.open('', '', 'height=600,width=800');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
};

export const downloadInvoiceHTML = (invoice: InvoiceData) => {
  const html = generateInvoiceHTML(invoice);
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html));
  element.setAttribute('download', `invoice-${invoice.orderNumber}.html`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
