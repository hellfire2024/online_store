# Render.com + Hostinger Deployment Guide

Complete deployment instructions for hosting your backend on Render.com (free) and frontend on Hostinger.

---

## Part 1: Render.com Backend Deployment

### Step 1: Sign Up for Render

1. Go to https://render.com
2. Click **Get Started** or **Sign Up**
3. Sign up with GitHub (recommended for easier deployment)
4. Authorize Render to access your repositories

### Step 2: Create Web Service

1. Click **New +** → **Web Service**
2. Connect your GitHub repository (`online_store`)
3. Configure the service:

**Basic Settings:**
- **Name:** `custom-threads-api`
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Root Directory:** `server`
- **Runtime:** Node
- **Build Command:** `npm install && npm run build`
- **Start Command:** `node dist/server.js`
- **Instance Type:** Free

### Step 3: Add Environment Variables

Click **Advanced** → **Add Environment Variable** and add each of these:

#### Required Variables:

**NODE_ENV**
- Value: `production`

**DB_HOST**
- Value: Your Hostinger MySQL hostname
- Get from Hostinger: **Databases** → **MySQL** → Click your database → Copy **Hostname**
- Usually looks like: `mysql1234.hostinger.com` or an IP address

**DB_PORT**
- Value: `3306`

**DB_USER**
- Value: `ct_user` (or whatever you created in Hostinger)

**DB_PASSWORD**
- Value: Your MySQL database password from Hostinger
- **IMPORTANT:** Keep this secure

**DB_DATABASE**
- Value: `custom_threads_db` (or your database name)

**FROM_EMAIL**
- Value: `noreply@dev.adaptivegis.com`
- Use your actual domain

**FROM_NAME**
- Value: `Custom Threads`

**SMTP_HOST**
- Value: Choose one of these options:
  - Mailtrap (testing): `smtp.mailtrap.io`
  - SendGrid: `smtp.sendgrid.net`
  - Gmail: `smtp.gmail.com`
  - Hostinger: `smtp.hostinger.com`

**SMTP_PORT**
- Value: Depends on service:
  - Mailtrap: `2525`
  - SendGrid: `587`
  - Gmail: `587`
  - Hostinger: `587`

**SMTP_USER**
- Value: Your SMTP username
- For Gmail: your full email address
- For Mailtrap: Get from https://mailtrap.io dashboard
- For SendGrid: `apikey` (literally the word "apikey")

**SMTP_PASS**
- Value: Your SMTP password
- For Gmail: Use App Password (not your regular password)
- For Mailtrap: Get from dashboard
- For SendGrid: Use your API key

#### Optional Variables (add if using these services):

**EASYPOST_API_KEY**
- Value: Your EasyPost API key (if using shipping)
- Leave blank if not using

**SHIPPO_API_KEY**
- Value: Your Shippo API key (if using shipping)
- Leave blank if not using

**SHIPSTATION_API_KEY**
- Value: Your ShipStation API key (if using shipping)
- Leave blank if not using

**SHIPSTATION_API_SECRET**
- Value: Your ShipStation API secret (if using shipping)
- Leave blank if not using

**STRIPE_API_KEY**
- Value: Your Stripe secret key (if using payments)
- Get from https://dashboard.stripe.com/apikeys

**TAXJAR_API_KEY**
- Value: Your TaxJar API token (if using tax calculation)
- Leave blank if not using

**AVALARA_ACCOUNT_ID**
- Value: Your Avalara account ID (if using tax calculation)
- Leave blank if not using

**AVALARA_LICENSE_KEY**
- Value: Your Avalara license key (if using tax calculation)
- Leave blank if not using

### Step 4: Deploy Backend

1. Click **Create Web Service**
2. Render will:
   - Clone your repository
   - Run `npm install` in the `server` directory
   - Run `npm run build`
   - Start the server with `node dist/server.js`
3. Wait 3-5 minutes for deployment
4. Once deployed, you'll see a URL like: `https://custom-threads-api.onrender.com`

### Step 5: Configure Database Remote Access

Your Render backend needs to connect to Hostinger's MySQL database.

**In Hostinger:**
1. Go to **Databases** → **MySQL**
2. Click on your database
3. Scroll to **Remote MySQL**
4. Click **Manage**
5. Add these Render IP ranges (check Render docs for current IPs):
   ```
   0.0.0.0/0
   ```
   ⚠️ **Note:** This allows all IPs. For better security, contact Render support for their specific IP ranges.

**Alternative - More Secure:**
1. In Hostinger MySQL, click **phpMyAdmin**
2. Go to SQL tab
3. Run:
   ```sql
   CREATE USER 'ct_user'@'%' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON custom_threads_db.* TO 'ct_user'@'%';
   FLUSH PRIVILEGES;
   ```
   This creates a user that can connect from any host.

### Step 6: Run Database Migrations

**Option A - Using Render Shell:**
1. In Render dashboard, go to your web service
2. Click **Shell** tab
3. Run:
   ```bash
   cd /opt/render/project/src/server
   npm run migrate
   ```

**Option B - Using phpMyAdmin:**
1. Open your `server/migrations` folder locally
2. Find your migration SQL files
3. Go to Hostinger **phpMyAdmin**
4. Select your database
5. Go to **SQL** tab
6. Copy/paste the migration SQL and execute

### Step 7: Test Backend API

Once deployed, test your API:

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://custom-threads-api.onrender.com/api/health" -UseBasicParsing

# Should return JSON with status: "ok"
```

---

## Part 2: Hostinger Frontend Deployment

### Step 1: Update Frontend Environment

On your local machine, create `.env.production`:

```env
VITE_API_URL=https://custom-threads-api.onrender.com/api
```

**IMPORTANT:** Replace with your actual Render URL from Step 4 above.

### Step 2: Build Frontend

```powershell
cd c:\Temp\online_store
npm install
npm run build
```

This creates a `dist/` folder with your production build.

### Step 3: Deploy to Hostinger (Option A - GitHub)

**Using the GitHub deployment interface you showed:**

1. In Hostinger panel, go to **GitHub deployment**
2. Configure:
   - **Framework preset:** Vite
   - **Branch:** main
   - **Node version:** 18.x
   - **Root directory:** `/`
3. Click **Change** on "Build and output settings":
   - **Build command:** `npm install && npm run build`
   - **Output directory:** `dist`
4. Click **Add** on "Environment variables":
   - **Key:** `VITE_API_URL`
   - **Value:** `https://custom-threads-api.onrender.com/api`
5. Click **Finish Setup**
6. Hostinger will build and deploy automatically

### Step 3: Deploy to Hostinger (Option B - File Manager)

**Manual upload:**

1. Go to Hostinger **File Manager**
2. Navigate to `/public_html/`
3. Delete any existing files (except `.htaccess` if it exists)
4. Upload all files from your local `dist/` folder:
   - `index.html`
   - `assets/` folder (all files)
5. Create `.htaccess` file (if not exists) with this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [QSA,L]
</IfModule>

# Enable CORS for API requests
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
</IfModule>

# Gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json
</IfModule>
```

---

## Part 3: Final Configuration

### Update CORS on Backend

Render backend needs to allow requests from your Hostinger domain.

**Option 1 - Add to Render Environment Variables:**

Add this variable in Render dashboard:

**CORS_ORIGIN**
- Value: `https://dev.adaptivegis.com`

**Option 2 - Update server code** (if not already configured):

In your `server/src/index.ts` or `server/src/app.ts`, ensure:

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://dev.adaptivegis.com',
  credentials: true
}));
```

### Test Full Application

1. Open `https://dev.adaptivegis.com` in browser
2. Open DevTools (F12) → Console
3. Should see no errors
4. Test features:
   - Browse products
   - Register account
   - Login
   - Add to cart
   - Checkout (if Stripe configured)

---

## Troubleshooting

### Backend won't start on Render

**Check logs:**
1. Render dashboard → Your service
2. Click **Logs** tab
3. Look for errors

**Common issues:**
- Database connection failed → Check DB_HOST, DB_USER, DB_PASSWORD
- Port already in use → Render assigns PORT automatically (don't hardcode 5000)
- Build failed → Check `server/package.json` has correct build script

### Frontend shows "Network Error"

**Check CORS:**
1. Browser DevTools → Console
2. If you see "CORS policy" error:
   - Add CORS_ORIGIN to Render env vars
   - Redeploy backend

**Check API URL:**
1. In browser console, run:
   ```javascript
   console.log(import.meta.env.VITE_API_URL)
   ```
2. Should show your Render URL
3. If wrong, rebuild frontend with correct `.env.production`

### Database connection refused

**In Render logs, if you see "ECONNREFUSED":**

1. Go to Hostinger → Databases → Remote MySQL
2. Ensure remote access is enabled
3. Add `0.0.0.0/0` to allowed hosts (or Render's IP range)
4. Restart Render service

### Render service sleeps (free tier)

Free tier spins down after 15 minutes of inactivity. First request takes ~30 seconds to wake up.

**Solutions:**
1. Upgrade to paid tier ($7/month for always-on)
2. Use a monitoring service to ping your API every 10 minutes
3. Accept the cold start delay

---

## Cost Summary

**Hostinger (you already have):**
- Business plan: ~$3-5/month
- Includes: MySQL database, static site hosting, domain

**Render.com:**
- Free tier: $0/month
  - 750 hours/month compute
  - Spins down after 15 min inactivity
  - Shared CPU/RAM
- Starter tier: $7/month
  - Always-on
  - Dedicated resources

**Total:** $3-5/month (if using free Render tier)

---

## Maintenance

**Update Backend Code:**
1. Push changes to GitHub
2. Render auto-deploys on push (if enabled)
3. Or manually click **Deploy** in Render dashboard

**Update Frontend Code:**
1. Push changes to GitHub
2. Hostinger auto-deploys if GitHub integration enabled
3. Or rebuild locally and upload via File Manager

**Database Backups:**
Set up in Hostinger:
- Hostinger → Databases → Backups
- Enable automatic daily backups

---

## Environment Variables Quick Reference

Copy this checklist when setting up Render:

```
✅ NODE_ENV=production
✅ DB_HOST=mysql####.hostinger.com
✅ DB_PORT=3306
✅ DB_USER=ct_user
✅ DB_PASSWORD=your_db_password
✅ DB_DATABASE=custom_threads_db
✅ FROM_EMAIL=noreply@yourdomain.com
✅ FROM_NAME=Custom Threads
✅ SMTP_HOST=smtp.mailtrap.io
✅ SMTP_PORT=2525
✅ SMTP_USER=your_smtp_user
✅ SMTP_PASS=your_smtp_pass
✅ CORS_ORIGIN=https://dev.adaptivegis.com
⬜ STRIPE_API_KEY=sk_live_... (optional)
⬜ EASYPOST_API_KEY=... (optional)
⬜ SHIPPO_API_KEY=... (optional)
⬜ TAXJAR_API_KEY=... (optional)
```

Replace values with your actual credentials!
