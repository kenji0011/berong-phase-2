# BFP SafeScape - Production Deployment Guide

> **Last Updated:** February 10, 2026
> **Domain:** bfpscberong.app
> **Provider:** DigitalOcean
> **Budget:** $200 (Feb 11 – Apr 21, 2026)

---

## Table of Contents

1. [Budget & VM Specification](#1-budget--vm-specification)
2. [Architecture Overview](#2-architecture-overview)
3. [Pre-Deployment Checklist](#3-pre-deployment-checklist)
4. [DNS Configuration (Name.com)](#4-dns-configuration-namecom)
5. [Droplet Creation & Initial Setup](#5-droplet-creation--initial-setup)
6. [Application Deployment](#6-application-deployment)
7. [SSL Certificate (Let's Encrypt)](#7-ssl-certificate-lets-encrypt)
8. [Post-Deployment Verification](#8-post-deployment-verification)
9. [Monitoring & Maintenance](#9-monitoring--maintenance)
10. [Troubleshooting](#10-troubleshooting)
11. [Cost Breakdown](#11-cost-breakdown)

---

## 1. Budget & VM Specification

### Budget Summary

| Item | Monthly Cost | 2.3 Months (Feb 11 – Apr 21) |
|------|-------------|-------------------------------|
| DigitalOcean Droplet (SGP1) | $28/mo | $64.40 |
| DigitalOcean Droplet (NYC1) | $24/mo | $55.20 |
| Domain (bfpscberong.app) | Already owned | $0 |
| SSL Certificate (Let's Encrypt) | Free | $0 |
| **Total (Asia/SGP1)** | | **~$65** |
| **Total (America/NYC1)** | | **~$56** |
| **Remaining Budget** | | **$135 – $144** |

### Recommended VM: DigitalOcean Droplet

| Spec | Value |
|------|-------|
| **Plan** | Basic (Regular Intel) |
| **vCPUs** | 2 |
| **RAM** | 4 GB |
| **Storage** | 80 GB SSD |
| **Transfer** | 4 TB/month |
| **OS** | Ubuntu 22.04 LTS |
| **Region** | **SGP1 (Singapore)** — recommended for Philippine users (~30ms latency) |
| **Monthly Cost** | ~$28 (SGP) / ~$24 (NYC) |
| **Swap** | 2 GB (configured post-creation) |

### Why Singapore over America?

| Factor | SGP1 (Singapore) | NYC1 (New York) |
|--------|-------------------|-----------------|
| Latency to Philippines | ~30–50ms | ~200–250ms |
| Monthly cost | ~$28 | ~$24 |
| Extra cost over 2.3 months | +$9.20 | baseline |
| **Recommendation** | **Better UX for 100 PH users** | Cheaper, higher latency |

> **Verdict:** Use **SGP1** — the ~$9 premium across 2.3 months is worth the 5x better latency for Philippine users. Total spend stays well under the $200 budget.

### Resource Limits (Docker Containers on 4GB Droplet)

| Container | Memory Limit | CPU Limit | Purpose |
|-----------|-------------|-----------|---------|
| nginx | 64 MB | 0.15 | Reverse proxy, SSL, rate limiting |
| postgres | 384 MB | 0.50 | PostgreSQL 15 database |
| nextjs | 1 GB | 1.00 | Next.js 15 application |
| python-backend | 2 GB | 1.50 | FastAPI + AI/ML simulation |
| OS + swap | ~600 MB + 2 GB swap | — | Ubuntu 22.04 overhead |
| **Total** | **~3.45 GB + 2 GB swap** | **3.15** | Fits 4 GB droplet |

---

## 2. Architecture Overview

```
Internet
    │
    ▼
┌─────────────────────────────────┐
│  bfpscberong.app (DNS → DO IP) │
└───────────┬─────────────────────┘
            │ :443 (HTTPS)
            ▼
┌───────────────────────────────────────────────┐
│  nginx (bfp-nginx)                            │
│  - SSL termination (Let's Encrypt)            │
│  - Rate limiting (auth, API, simulation)      │
│  - Gzip compression                           │
│  - Security headers (HSTS, CSP, X-Frame)      │
│  - Reverse proxy                              │
├───────────┬───────────────────────────────────┤
│           │                                   │
│     ┌─────▼──────┐      ┌──────────────────┐  │
│     │  Next.js   │      │  Python Backend  │  │
│     │  :3000     │─────▶│  :8000           │  │
│     │  (SSR/API) │      │  (FastAPI + ML)  │  │
│     └─────┬──────┘      └────────┬─────────┘  │
│           │                      │            │
│     ┌─────▼──────────────────────▼─────────┐  │
│     │  PostgreSQL :5432                    │  │
│     │  (shared database)                   │  │
│     └──────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
          Docker Network: bfp-network-prod
```

---

## 3. Pre-Deployment Checklist

Before deploying, ensure these are completed:

- [x] All configs updated for production (localhost → docker hostnames)
- [x] CORS origins set to `https://bfpscberong.app`
- [x] JWT fallback throws error in production (no dev key)
- [x] nginx CSP includes Facebook SDK origin
- [x] `/backend/` debug proxy disabled in nginx
- [x] Docker resource limits optimized for 4GB droplet
- [x] `.env.production.example` template created
- [x] Code pushed to GitHub
- [ ] DNS A records pointing to droplet IP
- [ ] Droplet created and secured
- [ ] SSL certificate obtained

---

## 4. DNS Configuration (Name.com)

### Step 1: Get Droplet IP

After creating the droplet (Part 5), note the IPv4 address.

### Step 2: Configure DNS Records

1. Log in to [Name.com](https://www.name.com/)
2. Go to **My Domains** → **bfpscberong.app**
3. Click **Manage DNS Records**
4. Delete any existing A/CNAME records for `@` and `www`
5. Add these records:

| Type | Host | Answer | TTL |
|------|------|--------|-----|
| **A** | `@` | `YOUR_DROPLET_IP` | 300 |
| **A** | `www` | `YOUR_DROPLET_IP` | 300 |

6. DNS propagation: 5–30 minutes (up to 48 hours worst case)

### Verify DNS

```bash
# From your local machine
nslookup bfpscberong.app
dig bfpscberong.app +short
```

---

## 5. Droplet Creation & Initial Setup

### Step 1: Create the Droplet

1. Go to [DigitalOcean](https://cloud.digitalocean.com/) → **Create** → **Droplets**
2. Select:
   - **Region:** Singapore (SGP1)
   - **Image:** Ubuntu 22.04 (LTS) x64
   - **Size:** Basic → Regular Intel → **4 GB / 2 vCPUs / 80 GB SSD ($28/mo)**
   - **Authentication:** SSH Key (recommended) or Password
   - **Hostname:** `bfp-safescape-prod`
3. Click **Create Droplet**
4. Note the **IPv4 address**

### Step 2: Initial Server Security

```bash
# SSH into the droplet
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Create a non-root user
adduser deploy
usermod -aG sudo deploy

# Copy SSH keys to new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Configure firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Install fail2ban for brute force protection
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Set timezone (Philippines)
timedatectl set-timezone Asia/Manila
```

### Step 3: Configure Swap (Critical for 4GB Droplet)

```bash
# Create 2GB swap file
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make swap permanent
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Optimize swap behavior
echo 'vm.swappiness=10' | tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | tee -a /etc/sysctl.conf
sysctl -p

# Verify
free -h
```

### Step 4: Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Add deploy user to docker group
usermod -aG docker deploy

# Verify
docker --version
docker compose version

# Switch to deploy user for all remaining steps
su - deploy
```

---

## 6. Application Deployment

### Step 1: Clone Repository

```bash
# As deploy user
cd /home/deploy
git clone https://github.com/Toneejake/berong-safescape.git
cd berong-safescape
```

### Step 2: Create Production .env File

```bash
# Copy the production template
cp .env.production.example .env

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)

# Edit the .env file with your secrets
nano .env
```

**Fill in these values in `.env`:**

```env
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=<paste DB_PASSWORD here>
POSTGRES_DB=bfp_berong
JWT_SECRET=<paste JWT_SECRET here>
DOMAIN=bfpscberong.app
CORS_ORIGINS=https://bfpscberong.app,https://www.bfpscberong.app,http://nextjs:3000
BACKEND_URL=http://python-backend:8000
GEMINI_API_KEY=<your Gemini API key if you have one>
```

### Step 3: Prepare SSL Directory

```bash
# Create certbot directories
mkdir -p certbot/conf certbot/www

# Create temporary self-signed cert for initial nginx start
mkdir -p certbot/conf/live/bfpscberong.app
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout certbot/conf/live/bfpscberong.app/privkey.pem \
  -out certbot/conf/live/bfpscberong.app/fullchain.pem \
  -subj '/CN=bfpscberong.app'
```

### Step 4: Build and Start Services

```bash
# Build all images (first build takes ~10-15 min)
docker compose -f docker-compose.prod.yml build

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# Wait for health checks
sleep 30
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Step 5: Run Database Migrations

```bash
# Run Prisma migrations
docker exec bfp-nextjs npx prisma migrate deploy

# (Optional) Seed initial data
docker exec bfp-nextjs npx prisma db seed
```

---

## 7. SSL Certificate (Let's Encrypt)

### Step 1: Stop nginx temporarily

```bash
docker compose -f docker-compose.prod.yml stop nginx
```

### Step 2: Obtain SSL Certificate

```bash
# Install certbot
sudo apt install -y certbot

# Obtain certificate (standalone mode)
sudo certbot certonly --standalone \
  -d bfpscberong.app \
  -d www.bfpscberong.app \
  --non-interactive \
  --agree-tos \
  --email your-email@example.com

# Copy certs to project directory
sudo cp -rL /etc/letsencrypt/live/bfpscberong.app/ certbot/conf/live/bfpscberong.app/
sudo cp -rL /etc/letsencrypt/archive/bfpscberong.app/ certbot/conf/archive/bfpscberong.app/
sudo chown -R deploy:deploy certbot/
```

### Step 3: Restart nginx

```bash
docker compose -f docker-compose.prod.yml start nginx

# Verify SSL
curl -I https://bfpscberong.app
```

### Step 4: Auto-Renewal Cron Job

```bash
# Add auto-renewal cron (runs twice daily)
sudo crontab -e

# Add this line:
0 3,15 * * * certbot renew --quiet --deploy-hook "cp -rL /etc/letsencrypt/live/bfpscberong.app/ /home/deploy/berong-safescape/certbot/conf/live/bfpscberong.app/ && docker exec bfp-nginx nginx -s reload"
```

---

## 8. Post-Deployment Verification

### Health Checks

```bash
# Container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# Expected output:
# bfp-nginx            Up X minutes (healthy)
# bfp-nextjs           Up X minutes (healthy)
# bfp-python-backend   Up X minutes (healthy)
# bfp-postgres         Up X minutes (healthy)

# Nginx config test
docker exec bfp-nginx nginx -t

# Application health
curl -k https://bfpscberong.app
curl -k https://bfpscberong.app/api/auth/login  # Should return method not allowed (GET)
docker exec bfp-python-backend python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/health').read())"
```

### Functional Tests

1. **Homepage loads:** Visit `https://bfpscberong.app`
2. **Auth works:** Register a new user, login, logout
3. **Admin access:** Login as admin, navigate to Kids/Adult/Professional sections
4. **Simulation works:** Upload floor plan, configure, run simulation
5. **Chatbot works:** Open chatbot, ask a fire safety question
6. **SSL valid:** Check browser padlock icon (green/locked)

### Security Verification

```bash
# Check security headers
curl -I https://bfpscberong.app | grep -E "Strict-Transport|X-Frame|X-Content|Content-Security"

# Check no dev endpoints exposed
curl -k https://bfpscberong.app/backend/docs  # Should return 404 (disabled)

# Check rate limiting works
for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" https://bfpscberong.app/api/auth/login -X POST; done
# Should see 429 after 5 requests
```

---

## 9. Monitoring & Maintenance

### Daily Monitoring (Makefile shortcuts)

```bash
# Check container status
make prod-ps

# Resource usage
make stats

# Health check
make health

# View logs
make prod-logs-nginx    # Nginx access/error logs
make prod-logs-nextjs   # Application logs
make prod-logs-python   # Backend/ML logs
```

### Database Backup (Weekly recommended)

```bash
# Manual backup
make db-backup-prod

# Automated daily backup via cron
sudo crontab -e
# Add:
0 2 * * * cd /home/deploy/berong-safescape && docker exec bfp-postgres pg_dump -U bfp_prod_user bfp_berong > /home/deploy/backups/bfp-$(date +\%Y\%m\%d).sql && find /home/deploy/backups/ -mtime +7 -delete
```

### Updating the Application

```bash
cd /home/deploy/berong-safescape

# Pull latest code
git pull origin main

# Rebuild and restart (Next.js only — most common)
make deploy-nextjs

# Or full rebuild of everything
make deploy-all

# If database schema changed
docker exec bfp-nextjs npx prisma migrate deploy
```

### Server Maintenance

```bash
# Check disk usage
df -h

# Check memory/swap usage
free -h

# Docker cleanup (remove unused images)
make prune

# Update system packages (monthly)
sudo apt update && sudo apt upgrade -y
```

---

## 10. Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs --tail 50 <service_name>

# Common issue: memory limit exceeded
# Solution: Check swap is active
free -h
swapon --show
```

### 502 Bad Gateway

```bash
# nginx can't reach Next.js — check if nextjs container is running
docker ps | grep bfp-nextjs

# If not running, check logs
docker logs bfp-nextjs --tail 50

# Restart
make prod-restart-nextjs
```

### Database connection refused

```bash
# Check postgres container
docker logs bfp-postgres --tail 20

# Verify connection from nextjs
docker exec bfp-nextjs sh -c 'wget -q -O- http://localhost:3000 || echo "App not ready"'
```

### SSL certificate expired

```bash
# Manually renew
sudo certbot renew

# Copy renewed certs
sudo cp -rL /etc/letsencrypt/live/bfpscberong.app/ /home/deploy/berong-safescape/certbot/conf/live/bfpscberong.app/
sudo chown -R deploy:deploy /home/deploy/berong-safescape/certbot/

# Reload nginx
make nginx-reload
```

### Simulation 429 errors

```bash
# Check nginx rate limiting logs
docker logs bfp-nginx 2>&1 | grep "limiting" | tail -20

# Reload nginx with updated config
make nginx-reload
```

---

## 11. Cost Breakdown

### Monthly Costs

| Item | Cost |
|------|------|
| DigitalOcean Droplet (4GB/2vCPU SGP1) | $28/mo |
| Let's Encrypt SSL | Free |
| Domain (bfpscberong.app) | Already paid |
| **Monthly Total** | **$28** |

### Total Projected Cost (Feb 11 – Apr 21, 2026)

| Period | Days | Cost |
|--------|------|------|
| Feb 11 – Feb 28 | 17 days | ~$16.27 |
| March 1 – Mar 31 | 31 days | $28.00 |
| Apr 1 – Apr 21 | 21 days | ~$19.06 |
| **Total** | **~70 days** | **~$63.33** |
| **Remaining Budget** | | **~$136.67** |

### If Using NYC1 (America) Instead

| Period | Days | Cost |
|--------|------|------|
| **Total** | **~70 days** | **~$54.19** |
| **Remaining Budget** | | **~$145.81** |

---

## Quick Reference Commands

```bash
# Deploy updates
git pull origin main && make deploy-nextjs

# Full rebuild
make deploy-all

# View logs
make prod-logs

# Backup database
make db-backup-prod

# Check status
make prod-ps && make health

# Restart everything
make prod-restart

# Nginx reload (config changes)
make nginx-reload

# Shell into containers
make shell-nextjs
make shell-python
make shell-db
```

---

## Files Modified for Production

| File | Change |
|------|--------|
| `middleware.ts` | JWT fallback throws error in production |
| `app/api/simulation/*/route.ts` (3 files) | Backend URL fallback → `python-backend:8000` |
| `bfp-simulation-backend/core/config.py` | DB fallback → `postgres:5432`, CORS → production domain |
| `docker-compose.prod.yml` | CORS production defaults, resource limits for 4GB droplet |
| `docker-compose.ssl.yml` | CORS fixed, healthcheck fixed, DATABASE_URL added |
| `nginx/nginx-ssl.conf` | CSP updated, `/backend/` disabled, `http2 on` directive |
| `.env.production.example` | Complete production template with all required vars |
| `Makefile` | Comprehensive dev/prod/deploy/nginx/db commands |
