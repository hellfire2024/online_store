import React from 'react';
import { InvoiceTemplate, DEFAULT_TEMPLATE, generateInvoiceHTML } from '../../services/pdfInvoiceGenerator';

interface InvoiceTemplateEditorProps {
  template: InvoiceTemplate | undefined;
  onTemplateChange: (template: InvoiceTemplate) => void;
}

export const InvoiceTemplateEditor: React.FC<InvoiceTemplateEditorProps> = ({
  template,
  onTemplateChange,
}) => {
  const currentTemplate = template || DEFAULT_TEMPLATE;

  const handleChange = (field: keyof InvoiceTemplate, value: any) => {
    const updated = { ...currentTemplate, [field]: value };
    onTemplateChange(updated);
  };

  const previewInvoice = {
    orderNumber: 'SAMPLE-001',
    orderDate: new Date().toISOString(),
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '(555) 123-4567',
    shippingAddress: {
      street: '123 Main Street',
      city: 'Sample City',
      state: 'CA',
      zip: '12345',
      country: 'USA',
    },
    items: [
      { id: '1', name: 'Custom Business Cards', quantity: 1, price: 50, total: 50 },
      { id: '2', name: 'Premium Embossing Option', quantity: 1, price: 25, total: 25 },
    ],
    subtotal: 75,
    tax: 6,
    shipping: 10,
    total: 91,
    trackingNumber: 'TRACK123456',
    paymentMethod: 'Credit Card',
    notes: 'Thank you for your order!',
  };

  const previewHTML = generateInvoiceHTML(previewInvoice, currentTemplate);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
          <h3 className="text-lg font-semibold text-white mb-6">Invoice Template Settings</h3>

          <div className="space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-1">Company Name</label>
              <input
                type="text"
                value={currentTemplate.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white"
                placeholder="Your Store Name"
              />
            </div>

            {/* Company Email */}
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-1">Company Email</label>
              <input
                type="email"
                value={currentTemplate.companyEmail || ''}
                onChange={(e) => handleChange('companyEmail', e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white"
                placeholder="contact@example.com"
              />
            </div>

            {/* Company Phone */}
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-1">Company Phone</label>
              <input
                type="tel"
                value={currentTemplate.companyPhone || ''}
                onChange={(e) => handleChange('companyPhone', e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Invoice Title */}
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-1">Invoice Title</label>
              <input
                type="text"
                value={currentTemplate.invoiceTitle}
                onChange={(e) => handleChange('invoiceTitle', e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white"
                placeholder="INVOICE"
              />
            </div>

            {/* Footer Text */}
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-1">Footer Message</label>
              <textarea
                value={currentTemplate.footerText || ''}
                onChange={(e) => handleChange('footerText', e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white"
                rows={2}
                placeholder="Thank you for your business!"
              />
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-1">Accent Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={currentTemplate.accentColor}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={currentTemplate.accentColor}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="flex-1 p-2 bg-slate-900 border border-slate-600 rounded text-white font-mono text-sm"
                  placeholder="#0ea5e9"
                />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-1">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={currentTemplate.textColor}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={currentTemplate.textColor}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="flex-1 p-2 bg-slate-900 border border-slate-600 rounded text-white font-mono text-sm"
                  placeholder="#1e293b"
                />
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-1">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={currentTemplate.backgroundColor}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={currentTemplate.backgroundColor}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="flex-1 p-2 bg-slate-900 border border-slate-600 rounded text-white font-mono text-sm"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Border Color */}
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-1">Border Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={currentTemplate.borderColor}
                  onChange={(e) => handleChange('borderColor', e.target.value)}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={currentTemplate.borderColor}
                  onChange={(e) => handleChange('borderColor', e.target.value)}
                  className="flex-1 p-2 bg-slate-900 border border-slate-600 rounded text-white font-mono text-sm"
                  placeholder="#cbd5e1"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 border-t border-slate-600 pt-4">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={currentTemplate.includeItems}
                  onChange={(e) => handleChange('includeItems', e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Include Item Details Table</span>
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={currentTemplate.includeTotals}
                  onChange={(e) => handleChange('includeTotals', e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Include Totals Section</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
          <h3 className="text-lg font-semibold text-white mb-4">Live Preview</h3>
          <div className="bg-slate-900 p-4 rounded border border-slate-600 overflow-auto max-h-96">
            <iframe
              srcDoc={previewHTML}
              style={{
                width: '100%',
                height: '500px',
                border: 'none',
                backgroundColor: '#ffffff',
              }}
              title="Invoice Preview"
            />
          </div>
          <p className="text-gray-400 text-xs mt-2">Preview uses sample data. The actual PDF will include your real order information.</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplateEditor;
