# Quick Start: Shipping Integration

## 5-Minute Setup

### 1. Get API Credentials
Choose which carriers to use:

**EasyPost** (Recommended - Best all-around)
- Go to: https://www.easypost.com/
- Create account → API keys section
- Copy test key for testing

**Shippo** (Good for international)
- Go to: https://goshippo.com/
- Create account → API settings
- Copy test key for testing

**ShipStation** (Full integration)
- Go to: https://www.shipstation.com/
- Create account → Settings → API
- Copy API key and secret

### 2. Add Environment Variables
Edit `server/.env`:
```bash
# Pick at least one:
EASYPOST_API_KEY=pk_test_your_key_here
SHIPPO_API_KEY=shippo_test_your_key_here
SHIPSTATION_API_KEY=your_key
SHIPSTATION_API_SECRET=your_secret
```

### 3. Configure in Admin Panel
1. Login to admin
2. Go to Settings → Shipping tab
3. Enter your address under "Sender Address"
4. Check the carriers you enabled
5. Paste their API keys
6. Click "Save Shipping Settings"

### 4. Test It Works
Use Postman or curl:
```bash
curl -X POST http://localhost:3001/api/shipping/rates \
  -H "Content-Type: application/json" \
  -d '{
    "toAddress": {
      "name": "John Doe",
      "street1": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zip": "62701",
      "country": "US",
      "email": "john@example.com",
      "phone": "555-0123"
    },
    "fromAddress": {
      "name": "Your Business",
      "street1": "456 Business Ave",
      "city": "Chicago",
      "state": "IL",
      "zip": "60601",
      "country": "US",
      "email": "ship@yourbiz.com",
      "phone": "555-4567"
    },
    "parcel": {
      "weight": 2.5,
      "length": 12,
      "width": 8,
      "height": 6
    }
  }'
```

Should get back rates like:
```json
{
  "rates": [
    {
      "id": "rate_123",
      "carrier": "easypost",
      "serviceName": "USPS Priority Mail",
      "rate": 1299,
      "estimatedDays": 2
    }
  ]
}
```

### 5. Integrate into Checkout (Next Step)
See `CHECKOUT_INTEGRATION.md` for code examples.

## Common Issues

**API returns no rates?**
- Check that address ZIP codes are valid US codes
- Verify API key is entered correctly in admin
- Check server logs for specific error

**"API key not configured" error?**
- Make sure API key is in `.env` file
- Did you restart the server after adding env var?
- Check spelling of environment variable name

**Rates are very high?**
- You might be on sandbox/test environment
- Switch to production API keys when ready
- Rates may vary by carrier

**Only one carrier returning rates?**
- Other carriers might be disabled in admin
- Check if their API keys are entered
- Check server logs for other carrier errors

## Next Steps

1. ✅ Add environment variables
2. ✅ Configure in admin
3. ✅ Test API
4. 🔄 **Integrate into CheckoutPage** (NEXT)
   - Follow `CHECKOUT_INTEGRATION.md`
5. Test in checkout flow
6. Switch to production credentials
7. Deploy

## Files Modified/Created

**New Files:**
- `server/src/services/easypostService.ts` - EasyPost API
- `server/src/services/shippoService.ts` - Shippo API
- `server/src/services/shipstationService.ts` - ShipStation API
- `server/src/routes/shippingApi.ts` - Shipping endpoints
- `services/shippingService.ts` - Frontend client
- `hooks/useShipping.ts` - React hook
- `components/ShippingRateSelector.tsx` - Rate UI
- `SHIPPING_INTEGRATION_GUIDE.md` - Full guide
- `CHECKOUT_INTEGRATION.md` - Checkout steps
- `SHIPPING_IMPLEMENTATION_SUMMARY.md` - Overview

**Modified Files:**
- `types.ts` - Added shipping types
- `context/SiteSettingsContext.tsx` - Added shipping config
- `pages/admin/SettingsManagement.tsx` - Added Shipping tab
- `server/src/server.ts` - Added shipping routes

## Architecture Overview

```
Request Flow:
1. Customer enters address in checkout
2. Frontend calls POST /api/shipping/rates
3. Backend queries all enabled carriers in parallel
4. Each carrier service calls their API
5. Rates aggregated and returned to frontend
6. ShippingRateSelector displays options
7. Customer selects rate
8. Rate added to order total
```

## Testing Checklist

- [ ] Credentials added to .env
- [ ] Server restarted
- [ ] Admin settings configured
- [ ] API test successful
- [ ] Rates returned properly
- [ ] No console errors
- [ ] Ready for checkout integration

## Documentation Files

- **SHIPPING_INTEGRATION_GUIDE.md** - Complete reference guide
- **CHECKOUT_INTEGRATION.md** - Step-by-step checkout integration
- **SHIPPING_IMPLEMENTATION_SUMMARY.md** - Full implementation overview

## Support

**Issue with specific carrier?**
- Check their API documentation
- Verify API key format
- Check rate request parameters
- Look at server logs for error details

**Need help?**
- Read SHIPPING_INTEGRATION_GUIDE.md for detailed info
- Check carrier documentation
- Review server logs: `docker logs <container>` or console output

## Ready to Go!

Your shipping integration is installed and ready to configure. Once you add credentials, rates will be available in your checkout flow.

Start with just ONE carrier (EasyPost recommended) to test, then add others.
