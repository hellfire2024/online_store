# Hostinger Business Plan Deployment Guide

This guide covers deploying your Online Store frontend and backend to Hostinger Business Plan with Node.js support.

## Prerequisites

- ✅ Hostinger Business Plan with Node.js 24.x, 22.x, 20.x, or 18.x
- ✅ MySQL database (included with plan)
- ✅ FTP/SFTP access credentials
- ✅ Zoho Mail account (for SMTP) or alternative SMTP provider

---

## Step 1: Prepare Your Local Environment

### 1.1 Install Dependencies

```bash
# Root directory (frontend)
npm install

# Server directory (backend)
cd server
npm install
cd ..
```

### 1.2 Build Frontend

```bash
npm run build
# Creates: dist/ folder with optimized static files
```

### 1.3 Build Backend

```bash
cd server
npm run build
# Creates: dist/ folder with compiled TypeScript
cd ..
```

---

## Step 2: Prepare Deployment Package

### Option A: Single App (Recommended for less frequent UI changes)

1. **Copy frontend to backend public folder:**
   ```bash
   mkdir -p server/public
   cp -r dist/* server/public/
   ```

2. **Deploy only the `/server` folder to Hostinger**

**How it works:**
- Everything runs as one Node.js app
- Frontend served from `/server/public`
- No CORS complexity
- Restart server when UI changes

### Option B: Split Deployment (Independent updates)

1. **Frontend:** Upload `dist/` folder to your web hosting public directory
2. **Backend:** Upload `server/dist/` to Node.js application directory

---

## Step 3: Upload to Hostinger

### Using File Manager (Web-based)

1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com)
2. Navigate to **File Manager** → **public_html** (or Node.js directory)
3. Upload `/server` contents (or just `/server/dist` + `/server/node_modules`)
4. Ensure `.env` file is uploaded with all credentials

### Using FTP/SFTP (Recommended)

1. Download FileZilla or WinSCP
2. Connect with SFTP credentials from Hostinger
3. Upload:
   - `dist/` folder (compiled backend)
   - `node_modules/` folder (dependencies)
   - `.env` file (**critical - do not commit this**)
   - `package.json`
   - `package-lock.json`

**Important:** Do NOT upload:
- `src/` folder
- `node_modules/.bin/` (Hostinger will handle this)
- `.git/` folder

---

## Step 4: Configure Environment Variables on Hostinger

In **hPanel → Node.js → Environment Variables**, add:

```
# Application
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com

# Database (from Hostinger Control Panel)
DB_HOST=localhost
DB_PORT=3306
DB_USER=hostinger_username_dbuser
DB_PASSWORD=your_db_password
DB_DATABASE=hostinger_username_dbname

# Email (SMTP)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your_zoho_password
SMTP_FROM_NAME=Custom Threads

# Optional
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

**Getting your database credentials:**
1. Hostinger hPanel → Databases → Your Database
2. Copy: Database Name, Database User, Password, Server (localhost)

---

## Step 5: Test SMTP Configuration

Before going live, verify your SMTP settings work.

### Method 1: API Test Endpoint (Recommended)

The backend includes a test endpoint: `POST /api/smtp-test`

**Test locally first:**

```bash
# Terminal 1: Start backend
cd server
npm run start

# Terminal 2: Test SMTP
curl -X POST http://localhost:3001/api/smtp-test \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.zoho.com",
    "port": "465",
    "secure": true,
    "user": "your-email@yourdomain.com",
    "password": "your_zoho_password",
    "from_email": "your-email@yourdomain.com"
  }'
```

**Expected success response:**
```json
{
  "success": true,
  "message": "SMTP connection verified and test email sent",
  "details": {
    "host": "smtp.zoho.com",
    "port": 465,
    "secure": true,
    "connected": true,
    "messageId": "<message-id>",
    "email_to": "your-email@yourdomain.com"
  }
}
```

Check your email - you should receive a test message.

### Method 2: After Deploying to Hostinger

Once deployed to Hostinger, test via:

```bash
curl -X POST https://yourdomain.com/api/smtp-test \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.zoho.com",
    "port": "465",
    "secure": true,
    "user": "your-email@yourdomain.com",
    "password": "your_zoho_password",
    "from_email": "your-email@yourdomain.com"
  }'
```

Or use Postman/Insomnia:
- **URL:** `https://yourdomain.com/api/smtp-test`
- **Method:** POST
- **Body (JSON):**
  ```json
  {
    "host": "smtp.zoho.com",
    "port": "465",
    "secure": true,
    "user": "your-email@yourdomain.com",
    "password": "your_zoho_password",
    "from_email": "your-email@yourdomain.com"
  }
  ```

**If test fails:**

❌ **Error: "SMTP connection failed - credentials invalid"**
- Verify username/password with Zoho Mail
- Check `:` character in password (may need escaping)
- Confirm port 465 is open on Hostinger (contact support if blocked)

❌ **Error: "Connect timeout"**
- Hostinger is blocking port 465 (contact Hostinger support)
- Try port 587 (TLS) instead with `secure: false`

✅ **Success:** You received the test email
- SMTP is working perfectly
- Ready to save config in admin panel

---

## Step 6: Create Email Configuration in Admin Panel

Once SMTP test succeeds:

1. Login to your admin panel: `https://yourdomain.com/admin`
2. Navigate to **Settings** → **Email Configuration**
3. Select Provider: **SMTP**
4. Fill in:
   - **SMTP Host:** `smtp.zoho.com`
   - **SMTP Port:** `465`
   - **SMTP Username:** `your-email@yourdomain.com`
   - **SMTP Password:** `your_zoho_password`
   - **From Email:** `your-email@yourdomain.com`
   - **From Name:** `Custom Threads`
5. Click **Save & Test**

---

## Step 7: Set Up Application in Hostinger Node.js

In **hPanel → Node.js Applications:**

1. Click **Add Application**
2. Configure:
   - **Application Name:** `Online Store Backend`
   - **Node.js Version:** `20.x` (or 22.x/24.x)
   - **Application Root:** `/server` or `/` (depending on upload structure)
   - **Application URL:** Select your domain
   - **Application Startup File:** `dist/server.js`
   - **Package Manager:** npm

3. Click **Create**
4. Restart application from Hostinger hPanel

---

## Step 8: Verify Deployment

### Health Check
```bash
curl https://yourdomain.com/health
# Expected: {"status":"ok","timestamp":"2026-02-08T..."}
```

### API Test
```bash
curl https://yourdomain.com/api/products
# Should return products list or empty array
```

### Frontend Access
- Navigate to `https://yourdomain.com`
- Should load your store homepage
- Check browser console for CORS errors

**If CORS errors appear:**
- Update `CORS_ORIGIN` in environment variables to match your domain
- Restart Node.js application in Hostinger

---

## Step 9: Database Migrations

If this is first deployment, run migrations:

**Via SSH (if available):**
```bash
ssh user@hostinger_server
cd /path/to/app
npx tsx src/db/migrate.ts
```

**Via API Endpoint:**
If you have a migration endpoint, call:
```bash
curl -X POST https://yourdomain.com/api/db-migrate
```

---

## Troubleshooting

### Application won't start
- Check application startup file path (should be `dist/server.js`)
- Verify `package.json` exists in application root
- Check Node.js version compatibility
- View error logs in Hostinger hPanel

### Database connection fails
- Verify `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` in environment variables
- Confirm database exists in Hostinger MySQL
- Test connection locally first with same credentials

### SMTP not sending emails
- Run the `/api/smtp-test` endpoint to debug
- Check spam folder (new SMTP providers often flag first emails)
- Verify `From` email matches SMTP username (common requirement)
- Contact Hostinger if port 465 is blocked

### Frontend not loading or showing blank page
- Check browser Network tab for 404/500 errors
- Verify `CORS_ORIGIN` environment variable
- Ensure frontend was built and deployed with backend
- Clear browser cache and try incognito window

### Too many database connections
- Reduce `DB_POOL_SIZE` in environment if available
- Restart Node.js application
- Check for open connections in Hostinger MySQL panel

---

## Updating Your Application

### For Frontend Changes Only (Option A - Single App):
1. Rebuild frontend: `npm run build`
2. Copy to server: `cp -r dist/* server/public/`
3. Upload `/server/public` folder via FTP
4. No restart needed - server already serving from public

### For Backend Changes:
1. Run `cd server && npm run build`
2. Upload `/server/dist` folder via FTP
3. Restart application in Hostinger hPanel
4. Test health endpoint

### For Both:
1. Build frontend: `npm run build`
2. Copy frontend to server: `cp -r dist/* server/public/`
3. Build backend: `cd server && npm run build`
4. Upload both `/server/public` and `/server/dist`
5. Restart in Hostinger hPanel

---

## Monitoring & Maintenance

### Enable Error Logging
```env
LOG_LEVEL=info
NODE_ENV=production
```

### Regular Backups
- Backup database monthly from Hostinger hPanel
- Backup `.env` file in secure location (never in git)
- Backup uploads folder if using file storage

### Security
- Change admin password regularly
- Update dependencies: `npm audit fix`
- Monitor Hostinger security alerts
- Use strong Zoho Mail app passwords (not account password)

---

## Alternative: If Hostinger Blocks SMTP

If Hostinger blocks port 465/587, switch to SendGrid (free tier available):

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Get API key
3. Update environment:
   ```env
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=your_api_key
   ```
4. Update admin panel: Settings → Email Configuration → Select "SendGrid"

---

## Support Resources

- **Hostinger Help:** https://support.hostinger.com
- **Zoho Mail SMTP:** https://www.zoho.com/mail/help/
- **Node.js Docs:** https://nodejs.org/docs/
- **Express.js:** https://expressjs.com

---

**Last Updated:** February 8, 2026
**Version:** Online Store v1.0
