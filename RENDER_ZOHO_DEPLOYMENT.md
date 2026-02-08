# Deploying Zoho Mail API to Render

This guide shows how to deploy the Zoho Mail API email configuration to your Render application.

## 🔄 Deployment Steps

### Step 1: Push Code to GitHub
Your code changes have already been committed locally. Push them to GitHub:

```bash
git push origin main
```

### Step 2: Render Deployment (Automatic)
1. Go to your **Render Dashboard**: https://dashboard.render.com
2. Find your **Online Store Backend** service
3. It should automatically detect the new code
4. Wait for deployment to complete (usually 2-3 minutes)

### Step 3: Set Environment Variables in Render

1. In Render Dashboard, go to your backend service
2. Click **Environment** tab
3. Add these environment variables (get values from Zoho setup):

```
ZOHO_ACCOUNT_ID=your_account_id_here
ZOHO_CLIENT_ID=your_client_id_here
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_REFRESH_TOKEN=your_refresh_token_here (optional for testing)
```

4. Click **Save** (triggers automatic redeployment)

### Step 4: Run Database Migration

1. SSH into your Render database or use your database management tool
2. Run the migration:
   ```sql
   -- These columns will be added automatically on next app start
   ALTER TABLE email_config
     ADD COLUMN IF NOT EXISTS zoho_account_id VARCHAR(255),
     ADD COLUMN IF NOT EXISTS zoho_client_id VARCHAR(255),
     ADD COLUMN IF NOT EXISTS zoho_client_secret VARCHAR(500),
     ADD COLUMN IF NOT EXISTS zoho_refresh_token VARCHAR(1000);
   ```

   Or wait for the app to auto-run migrations (if using the migration script in startup)

### Step 5: Configure in Admin Panel

1. Navigate to your production admin panel
2. Go to **Settings** → **Email Configuration**
3. Select **Zoho Mail API (Recommended for Render)**
4. Enter your Zoho credentials:
   - From Email: `noreply@yourdomain.com`
   - From Name: `Your Store`
   - Zoho Account ID: `12345678901234567890`
   - Zoho Client ID: `1000.xxxxxxxxxxxxxxxxxx`
   - Zoho Client Secret: `xxxxxxxxxxxxxxxxxxxxxxxxxx`
   - (Refresh Token auto-filled if set as env var)

5. Click **Save Email Configuration**
6. Click **Test Configuration** and send a test email

### Step 6: Verify Deployment

Test that emails work:

```bash
# Test the Render backend endpoint
$body = @{testEmail = "your.email@example.com"} | ConvertTo-Json
Invoke-WebRequest -Uri "https://your-render-api-url.onrender.com/api/email-config/test" `
  -Method POST -ContentType "application/json" -Body $body
```

Expected success response:
```json
{
  "success": true,
  "message": "Zoho Mail API configuration validated successfully...",
  "provider": "zoho",
  "config": { ... }
}
```

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Render backend auto-deployed
- [ ] Environment variables set in Render:
  - [ ] `ZOHO_ACCOUNT_ID`
  - [ ] `ZOHO_CLIENT_ID`
  - [ ] `ZOHO_CLIENT_SECRET`
  - [ ] `ZOHO_REFRESH_TOKEN` (optional)
- [ ] Database migration applied
- [ ] Zoho credentials entered in admin panel
- [ ] Test email sent successfully
- [ ] Production emails being sent correctly

## 🔍 Monitoring

### Check Render Logs
1. In Render Dashboard, click your backend service
2. Go to **Logs** tab
3. Look for `[Email Test]` or `[Zoho Email]` messages
4. Verify no errors during email sending

### Check Zoho Mail Activity
1. Log into https://mail.zoho.com/
2. Click **Activity** or **Mail Log**
3. Verify emails appear in sent folder
4. Check delivery status

### Environment Variable Verification
1. In Render, click **Environment**
2. Verify all Zoho variables are set
3. Check that they're marked as environment variables (not secrets)

## 🐛 Troubleshooting Deployment Issues

### Issue: "Module not found: axios"
**Solution**: npm packages auto-install on Render. If it fails:
- Manually run `npm install axios` in server folder
- Push changes to GitHub
- Trigger manual redeploy in Render

### Issue: "Environment variable not found"
**Solution**: 
1. Verify variable names are exact (case-sensitive)
2. Click **Save** after adding variables
3. Wait 30 seconds for Render to update
4. Manual redeploy from Render dashboard

### Issue: "Database column not found"
**Solution**:
- Run migration script manually via SSH
- Or restart the Render service to trigger auto-migration

### Issue: "Test email returns 500 error"
**Solution**:
1. Check Render logs for actual error message
2. Verify Zoho credentials are correct
3. Verify from_email domain is verified in Zoho Mail
4. Check Zoho account hasn't hit rate limits

## 📧 Verifying Emails Work

### Send a Test Order
1. Go to your production store
2. Add an item to cart
3. Complete checkout
4. Verify order confirmation email arrives

### Check Email Headers
In the test email you receive:
- From should be: `Your Store <noreply@yourdomain.com>`
- Should have Zoho Mail headers
- Reply-To should point to your domain

## 🔐 Security Notes for Production

1. **Never commit secrets** to GitHub
   - Keep all credentials in environment variables only
   - .gitignore should exclude .env files

2. **Use strong client secret** from Zoho
   - 32+ characters recommended
   - Zoho generates these securely

3. **Rotate credentials periodically**
   - Update client secret in Zoho monthly/quarterly
   - Update environment variables in Render

4. **Monitor failed deliveries**
   - Check Zoho logs for bounces
   - Update invalid email addresses in customer records

## 🚀 Rolling Back (If Needed)

If you need to revert to SMTP or another provider:

```bash
# In Render:
git revert [commit-hash]  # Revert the Zoho commit
git push origin main
```

Then:
1. Switch email provider back to SMTP in admin
2. Re-enter SMTP credentials
3. Test email configuration again

## 📞 Support

For issues with this deployment:
1. Check Render logs for error messages
2. Review `ZOHO_MAIL_API_SETUP.md` for configuration details
3. Verify Zoho Developer Console credentials
4. Check Zoho Mail domain verification status

---

**Deployment Status**: Ready ✅
**Last Updated**: February 2026
