# Email Setup Guide for Contact Forms

## Overview
This guide explains how to configure email delivery for contact form submissions. The system uses Nodemailer with support for multiple email providers including Zoho Mail, Gmail, SendGrid, and custom SMTP servers.

## Contact Form Email Flow

1. User submits contact form on website
2. Backend validates form data and extracts sender information
3. Backend determines recipient email address (priority order):
   - `targetEmail` from page content (set in Admin Panel > Pages > Contact)
   - `CONTACT_EMAIL` environment variable
   - Default: `tgaunt@adaptivegis.com`
4. Backend sends formatted email using configured SMTP provider
5. Email arrives in recipient's inbox

## Recipient Email Configuration

### Option 1: Set via Environment Variable (Recommended)
Add to your `.env` file:
```env
CONTACT_EMAIL=tgaunt@adaptivegis.com
```

### Option 2: Set via Admin Panel
1. Login to Admin Panel
2. Navigate to Pages > Contact Page
3. Edit the contact page
4. Set "Target Email" field to your desired recipient address

### Option 3: Default Fallback
If neither option above is configured, emails go to: `tgaunt@adaptivegis.com`

## SMTP Provider Configuration

### Configure via Admin Panel
1. Login to Admin Panel
2. Navigate to **Settings** > **Email Configuration**
3. Choose your email provider and enter credentials

---

## Zoho Mail SMTP Setup (Recommended for @adaptivegis.com)

### Prerequisites
- Active Zoho Mail account (e.g., tgaunt@adaptivegis.com)
- IMAP/POP access enabled in Zoho account settings

### Configuration Settings

**Admin Panel Values:**
- **Provider:** SMTP
- **From Email:** tgaunt@adaptivegis.com (or your Zoho email)
- **From Name:** AdaptiveGIS Contact Form
- **SMTP Host:** smtp.zoho.com
- **SMTP Port:** 465 (SSL) or 587 (TLS/STARTTLS)
- **Secure Connection:** 
  - ✅ True (checked) for port 465
  - ❌ False (unchecked) for port 587
- **SMTP Username:** tgaunt@adaptivegis.com (full email address)
- **SMTP Password:** Your Zoho password or app-specific password

### Zoho Security Settings

#### Option A: Using Regular Password
1. Go to Zoho Mail Settings > Security
2. Enable "Allow less secure apps" (not recommended)
3. Use your regular Zoho password in SMTP config

#### Option B: Using App-Specific Password (Recommended)
1. Go to Zoho Accounts: https://accounts.zoho.com
2. Navigate to Security > App-Specific Passwords
3. Generate new password for "Custom Threads App"
4. Copy the generated password
5. Use this password in SMTP configuration (not your regular password)
6. Enable Two-Factor Authentication if prompted

### Testing Zoho Configuration

After configuring in Admin Panel:
1. Navigate to Settings > Email Configuration
2. Click "Test Email Configuration"
3. Enter a test recipient email
4. Click "Send Test Email"
5. Check recipient inbox (and spam folder)

### Common Zoho Issues

**Authentication Failed:**
- ✅ Ensure IMAP/POP access is enabled in Zoho
- ✅ Use full email address as username (not just "tgaunt")
- ✅ Use app-specific password if 2FA is enabled
- ✅ Check "Less secure apps" setting

**Connection Timeout:**
- ✅ Verify SMTP port (465 or 587)
- ✅ Match "Secure" setting to port (true for 465, false for 587)
- ✅ Check server firewall allows outbound SMTP connections
- ✅ Verify smtp.zoho.com is not blocked

**Emails Not Received:**
- ✅ Check spam/junk folder in recipient inbox
- ✅ Verify sender email (From Email) matches authenticated Zoho account
- ✅ Check Zoho Mail logs/sent folder to confirm email was sent
- ✅ Verify recipient email address is correct
- ✅ Check server logs for delivery confirmation

---

## Gmail SMTP Setup (Alternative)

**Settings:**
- **SMTP Host:** smtp.gmail.com
- **SMTP Port:** 587 (TLS) or 465 (SSL)
- **Secure:** false for 587, true for 465
- **Username:** your.email@gmail.com
- **Password:** App-specific password (required with 2FA)

**Gmail Prerequisites:**
1. Enable 2-Factor Authentication
2. Generate App-Specific Password:
   - Go to Google Account > Security > 2-Step Verification > App passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy generated 16-character password

---

## SendGrid Setup (High Volume)

**Settings:**
- **Provider:** SendGrid
- **From Email:** verified sender email
- **API Key:** Your SendGrid API key

**Prerequisites:**
1. Create SendGrid account
2. Verify sender identity (single sender or domain)
3. Generate API key with "Mail Send" permission

---

## Debugging Email Issues

### Enable Debug Logging

Contact form submissions now log detailed information. Check server logs for:

```
[Contact Form] Processing submission: {
  toEmail: 'tgaunt@adaptivegis.com',
  fromEmail: 'customer@example.com',
  fromName: 'John Doe',
  subject: 'Question about products'
}

[EmailService] Using email config: {
  provider: 'smtp',
  fromEmail: 'tgaunt@adaptivegis.com',
  smtpHost: 'smtp.zoho.com',
  smtpPort: 465
}

[EmailService] Email sent successfully: {
  messageId: '<...>',
  accepted: ['tgaunt@adaptivegis.com'],
  rejected: [],
  response: '250 OK'
}
```

### Check Backend Logs

**Production (via SSH):**
```bash
# View live logs
pm2 logs backend --lines 100

# Search for contact form logs
pm2 logs backend --lines 500 | grep "Contact Form"

# Search for email service logs
pm2 logs backend --lines 500 | grep "EmailService"
```

**Local Development:**
```bash
npm run start:backend
# Submit contact form and watch console output
```

### Common Log Messages

**"Email service not configured"**
- Cause: No email configuration in database
- Solution: Configure email settings in Admin Panel

**"SMTP configuration incomplete"**
- Cause: Missing SMTP host, port, username, or password
- Solution: Verify all SMTP fields are filled in Admin Panel

**"Authentication failed"**
- Cause: Invalid credentials
- Solution: Verify username and password, use app-specific password if needed

**"Connection timeout"**
- Cause: Cannot connect to SMTP server
- Solution: Check host, port, firewall, and network connectivity

**"Email sent successfully" but not received**
- Check spam folder
- Verify recipient email address
- Check provider's sent mail logs
- Add sender to recipient's safe senders list

---

## Security Notes

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Use app-specific passwords** - More secure than regular passwords
3. **Encrypt sensitive data** - System automatically encrypts SMTP passwords in database
4. **Limit SMTP access** - Use dedicated email account for sending
5. **Monitor logs** - Regularly check for authentication failures or abuse
6. **Rate limiting** - System includes built-in rate limiting for API endpoints

---

## Testing Checklist

- [ ] Email configuration saved in Admin Panel
- [ ] Test email received successfully
- [ ] From email matches authenticated SMTP account
- [ ] Recipient email is correctly configured
- [ ] Contact form submission shows success message
- [ ] Actual email arrives in recipient inbox (not spam)
- [ ] Email contains all form fields and sender information
- [ ] Reply-To header set to form submitter's email
- [ ] Email HTML renders correctly
- [ ] Server logs show successful delivery

---

## Support

If emails are still not working after following this guide:

1. Check server logs for specific error messages
2. Verify all SMTP credentials are correct
3. Test SMTP connection using external tool:
   ```bash
   telnet smtp.zoho.com 587
   # or
   openssl s_client -connect smtp.zoho.com:465
   ```
4. Contact your email provider's support
5. Check server firewall and network configuration

