# Complete Hostinger Deployment Guide (Business Plan + Render Backend)

This guide provides step-by-step instructions to deploy your React + Node.js + MySQL application when your Hostinger **Business** plan only supports **static site hosting** (no Node.js apps). The backend is hosted on **Render**, and the frontend is deployed to Hostinger via the UI.

Follow every step **in order** without skipping.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Part 1: Prepare Domain & SSL](#part-1-prepare-domain--ssl)
3. [Part 2: Hostinger Database Setup](#part-2-hostinger-database-setup)
4. [Part 3: Render Backend Deployment](#part-3-render-backend-deployment)
5. [Part 4: Hostinger Frontend Deployment (UI)](#part-4-hostinger-frontend-deployment-ui)
6. [Part 5: CORS & Environment Validation](#part-5-cors--environment-validation)
7. [Part 6: Verification & Testing](#part-6-verification--testing)
8. [Part 7: Troubleshooting](#part-7-troubleshooting)

---

## Prerequisites

**What you need:**
- Hostinger Business plan (static site hosting only)
- Hostinger File Manager access
- Hostinger MySQL database access
- Domain registered (or ready to point to Hostinger)
- GitHub repository with your code
- Render.com account (free tier ok)

**Estimated time:** 1.5–2.5 hours

---

## Part 1: Prepare Domain & SSL

### Step 1.1: Point Domain to Hostinger

1. In Hostinger, go to **Domains** → **Your Domains**
2. Select your domain
3. Copy the **Nameservers** (usually ns1.hostinger.com, ns2.hostinger.com, etc.)
4. Log in to your domain registrar (GoDaddy, Namecheap, etc.)
5. Update nameservers to Hostinger's nameservers
6. Wait 24–48 hours for DNS propagation

### Step 1.2: Enable SSL Certificate

1. In Hostinger, go to **Security** → **SSL Certificate**
2. Click **Manage SSL**
3. Click **Activate Let's Encrypt SSL** (if not auto-provisioned)
4. Wait for activation (usually 10–30 minutes)

---

## Part 2: Hostinger Database Setup

### Step 2.1: Create MySQL Database

1. In Hostinger, go to **Databases** → **MySQL**
2. Click **Create New Database**
3. Database name: `custom_threads_db`
4. Username: `ct_user`
5. Generate a strong password and **save it**
6. Click **Create Database**

### Step 2.2: Find Database Hostname

The hostname is **NOT shown in the database list**. Get it from phpMyAdmin or use the default:

**Option 1 - Try default first (easiest):**
- Use `localhost` as DB_HOST in Render
- Most Hostinger databases accept connections via `localhost`

**Option 2 - Get exact hostname from phpMyAdmin:**
1. Click **Enter phpMyAdmin** button on your database row
2. Once phpMyAdmin opens, look at the top bar
3. You'll see "Server: mysql####.hostinger.com" or similar
4. Use that full hostname as DB_HOST in Render

**From your screenshot:**
- Database name: `u273796266_agis_dev_db` (use this for DB_DATABASE)
- Username: `u273796266_adaptivegis` (use this for DB_USER)
- Password: whatever you set (use this for DB_PASSWORD)
- Hostname: Try `localhost` first, or get from phpMyAdmin

### Step 2.3: Enable Remote Access (Required for Render)

1. In Hostinger, go to **Databases** → **MySQL**
2. Click your database
3. Find **Remote MySQL** or **Remote Access**
4. Add allowed host: `0.0.0.0/0`

⚠️ This allows any host. If Hostinger supports IP allowlists, you can later restrict it to Render’s IPs.

---

## Part 3: Render Backend Deployment

### Step 3.1: Create Render Web Service

1. Go to https://render.com
2. Sign in with GitHub
3. Click **New +** → **Web Service**
4. Select your repository (`online_store`)
5. Configure:

**Build & Run Settings**
- **Name:** `custom-threads-api`
- **Branch:** `main`
- **Root Directory:** `server`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `node dist/server.js`
- **Runtime:** Node
- **Plan:** Free

### Step 3.2: Add Render Environment Variables (Required Only)

⚠️ **IMPORTANT:** Only set **deployment-time secrets** in Render. Everything else (Stripe, shipping, tax, email) is configured through your **Admin Settings Panel** in the app UI after deployment.

Add these in Render → **Environment**:

```
NODE_ENV=production
DB_HOST=<your Hostinger hostname>
DB_PORT=3306
DB_USER=ct_user
DB_PASSWORD=<your Hostinger DB password>
DB_DATABASE=custom_threads_db
```

**That's it.** Do NOT add SMTP, Stripe, or other business configs here. Those go in the app's admin panel once deployed.

### Step 3.3: Deploy Backend

1. Click **Create Web Service**
2. Wait for build & deploy to finish
3. Copy your Render URL (example: `https://custom-threads-api.onrender.com`)

### Step 3.4: Run Migrations

Render → your service → **Shell**:

```bash
cd /opt/render/project/src/server
npm run migrate
```

---

## Part 4: Configure App Settings (Admin Panel)

After deployment, ALL business configurations go through your app's **Admin Settings Panel**—NOT environment variables.

### Step 4.1: Access Admin Panel

1. Open `https://yourdomain.com/#/admin`
2. Log in with admin credentials
3. Go to **Settings** → **Configuration**

### Step 4.2: Configure Business Settings

In the admin panel, set:

- **Email (SMTP):** Mailtrap, SendGrid, or Gmail credentials
- **Stripe API Key:** For payments
- **Shipping Providers:** EasyPost, Shippo, ShipStation
- **Tax Providers:** TaxJar, Avalara, Zamp
- **From Email/Name:** Notification emails
- **Footer/Contact Info:** Business details
- **Segment Rules:** Customer VIP/At-Risk rules

**Why?** These can change without redeploying. Your database stores these securely, not hardcoded in code or environment.

---

## Part 5: Hostinger Frontend Deployment (UI)

### Step 5.1: Set Frontend Environment Variable

Create `.env.production` locally:

```env
VITE_API_URL=https://custom-threads-api.onrender.com/api
```

Replace with your real Render URL.

### Step 5.2: Deploy with Hostinger GitHub UI

1. Hostinger panel → **GitHub Deployment**
2. Select your repository
3. Configure:
  - **Framework preset:** Vite
  - **Branch:** main
  - **Node version:** 18.x
  - **Root directory:** `/`
4. Click **Change** in **Build and output settings**:
  - **Build command:** `npm install && npm run build`
  - **Output directory:** `dist`
5. Click **Add** in **Environment variables**:
  - **Key:** `VITE_API_URL`
  - **Value:** `https://custom-threads-api.onrender.com/api`
6. Click **Finish Setup** and **Deploy**

### Step 5.3: Add SPA Routing (.htaccess)

In Hostinger File Manager → `/public_html/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [QSA,L]
</IfModule>
```

---

## Part 6: CORS & Environment Validation

### Step 6.1: Allow Hostinger Domain in Backend

Add this in Render environment variables:

```
CORS_ORIGIN=https://yourdomain.com
```

If your backend code reads `CORS_ORIGIN`, redeploy after adding it.

### Step 6.2: Verify Environment Values

Ensure `VITE_API_URL` points to Render and `CORS_ORIGIN` points to Hostinger.

---

## Part 7: Verification & Testing

### Step 7.1: Test Backend API

```powershell
Invoke-WebRequest -Uri "https://custom-threads-api.onrender.com/api/health" -UseBasicParsing
```

### Step 7.2: Test Frontend

1. Open `https://yourdomain.com`
2. Open DevTools (F12)
3. Confirm no CORS errors

### Step 7.3: Test Core Flows

1. Register a new account
2. Log in
3. Add item to cart
4. Checkout (if payment configured)

---

## Part 8: Troubleshooting

### Backend won’t start (Render)

Check Render **Logs** for:
- Invalid DB_HOST
- Wrong DB password
- Missing migration tables

### Frontend shows Network Error

1. Confirm `VITE_API_URL` is correct in Hostinger deploy settings
2. Confirm `CORS_ORIGIN` is set in Render
3. Redeploy both if updated

### Database connection refused

1. Ensure Remote MySQL is enabled
2. Confirm `DB_HOST` and `DB_USER` are correct
3. Allow `0.0.0.0/0` temporarily if needed

---

## Environment Variable Philosophy

**Render (Deployment-Time Only):**
- Database connection (can't change without redeploying)
- Node environment
- CORS origin

**Admin Panel (Runtime, No Redeploy):**
- SMTP credentials
- Payment processors (Stripe)
- Shipping APIs (EasyPost, Shippo, ShipStation)
- Tax services (TaxJar, Avalara, Zamp)
- Email sender name/address
- Business footer info
- Customer segment rules

This separation means you can update configs in production **instantly** without touching servers or code.

---

- [ ] Domain pointing to Hostinger
- [ ] SSL certificate active
- [ ] Hostinger MySQL database created
- [ ] Render backend deployed and healthy
- [ ] Hostinger frontend deployed
- [ ] `VITE_API_URL` set to Render
- [ ] `CORS_ORIGIN` set to Hostinger domain
- [ ] Site loads without errors

---

## You’re Done! 🎉

Your storefront is on Hostinger and your API is running on Render. If you want a single-host solution, upgrade to a VPS or a Hostinger plan with full Node.js apps.
