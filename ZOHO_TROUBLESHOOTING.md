# Zoho Mail API Troubleshooting Guide

## Recently Fixed Issues

### ✅ Grant Type Handling (FIXED)

The `sendViaZohoApi` function now correctly handles both authentication flows:

- **Client Credentials** (for testing without refresh token)
- **Refresh Token** (for production with long-term access)

This was causing "authentication failed" errors when sending real emails without a refresh token.

---

## Step-by-Step Diagnostic Process

### 1. Verify Zoho Credentials Are Saved

**Location**: Admin Settings → Email Configuration

Check that the following fields are populated:

- ✅ **From Email**: Must be a verified business email in your Zoho Mail account (e.g., `noreply@yourdomain.com`)
- ✅ **From Name**: Store name or business name
- ✅ **Zoho Account ID**: From your Zoho Mail settings → Account ID
- ✅ **Zoho Client ID**: From Zoho Developer Console (starts with `1000.`)
- ✅ **Zoho Client Secret**: From Zoho Developer Console

**Try saving again** - The system should show a success message.

---

### 2. Test Configuration Endpoint

Click **"Test Configuration"** button in Settings → Email Configuration

**What it does**:

1. Saves your current settings to database
2. Makes an API call to verify credentials
3. Checks if it can connect to Zoho's API

**Check browser console** (F12 → Console tab) for:

```
Sending test email request to: [your-test-email@example.com]
Test email response: {success: true, ...}
```

---

### 3. Check Server Logs

If you're using **Render**, view live logs:

```bash
# View server logs from Render dashboard
Settings → Logs → View Live Logs
```

Look for these messages:

**✅ SUCCESS**:

```
[Email Test] Validating Zoho Mail API configuration...
[Email Test] Requesting Zoho access token...
[Email Test] Zoho access token obtained
[Email Test] Zoho Mail API account validation successful
```

**❌ FAILURE** - Look for specific error:

```
[Email Test] Zoho validation error
```

Followed by one of these:

---

## Common Errors & Solutions

### Error: "Authentication failed - check your client ID and secret"

**Cause**: Invalid Client ID or Client Secret

**Solution**:

1. Go to https://accounts.zoho.com/developerconsole
2. Find your "Online Store Email Service" app
3. Copy the **Client ID** (should look like `1000.xxxxxxxxxxxxxxxx`)
   - Copy it character by character - no extra spaces!
   - Don't copy the `...` at the end if truncated
4. Click **Generate Client Secret** or copy existing one
   - Again, copy exactly with no extra spaces
5. Return to Admin → Settings → Email Configuration
6. Paste the values exactly as copied
7. Click **Save Email Configuration**
8. Wait 2-3 seconds
9. Click **Test Configuration**

**Common copy/paste mistakes**:

- Extra spaces before/after the credential
- Copying from browser's auto-fill which sometimes adds spaces
- Using outdated credentials (previous app version)

---

### Error: "Zoho account not found - check your account ID"

**Cause**: Wrong Account ID format

**Solution**:

1. Log into https://mail.zoho.com/
2. Click your profile icon (top right corner)
3. Go to **Settings** → **Preferences**
4. Look for **Account ID** - it's a long numeric string
   - NOT your email address
   - NOT your username
   - Should be like: `123456789012345678`
5. Copy the entire numeric string
6. Return to Admin Settings
7. Paste into **Zoho Account ID** field
8. Save and test

---

### Error: "Connection to Zoho API timed out"

**Cause**: Network connectivity issue or Zoho API unreachable

**Solutions**:

1. **Check internet connection** - Are other sites loading?
2. **Try in 30 seconds** - Sometimes temporary API issues
3. **Check Zoho status** - https://www.zoho.com/status/
4. **Whitelist your IP** (if behind corporate firewall):
   - Check if your network blocks outbound HTTPS to `accounts.zoho.com`
   - Try from a different network (phone hotspot, home internet)

---

### Error: "Could not connect to Zoho API"

**Cause**: DNS or network issue

**Solutions**:

1. **Check DNS**:
   ```powershell
   nslookup accounts.zoho.com
   # Should return an IP address
   ```
2. **Test connectivity**:
   ```powershell
   Invoke-WebRequest -Uri "https://accounts.zoho.com" -Method HEAD
   # Should return status 200
   ```
3. **If on Render**: Render has outbound HTTPS access enabled by default
4. **If on another platform**: Check if they allow outbound HTTPS connections

---

## Testing Email Sending (Not Just Configuration)

The **"Test Configuration"** button only verifies credentials. To actually test email sending:

### Option 1: Send a Real Order Confirmation

1. As a customer, create an order in the store
2. At checkout, enter your test email address
3. Complete the order
4. **Check your inbox** within 30 seconds

**Check server logs for**:

```
[Zoho Email] Sending email to [test@example.com] via Zoho Mail API
[Zoho Email] Access token obtained successfully
[Zoho Email] Email sent successfully via Zoho API
```

### Option 2: Use Support Tickets

1. Go to Contact page
2. Create a support ticket
3. You should receive a notification email

### Option 3: API Test with curl/PowerShell

```powershell
# Test endpoint directly
$body = @{
    testEmail = "your-test-email@example.com"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:3001/api/email-config/test" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

## Refresh Token vs Client Credentials

### For Testing (No Refresh Token Needed)

- ✅ Use: Client ID + Client Secret only
- ✅ Grant Type: `client_credentials`
- ✅ Limitations: Might have rate limits
- ✅ Works: For testing and development

### For Production (With Refresh Token)

- ✅ More reliable
- ✅ Better rate limits
- ✅ Recommended for live deployments
- 🔍 **Optional** - Not required for basic testing

To add a refresh token later:

1. Go to https://accounts.zoho.com/
2. Click **My Account** → **Connected Apps**
3. Find your app and get the refresh token
4. Return to Settings → Email Configuration
5. Paste it in **Zoho Refresh Token** field
6. Save

---

## Database Issues

If credentials are saved but not working:

### Check Database

```bash
# SSH into your Render database
psql [your-connection-string]

# Check saved config
SELECT * FROM email_config WHERE id = 1;
```

**Look for**:

- ✅ `provider` = `'zoho'`
- ✅ `zoho_account_id` is populated
- ✅ `zoho_client_id` is populated
- ✅ `zoho_client_secret` is populated (encrypted)

If empty, rebuild settings:

1. Clear the Email Configuration
2. Re-enter values
3. Click Save
4. Check database again

---

## From Email Address Requirements

**Important**: The `from_email` must be:

1. ✅ A **verified business email** in your Zoho Mail account
   - NOT a personal email
   - NOT a Gmail account (use Zoho Mail domain)
2. ✅ In the format `noreply@yourdomain.com` (or similar)
   - Using your actual domain, not a subdomain
3. ✅ Confirmed in Zoho Mail:
   - Log into https://mail.zoho.com/
   - Check your email address is listed under your account
   - If not found, add your domain to Zoho Mail first

**If emails still don't arrive**:

- Check Zoho Mail's activity log
- Verify recipient email isn't blocked
- Check spam folder for test emails

---

## Platform-Specific Issues

### Render

- ✅ Outbound HTTPS is enabled
- ✅ Should work fine with Zoho
- 🔍 Check Render's Services → Environment for any blocked domains

### Hostinger

- ✅ Usually allows outbound HTTPS
- 🔍 Contact support if HTTPS connections are blocked

### Local Development

- ✅ Should work fine if not behind a restricted corporate firewall
- 🔍 If on corporate network, you may need a VPN

---

## Advanced Debugging

### Enable Verbose Logging

Edit `server/src/services/emailService.ts` to add more logging:

```typescript
// In sendViaZohoApi function, after getting access token:
console.log("[Zoho Email] Token response:", {
  hasAccessToken: !!tokenResponse.data.access_token,
  expiresIn: tokenResponse.data.expires_in,
  scope: tokenResponse.data.scope,
});
```

### Check API Response Details

The error message sometimes includes Zoho's response. Common Zoho errors:

- `INVALID_OAUTH_TOKEN` - Credentials are invalid
- `ACCOUNT_NOT_FOUND` - Account ID doesn't exist
- `RATE_LIMIT_EXCEEDED` - Too many requests (rare)

---

## Still Not Working?

### Gather This Information

1. **Error message** from admin panel (exact text)
2. **Browser console output** (F12 → Console)
3. **Server logs output** (from Render or local terminal)
4. **Configuration details** (don't share secrets!):
   - Zoho Account ID (format: numeric string)
   - Zoho Client ID (format: `1000.xxxxx`)
   - Domain (for From Email)
5. **Deployment info**:
   - Local, Render, Hostinger?
   - Windows, Mac, Linux?

### Known Solutions That Work

If other email providers work but Zoho doesn't:

**Option 1**: Use SendGrid temporarily

```
1. Sign up: https://sendgrid.com/
2. Get API key
3. Select SendGrid in Settings
4. Continue with orders/emails
```

**Option 2**: Use Mailgun temporarily

```
1. Sign up: https://www.mailgun.com/
2. Get domain and API key
3. Select Mailgun in Settings
4. Continue with orders/emails
```

Then retry Zoho setup later with fresh credentials.

---

## Verification Checklist

Before contacting support:

- [ ] Zoho credentials are saved in database
- [ ] `Test Configuration` returns success
- [ ] `from_email` is verified in Zoho Mail
- [ ] Zoho Account ID is numeric string
- [ ] Zoho Client ID is in format `1000.xxxxx`
- [ ] Zoho Client Secret was copied exactly (no spaces)
- [ ] No error messages in browser console
- [ ] No error messages in server logs
- [ ] Internet connectivity is working
- [ ] Zoho service is not down (check status page)

---

## Support

- **Zoho Mail Help**: https://www.zoho.com/support/zohomail/
- **Zoho Mail API Docs**: https://www.zoho.com/mail/help/api/
- **Zoho Status**: https://www.zoho.com/status/
- **Setup Guide**: See `ZOHO_MAIL_API_SETUP.md`
