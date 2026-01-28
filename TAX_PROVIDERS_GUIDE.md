# Tax Provider Integrations Guide

Complete integration guide for all six tax calculation providers supported by the online store.

## Table of Contents

1. [Overview](#overview)
2. [Supported Providers](#supported-providers)
3. [Configuration](#configuration)
4. [API Endpoints](#api-endpoints)
5. [Provider-Specific Setup](#provider-specific-setup)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Overview

The online store supports automatic tax calculation through six different tax providers, plus a manual rule-based fallback system. Each provider offers:

- **Automatic tax calculation** by state and ZIP code
- **Real-time accuracy** without manual configuration
- **Graceful fallback** to manual rules if API fails
- **Weighted priority** system for manual rules

### Why Multiple Providers?

Different providers offer unique advantages:

| Provider | Best For | Pricing Model | Complexity |
|----------|----------|---------------|-----------|
| **Stripe Tax** | Startups & SMBs | Simple API pricing | Low |
| **TaxJar** | E-commerce focus | Per-transaction | Medium |
| **Avalara AvaTax** | Enterprise & accuracy | Usage-based | High |
| **TaxCloud** | Multi-state compliance | Fixed + usage | Medium |
| **Zamp** | Global + US tax | Per-calculation | Medium |
| **Anrok** | SaaS & subscriptions | Modern API | Medium |

## Supported Providers

### 1. Stripe Tax (Recommended for New Stores)

**Status**: ✅ Production Ready  
**Documentation**: https://stripe.com/docs/tax  
**Pricing**: Included with Stripe

#### Credentials Required
- Stripe Secret Key (format: `sk_live_...` or `sk_test_...`)

#### Features
- Accurate by state and ZIP code
- Handles nexus automatically
- Native integration with Stripe payments
- Returns transaction ID for reporting

#### Demo Behavior
In demo mode, uses hardcoded state rates:
- CA: 8.625%, NY: 8.875%, TX: 8.25%
- FL: 7.0%, WA: 10.25%, OR: 0%

---

### 2. TaxJar

**Status**: ✅ Production Ready  
**Documentation**: https://www.taxjar.com/api/  
**Pricing**: Free tier + usage-based

#### Credentials Required
- API Key (format: `token_...`)

#### Features
- Nexus detection
- Economic nexus thresholds
- Rate update management
- Detailed tax breakdown

#### Advantages
- Comprehensive API documentation
- Good for ecommerce
- Free tier available

---

### 3. Avalara AvaTax

**Status**: ✅ Production Ready  
**Documentation**: https://developer.avalara.com/api/avatax/  
**Pricing**: Account-based

#### Credentials Required
- Account ID
- License Key
- Environment (sandbox or production)

#### Features
- Industry-leading accuracy
- Comprehensive tax rules
- Landed cost calculation
- Exemption handling

#### Advantages
- Most comprehensive tax rules
- Enterprise-grade support
- Detailed transaction reporting

#### Environment Selection
- **Sandbox**: For testing (no costs)
- **Production**: For live transactions

---

### 4. TaxCloud

**Status**: ✅ Production Ready  
**Documentation**: https://taxcloud.net/apicenter  
**Pricing**: Free (SSUTA partnership)

#### Credentials Required
- API Key
- User ID

#### Features
- SSUTA certified
- Free service
- Reliable for US taxes
- Simple authentication

#### Advantages
- No cost option
- Certified accuracy
- Established provider

---

### 5. Zamp

**Status**: ✅ Production Ready  
**Documentation**: https://www.zamp.com/  
**Pricing**: Usage-based

#### Credentials Required
- API Key

#### Features
- Global + US tax support
- Real-time calculations
- Detailed tax breakdown
- Flexible line items

#### Advantages
- Global tax support
- Modern API design
- Comprehensive tax data

---

### 6. Anrok

**Status**: ✅ Production Ready  
**Documentation**: https://www.anrok.com/  
**Pricing**: Modern pricing model

#### Credentials Required
- API Key

#### Features
- SaaS & subscription focus
- Global support
- Real-time updates
- Detailed reporting

#### Advantages
- Optimized for SaaS
- Global operations
- Modern platform

---

## Configuration

### Admin Interface Setup

1. **Navigate to Settings**
   - Go to Admin Dashboard → Settings
   - Click "Tax Rules" tab

2. **Select Tax Provider**
   - Dropdown shows all providers
   - Default: "Stripe Tax (Recommended)"

3. **Enter Provider Credentials**
   - Fields appear based on selected provider
   - Password fields for secrets
   - Links to provider dashboards

4. **Configure Fallback Rate**
   - "Default Tax Rate (%)" field
   - Used if provider fails or no rules match
   - Default: 8.0%

5. **Save Settings**
   - Click "Save Global Settings" button
   - Changes apply immediately to checkout

### Example Configurations

#### Stripe Tax Setup
```
Provider: Stripe Tax
API Key: sk_live_abc123xyz456...
Default Rate: 8.0%
```

#### TaxJar Setup
```
Provider: TaxJar
API Key: token_abc123xyz456...
Default Rate: 8.0%
```

#### Avalara Setup
```
Provider: Avalara
Account ID: 12345678
License Key: abc123xyz456...
Environment: sandbox (or production)
Default Rate: 8.0%
```

#### TaxCloud Setup
```
Provider: TaxCloud
API Key: api_abc123xyz456...
User ID: user123
Default Rate: 8.0%
```

## API Endpoints

### Backend Routes

All tax providers use unified endpoint pattern:

```
POST /api/tax/providers/{provider}
```

### Request Format

```json
{
  "cartItems": [
    {
      "product": {
        "id": "p-1",
        "name": "T-Shirt",
        "price": 25.00,
        "optionLists": [...]
      },
      "quantity": 2,
      "selectedOptions": {
        "option-1": "opt-value-1"
      }
    }
  ],
  "shippingCost": 5.00,
  "shippingState": "CA",
  "shippingZip": "90210",
  "apiKey": "..." // Only for non-Stripe providers
}
```

### Response Format

```json
{
  "subtotal": 50.00,
  "taxableAmount": 50.00,
  "taxRate": 8.625,
  "taxAmount": 4.31,
  "total": 59.31,
  "provider": "Stripe Tax"
}
```

### Available Endpoints

- `POST /api/tax/providers/stripe` - Stripe Tax
- `POST /api/tax/providers/taxjar` - TaxJar
- `POST /api/tax/providers/avalara` - Avalara AvaTax
- `POST /api/tax/providers/taxcloud` - TaxCloud
- `POST /api/tax/providers/zamp` - Zamp
- `POST /api/tax/providers/anrok` - Anrok

## Provider-Specific Setup

### Stripe Tax

**Get Started**:
1. Sign in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Tax (in left menu)
3. Enable Tax
4. Get API keys from [API Keys page](https://dashboard.stripe.com/apikeys)
5. Copy Secret Key (starts with `sk_live_`)

**Requirements**:
- Active Stripe account
- Tax feature enabled
- US business location for accurate rates

**Cost**: Included with Stripe payment processing

---

### TaxJar

**Get Started**:
1. Sign up at https://www.taxjar.com
2. Create API token at https://app.taxjar.com/api_sign_up/basic
3. Choose plan (free or premium)
4. Generate API token

**Requirements**:
- Business account setup
- Tax nexus configuration
- USA-based business (free tier)

**Cost**: Free tier available, paid plans start at $99/month

---

### Avalara AvaTax

**Get Started**:
1. Register at https://www.avalara.com/avatax
2. Set up company in account
3. Create user with API access
4. Get Account ID and License Key
5. Use sandbox first for testing

**Requirements**:
- Company registration
- Tax configuration
- User with API permissions

**Cost**: Based on usage, typically $10+/month minimum

---

### TaxCloud

**Get Started**:
1. Visit https://taxcloud.net
2. Sign up for free account
3. Verify business
4. Get API credentials
5. Get User ID and API Key

**Requirements**:
- Business verification
- Valid business address
- SSUTA certified (automatic)

**Cost**: FREE (SSUTA partnership)

---

### Zamp

**Get Started**:
1. Sign up at https://www.zamp.com
2. Verify business information
3. Create API key in dashboard
4. Copy API key

**Requirements**:
- Business verification
- Compliance information
- API key generation

**Cost**: Usage-based pricing

---

### Anrok

**Get Started**:
1. Visit https://www.anrok.com
2. Create account
3. Verify business
4. Generate API key
5. Add to dashboard

**Requirements**:
- Business account
- Compliance info
- API key access

**Cost**: Modern subscription-based pricing

---

## Testing

### Test With Demo Mode

1. **No credentials needed**
   - Demo mode simulates all providers
   - Uses hardcoded state rates

2. **Test Different Providers**
   - Select provider in Settings
   - Demo respects provider selection
   - Shows provider indicator in checkout

3. **State Test Rates**
   ```
   CA: 8.625%
   NY: 8.875%
   TX: 8.25%
   FL: 7.0%
   WA: 10.25%
   OR: 0%
   ```

### Test In Production

1. **Set Correct Credentials**
   - Add real API key to Settings
   - Environment set correctly (sandbox/production)

2. **Test Checkout Flow**
   - Add items to cart
   - Go to Checkout
   - Select state and ZIP code
   - Verify tax calculates

3. **Check Provider Indicator**
   - Shows provider name and location
   - Example: "💳 Stripe Tax • CA 90210"

4. **Monitor Errors**
   - Check browser console
   - Verify fallback to manual rules
   - Watch API calls in Network tab

### Manual Testing Checklist

- [ ] Provider selected in Settings
- [ ] API credentials entered
- [ ] Checkout page loads
- [ ] State selection works
- [ ] ZIP code input works
- [ ] Tax calculates on state/ZIP change
- [ ] Provider indicator shows
- [ ] Total updates correctly
- [ ] Fallback works if API fails
- [ ] Manual rules apply correctly

---

## Troubleshooting

### Common Issues

#### "Tax calculation failed, using fallback"
- **Cause**: API error or invalid credentials
- **Solution**:
  1. Check API key in Settings
  2. Verify credentials are correct
  3. Check provider account status
  4. Try sandbox environment if available
  5. Verify state is valid for provider

#### Tax not calculating
- **Cause**: No state selected or tax disabled
- **Solution**:
  1. Select state in checkout
  2. Verify "Enable Tax Collection" is checked
  3. Verify ZIP code entered
  4. Check browser console for errors

#### Incorrect tax amount
- **Cause**: Wrong provider or rate configuration
- **Solution**:
  1. Verify correct provider selected
  2. Check API credentials
  3. Verify test vs production environment
  4. Check default tax rate configuration

#### API Key Not Working
- **Cause**: Invalid, expired, or wrong key type
- **Solution**:
  1. Regenerate key in provider dashboard
  2. Verify key type (live vs test)
  3. Check for leading/trailing spaces
  4. Verify key permissions in provider account

#### "Cannot find module" errors
- **Cause**: Missing npm packages
- **Solution**:
  ```bash
  cd server
  npm install stripe
  npm run build
  ```

### Debug Mode

Enable debugging in browser console:
```javascript
// Check network tab for API calls to /api/tax/providers/*
// Monitor console for error messages
// Check response payloads
```

### Provider-Specific Help

| Provider | Support | Status Page |
|----------|---------|-------------|
| Stripe | https://support.stripe.com | https://status.stripe.com |
| TaxJar | https://www.taxjar.com/contact | https://status.taxjar.com |
| Avalara | https://help.avalara.com | https://status.avalara.com |
| TaxCloud | https://taxcloud.net/support | Status included |
| Zamp | support@zamp.com | Check dashboard |
| Anrok | support@anrok.com | Check dashboard |

---

## Environment Variables

### Server Configuration

```env
# Stripe Tax (only needed if provider is stripe)
STRIPE_SECRET_KEY=sk_live_your_key_here

# Other providers use dashboard configuration
# No environment variables needed - credentials stored in database
```

### Demo Mode

```bash
# Enable demo mode (uses mock data)
DEMO_MODE=1 npm start

# Disable database requirement
SKIP_DB_CHECK=1 npm start
```

---

## Types Reference

### TaxProvider Type
```typescript
type TaxProvider = 
  | "stripe" 
  | "taxjar" 
  | "avalara" 
  | "taxcloud" 
  | "zamp" 
  | "anrok" 
  | "manual";
```

### TaxProviderCredentials
```typescript
interface TaxProviderCredentials {
  stripeApiKey?: string;
  taxjarApiKey?: string;
  avalaraAccountId?: string;
  avalaraLicenseKey?: string;
  avalaraEnvironment?: "sandbox" | "production";
  taxcloudApiKey?: string;
  taxcloudUserId?: string;
  zampApiKey?: string;
  anrokApiKey?: string;
}
```

### TaxConfig
```typescript
interface TaxConfig {
  enableTaxCollection: boolean;
  provider: TaxProvider;
  defaultTaxRate: number;
  credentials?: TaxProviderCredentials;
  rules: TaxRule[];
  taxIncludedInPrice: boolean;
}
```

---

## Performance Notes

### API Call Optimization
- Tax calculated once per state/ZIP change
- Results cached until state/ZIP changes
- Loading state shown during calculation
- 5-second typical response time

### Fallback Strategy
- Automatic fallback if API fails
- Manual rules applied as backup
- No impact to checkout flow
- User notified with toast message

### Rate Limiting
- Check provider rate limits
- Stripe: 1000 requests/second
- TaxJar: 500 requests/day (free)
- Avalara: Varies by plan
- Others: Check documentation

---

## Best Practices

1. **Start with Stripe Tax**
   - Simplest setup
   - Good accuracy
   - Included with Stripe

2. **Test in Sandbox First**
   - Use sandbox/demo environment
   - Verify calculations
   - Test error handling

3. **Configure Fallback Rate**
   - Set reasonable default rate
   - Use state average if unknown
   - Example: 8.0% for most states

4. **Monitor Accuracy**
   - Spot check calculations
   - Compare with provider reports
   - Adjust provider if needed

5. **Keep Credentials Secure**
   - Don't share API keys
   - Regenerate if compromised
   - Use environment variables
   - Restrict API key permissions

---

## FAQ

**Q: Can I switch providers?**  
A: Yes, anytime in Settings. Changes apply immediately. No data loss.

**Q: What if all providers fail?**  
A: Falls back to manual rules or default tax rate. Checkout continues.

**Q: Do I need multiple providers?**  
A: No, one is sufficient. You can test in demo, switch to production later.

**Q: Are there additional costs?**  
A: Depends on provider. Stripe Tax is free. Others vary. Check pricing.

**Q: Is demo mode for production?**  
A: No, demo mode is testing only. Requires real credentials for production.

**Q: How accurate are calculations?**  
A: Varies by provider. Avalara typically most accurate, TaxJar also excellent.

**Q: Can customers see the provider used?**  
A: Yes, shown in checkout ("💳 Stripe Tax • CA 90210" format).

**Q: What about sales tax reports?**  
A: Most providers have reporting dashboards. Export data as needed.

---

## Migration Guide

### From Manual to API-Based Provider

1. **Keep existing manual rules**
   - Won't be deleted
   - Can switch back anytime

2. **Add new provider credentials**
   - Enter API key
   - Test in demo first

3. **Switch provider**
   - Select new provider
   - Save settings

4. **Verify calculations**
   - Test checkout with various states
   - Compare with previous rates

5. **Remove manual rules** (optional)
   - Can delete unused rules
   - Or keep as backup

---

## Support & Resources

- **Documentation Repo**: Check STRIPE_TAX_INTEGRATION.md
- **Tax Rules Guide**: See types.ts TaxRule interface
- **API Docs**: See server/src/routes/providers-tax.ts
- **Frontend Integration**: See pages/CheckoutPage.tsx

---

**Last Updated**: January 2026  
**Version**: 1.0  
**Status**: Production Ready
