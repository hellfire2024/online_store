# Zoho Mail API Configuration Guide

This guide explains how to set up Zoho Mail API as your email provider. Perfect for Render, Hostinger, and other platforms that block SMTP.

## Why Zoho Mail API?

- **PaaS Compatible**: Works on Render, Hostinger, Heroku - no SMTP blocking
- **Business Emails**: Use your custom domain (`noreply@yourdomain.com`)
- **Reliable**: Zoho's infrastructure ensures high deliverability
- **No Free Tier Limits**: Bypass hosting platform email restrictions
- **No Command Line Needed**: Everything through the admin panel

## Prerequisites

1. **Zoho Mail Account** (free or paid): https://www.zoho.com/mail/
2. **Business Email**: Your domain configured in Zoho Mail (e.g., `noreply@yourdomain.com`)

## Quick Setup (5 minutes)

### Step 1: Get Zoho Credentials

1. Go to https://accounts.zoho.com/developerconsole
2. Click **Create Server-based Applications**
3. Fill in:
   - **Client Name**: "Online Store Email Service"
   - **Client Domain**: Your domain (e.g., `yourdomain.com`)
   - **Authorized Redirect URLs**: `http://localhost:3000/auth/callback`
     (Zoho requires this field - copy it exactly as shown, even if you don't use OAuth refresh tokens)
4. Click **Create**
5. Save your **Client ID** and **Client Secret**
   - Copy them EXACTLY - no extra spaces before/after
   - They contain special characters

### Step 2: Get Your Account ID

1. Log into https://mail.zoho.com/
2. Click your profile icon (top right)
3. Go to **Settings** → **Preferences**
4. Find and copy your **Account ID** (also in URL: `/accounts/{ACCOUNT_ID}`)

### Step 3: Configure in Admin Panel

No bash, curl, or PowerShell needed - just use the admin interface:

1. Log into your admin dashboard
2. Go to **Settings** → **Email Configuration**
3. Select **Zoho Mail API (Recommended for Render)**
4. Fill in:
   - **From Email**: `noreply@yourdomain.com`
   - **From Name**: Your store name
   - **Zoho Account ID**: From Step 2
   - **Zoho Client ID**: From Step 1 (copy exactly with no spaces!)
   - **Zoho Client Secret**: From Step 1 (copy exactly with no spaces!)
   - **Zoho Refresh Token**: Leave empty (optional for testing)
5. Click **Save Email Configuration**

### Step 4: Test It

1. Click **Test Configuration** button
2. Enter your test email address
3. Click **Send Test Email**
4. Check your inbox
5. **If successful, you're done! ✅**

## That's It!

Emails now send via Zoho Mail API automatically for:
- Order confirmations
- Shipping notifications  
- Support tickets
- Any other transactional emails

## Optional: Add Refresh Token (Production)

For production, add a refresh token for better reliability:

1. Go to https://accounts.zoho.com/
2. Click **My Account** → **Connected Apps**
3. Find your "Online Store Email Service" app
4. Get your refresh token
5. Go back to **Settings** → **Email Configuration**
6. Add the refresh token and **Save**

## Deploy to Render/Hostinger

1. All settings are saved in database (encrypted)
2. Push code to GitHub
3. Your hosting automatically deploys
4. Done! No environment variables needed

## Optional: Environment Variables

For extra security on production, add these in your hosting dashboard:

**For Render**: Dashboard → Service → Environment tab

```
ZOHO_ACCOUNT_ID=your_account_id
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
```

**For Hostinger**: Control Panel → Environment Variables (if available)

## Troubleshooting

### "invalid redirect uri" when creating app
- **Solution**: You MUST provide a redirect URL, even though you're not using it
- Enter: `http://localhost:3000/auth/callback`
- Zoho's form requires this field - it won't accept blank
- It doesn't need to be a real working page

### Test email returns "Authentication failed"

**This means Client ID or Client Secret is wrong.** Try:

1. Go back to Zoho Developer Console: https://accounts.zoho.com/developerconsole
2. Find your app "Online Store Email Service"
3. Copy the **Client ID** again - copy carefully, no extra spaces!
4. Copy the **Client Secret** again - copy carefully, no extra spaces!
5. Go back to admin panel
6. Clear the fields and paste the credentials again
7. Save and test again

**Common mistakes:**
- Extra spaces before/after when copying
- Wrong app selected in Zoho Developer Console
- Special characters not copied exactly
- Copy/pasting from browser cache

### Test email returns "Account not found"
- Verify Account ID is correct (from Zoho Mail settings page, not your account login ID)
- Should be a long numeric string
- No spaces or special characters

### Test email returns "Connection timeout"
- Check your internet connection
- Verify Zoho Mail API is accessible in your region
- Try refreshing your browser

### Redirect URL (required field, not used for testing)
- **Important**: Zoho requires a redirect URL even though you won't use it for testing
- **Use this exact value**: `http://localhost:3000/auth/callback`
- **Why**: Zoho's form doesn't allow blank fields - it's a requirement, not functionality
- You don't need to have that page actually exist or respond
- If using a different domain, format is: `http://yourdomain.com/auth/callback`

### Emails not sending after deployment
- Check admin panel - is Zoho still selected?
- Verify `from_email` domain is verified in Zoho Mail
- Check Zoho Mail activity logs for delivery failures

## Need Help?

- **Zoho Mail Help**: https://www.zoho.com/support/zohomail/
- **API Documentation**: https://www.zoho.com/mail/help/api/
- **Developer Console**: https://accounts.zoho.com/developerconsole

## Summary

✅ Everything done through web interfaces - no command line!
✅ Redirect URL NOT needed for testing
✅ Works on any hosting platform
✅ No SMTP blocking issues
✅ Takes about 5 minutes to set up

---

**Updated**: February 2026 - Now clarifies redirect URL is not needed for testing
