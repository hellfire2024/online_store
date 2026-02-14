# Hostinger VPS Deployment Guide (Coolify, Docker, Traefik)

This guide explains how to deploy your full-stack app (Node.js/Express backend, React/Vite frontend, MySQL, Traefik) on a Hostinger VPS using Coolify for automated Docker Compose orchestration.

---

## Table of Contents

1. Prerequisites
2. VPS Provisioning & Initial Setup
3. DNS & Domain Configuration
4. Install Docker & Docker Compose
5. Install Coolify
6. Coolify Initial Setup
7. Deploying Your App with Coolify
8. Environment Variables & Secrets
9. SSL & Traefik
10. Verification & Testing
11. Troubleshooting

---

## 1. Prerequisites

- Hostinger VPS (Ubuntu 22.04 recommended)
- Root SSH access to VPS
- Registered domain (e.g., dev.adaptivegis.com)
- GitHub repository with your app code

---

## 2. VPS Provisioning & Initial Setup

1. Order a Hostinger VPS (choose Ubuntu 22.04 LTS for best compatibility).
2. Set a strong root password.
3. SSH into your VPS:
   ```sh
   ssh root@<your-vps-ip>
   ```
4. (Optional) Create a new user and disable root SSH for security.
5. Update system:
   ```sh
   apt update && apt upgrade -y
   ```

---

## 3. DNS & Domain Configuration

1. In your domain registrar, set an A record:
   - **Host:** dev (or @ for root domain)
   - **Type:** A
   - **Value:** <your-vps-ip>
2. (Optional) Add a wildcard CNAME or A record for subdomains if needed.
3. Wait for DNS propagation (can take up to 1 hour).

---

## 4. Install Docker & Docker Compose

On your VPS:

```sh
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

---

## 5. Install Coolify

Coolify is a self-hosted PaaS for Docker Compose apps.

```sh
docker run -d \
  --name coolify \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v coolify-data:/app/data \
  coollabsio/coolify:latest
```

Access Coolify at http://<your-vps-ip>:3000 and complete the web onboarding (set admin email/password).

---

## 6. Coolify Initial Setup

1. Log in to Coolify web UI (http://<your-vps-ip>:3000).
2. Add your VPS as a "Server" (should auto-detect localhost).
3. Add your GitHub repository as a "Source" (connect via OAuth or deploy key).
4. Create a new "Application" and select Docker Compose as the deployment type.
5. Paste your docker-compose.yaml contents or point to the file in your repo.

---

## 7. Deploying Your App with Coolify

1. Configure environment variables for backend, frontend, and MySQL as needed (see .env.example or your docker-compose.yaml).
2. Set up build and run commands if prompted (Coolify auto-detects for most Node/React apps).
3. Set the domain for your frontend (e.g., dev.adaptivegis.com) in the Coolify app settings.
4. Deploy the app from the Coolify dashboard.
5. Coolify will build, start, and monitor your containers automatically.

---

## 8. Environment Variables & Secrets

Set all sensitive values (DB credentials, API keys, etc.) in Coolify's environment variable UI for each service. Example for backend:

```
NODE_ENV=production
DB_HOST=mysql
DB_PORT=3306
DB_USER=adaptivegis-dev
DB_PASSWORD=your_db_password
DB_NAME=agis_dev_db
CORS_ORIGIN=https://dev.adaptivegis.com
```

For frontend, set:

```
VITE_API_URL=https://devapi.adaptivegis.com/api
```

---

## 9. SSL & Traefik

Coolify uses Traefik for automatic SSL and reverse proxy.

1. In Coolify, set your domain for the frontend and backend services.
2. Enable "Auto SSL" (Let's Encrypt) in the domain settings.
3. Traefik will automatically provision and renew SSL certificates.
4. Ensure your docker-compose.yaml has the correct Traefik labels for each service (see example below):

```
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.frontend.rule=Host(`dev.adaptivegis.com`)"
  - "traefik.http.routers.frontend.entrypoints=websecure"
  - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
  - "traefik.http.services.frontend.loadbalancer.server.port=80"
```

---

## 10. Verification & Testing

1. Visit https://dev.adaptivegis.com and https://devapi.adaptivegis.com to verify both frontend and backend are live.
2. Use browser DevTools to check for CORS errors and network issues.
3. Test all app flows (register, login, checkout, etc.).
4. Check Coolify dashboard for container health and logs.

---

## 11. Troubleshooting

- **App not reachable:**
  - Check DNS propagation (https://dnschecker.org)
  - Ensure ports 80/443 are open in VPS firewall (use ufw or your provider's panel)
- **SSL not working:**
  - Double-check domain in Coolify and that "Auto SSL" is enabled
  - Check Traefik logs in Coolify
- **Database errors:**
  - Ensure MySQL container is healthy and credentials match
- **Build failures:**
  - Check Coolify build logs for errors
- **CORS issues:**
  - Confirm CORS_ORIGIN and VITE_API_URL are set correctly

---

## Checklist

- [ ] VPS provisioned and accessible via SSH
- [ ] Docker & Docker Compose installed
- [ ] Coolify running and accessible
- [ ] DNS A records set for all domains
- [ ] App deployed via Coolify
- [ ] SSL active (https)
- [ ] All environment variables set
- [ ] Site loads and works as expected

---

## You’re Done! 🎉

Your app is now fully deployed on a Hostinger VPS with Coolify, Docker Compose, and Traefik. All updates and redeploys can be managed via the Coolify dashboard.
