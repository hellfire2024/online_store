# Zoho Mail API Configuration Guide

This guide explains how to set up Zoho Mail API as your email provider for the online store. This is ideal for Render and other PaaS platforms that block direct SMTP connections.

## Why Zoho Mail API?

- **PaaS Compatible**: Works on Render, Heroku, and other platforms that block SMTP
- **Business Emails**: Use your custom domain email addresses
- **Reliable**: Zoho's infrastructure ensures high deliverability
- **No Free Tier Limitations**: Bypass Render's free tier email restrictions

## Prerequisites

1. **Zoho Mail Business Account**: You need a Zoho Mail account (free or paid)
   - Go to https://www.zoho.com/mail/
   - Sign up or log in to your account

2. **Business Email**: Your domain email configured in Zoho Mail
   - Example: `noreply@yourdomain.com`

## Step 1: Register Your Application in Zoho

1. Go to **Zoho Developer Console**: https://accounts.zoho.com/developerconsole
2. Click **Create Server-based Applications** or **Add Client ID**
3. Fill in the form:
   - **Client Name**: "Online Store Email Service"
   - **Client Domain**: Your domain (e.g., `yourdomain.com`)
   - **Authorized Redirect URLs**: `http://localhost:3000/auth/callback` (for testing)
     - In production, use your actual domain: `https://yourdomain.com/auth/callback`
4. Click **Create**
5. Save your credentials:
   - **Client ID**
   - **Client Secret**

## Step 2: Generate Refresh Token

You need to get a refresh token to allow your application to send emails on your behalf.

### Method 1: Using Authorization Code Flow (Recommended)

1. Replace `{CLIENT_ID}` and `{CLIENT_SECRET}` and visit this URL:
```
https://accounts.zoho.com/oauth/v2/auth?
  response_type=code
  &client_id={CLIENT_ID}
  &scope=ZohoMail.accounts.READ,ZohoMail.messages.CREATE,ZohoMail.messages.SEND
  &redirect_uri=http://localhost:3000/auth/callback
  &access_type=offline
```

2. Log in with your Zoho account
3. Grant permissions
4. You'll be redirected with an authorization code in the URL: `?code=...`
5. Copy that code and exchange it for a refresh token using this curl command:

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id={CLIENT_ID}" \
  -d "client_secret={CLIENT_SECRET}" \
  -d "code={AUTHORIZATION_CODE}" \
  -d "redirect_uri=http://localhost:3000/auth/callback"
```

6. The response will include `refresh_token` - **save this securely**

### Method 2: Using Client Credentials (For Testing Only)

For initial testing, you can skip the refresh token. The system will attempt to use client credentials if no refresh token is provided.

## Step 3: Configure in Admin Panel

1. Go to **Admin Dashboard** → **Settings** → **Email Configuration**
2. Select **Email Provider**: `Zoho Mail API`
3. Fill in the following fields:
   - **From Email**: Your business email (e.g., `noreply@yourdomain.com`)
   - **From Name**: Display name (e.g., `Custom Threads Store`)
   - **Zoho Account ID**: Your Zoho Mail account ID (appears in Zoho Mail settings)
   - **Zoho Client ID**: From developer console
   - **Zoho Client Secret**: From developer console
   - **Zoho Refresh Token**: From the OAuth flow (optional for initial testing)

4. Click **Test Email Configuration**
5. Enter a test email address and send
6. If successful, you'll see a confirmation message

## Step 4: Finding Your Zoho Account ID

1. Log in to Zoho Mail: https://mail.zoho.com/
2. Click your profile icon (top right)
3. Go to **Settings** → **Preferences**
4. Look for **Account ID** (also appears in the URL as `/accounts/{ACCOUNT_ID}`)

## Environment Variables (Optional)

If you prefer to configure via environment variables:

```bash
ZOHO_ACCOUNT_ID=your_account_id
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
```

## Testing

### Test in Admin Panel
1. Go to **Admin Settings** → **Email Configuration**
2. Click **Test Email** button
3. Enter your email address
4. Verify you receive the test email

### Manual Testing
You can also test using PowerShell:

```powershell
$body = @{testEmail = "your.email@example.com"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3001/api/email-config/test" `
  -Method POST -ContentType "application/json" -Body $body
```

## Supported Scopes

The system requires these Zoho Mail API scopes:
- `ZohoMail.accounts.READ` - Read account information
- `ZohoMail.messages.CREATE` - Create email messages
- `ZohoMail.messages.SEND` - Send email messages

## Troubleshooting

### "Authentication failed" Error
- Verify your Client ID and Secret are correct
- Check that your refresh token hasn't expired
- Re-generate your refresh token using the OAuth flow

### "Account not found" Error
- Verify your Account ID is correct
- Check Zoho Mail account settings to get the correct ID

### "Connection timeout" Error
- Check your internet connection
- Verify Zoho Mail API is accessible in your region
- Check firewall/network restrictions

### Emails Not Sending in Production
- Verify the refresh token is configured (if using OAuth)
- Check that your domain is verified in Zoho Mail
- Monitor Zoho Mail's activity logs for delivery failures
- Ensure `from_email` matches a verified domain in Zoho Mail

## Zoho Mail API Endpoints

- **Auth**: `https://accounts.zoho.com/oauth/v2/token`
- **Send Email**: `https://mail.zoho.com/api/accounts/{ACCOUNT_ID}/messages/send`
- **Get Account Info**: `https://mail.zoho.com/api/accounts/{ACCOUNT_ID}`

## Security Best Practices

1. **Never commit secrets**: Store Client Secret and Refresh Token in environment variables
2. **Use HTTPS**: Always use HTTPS in production
3. **Rotate tokens**: Periodically regenerate refresh tokens
4. **Monitor logs**: Check email delivery logs regularly
5. **Rate limiting**: Be aware of Zoho's API rate limits (varies by plan)

## Support

- **Zoho Mail Help**: https://www.zoho.com/support/zohomail/
- **Zoho API Documentation**: https://www.zoho.com/mail/help/api/
- **Developer Community**: https://www.zoho.com/developer/

## Next Steps

1. Install axios: `npm install axios` (in server folder)
2. Configure Zoho credentials in Admin Settings
3. Test email sending
4. Deploy to Render with environment variables

---

**Note**: This configuration uses the Zoho Mail API, which bypasses all PaaS SMTP limitations. You can now send transactional emails (order confirmations, shipping notifications, support tickets) directly from Render without any port blocking issues.
