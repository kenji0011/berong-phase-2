# BFP SafeScape - Production Deployment Guide (GCP)

> **Last Updated:** February 10, 2026  
> **Domain:** bfpscberong.app  
> **Provider:** Google Cloud Platform (Compute Engine)  
> **Budget:** $200 (Feb 11 – Apr 21, 2026)  
> **Previous Provider:** DigitalOcean (COMPROMISED — DDoS attack, malicious software installed)

---

## Table of Contents

1. [Budget & VM Specification](#1-budget--vm-specification)
2. [Architecture Overview](#2-architecture-overview)
3. [Security Hardening (Post-Compromise)](#3-security-hardening-post-compromise)
4. [GCP Project Setup](#4-gcp-project-setup)
5. [VM Creation & Firewall](#5-vm-creation--firewall)
6. [Initial Server Setup](#6-initial-server-setup)
7. [DNS Configuration (Name.com)](#7-dns-configuration-namecom)
8. [Application Deployment](#8-application-deployment)
9. [SSL Certificate (Let's Encrypt)](#9-ssl-certificate-lets-encrypt)
10. [Post-Deployment Verification](#10-post-deployment-verification)
11. [Monitoring & Maintenance](#11-monitoring--maintenance)
12. [Troubleshooting](#12-troubleshooting)
13. [Cost Breakdown](#13-cost-breakdown)

---

## 1. Budget & VM Specification

### Budget Summary

| Item | Monthly Cost | 2.3 Months (Feb 11 – Apr 21) |
|------|-------------|-------------------------------|
| e2-standard-2 VM (2 vCPU, 8GB RAM) | ~$49.92 | ~$114.82 |
| 30GB Balanced Persistent Disk | ~$3.00 | ~$6.90 |
| Static External IP | $0 (while attached) | $0 |
| Network Egress (~5GB/mo) | ~$0.60 | ~$1.38 |
| **Total** | **~$53.52** | **~$123.10** |
| **Remaining Budget** | | **~$76.90** |

> **Region:** asia-southeast1 (Singapore) — lowest latency for Philippines  
> **Headroom:** ~$77 buffer for unexpected egress or debugging

### VM Specifications

| Resource | Allocation |
|----------|------------|
| vCPUs | 2 |
| RAM | 8 GB |
| Disk | 30 GB Balanced SSD |
| OS | Ubuntu 22.04 LTS |
| Region | asia-southeast1-b |

### Docker Resource Limits (8GB RAM)

| Container | Memory Limit | CPU Limit |
|-----------|-------------|-----------|
| Nginx | 128 MB | 0.25 |
| PostgreSQL | 512 MB | 0.5 |
| Next.js | 2 GB | 1.5 |
| Python Backend | 3 GB | 1.5 |
| **Total Allocated** | **5.6 GB** | **3.75** |
| **OS/Docker Overhead** | ~2.4 GB | — |

---

## 2. Architecture Overview

```
Internet
    │
    ▼
[GCP Firewall] ── Only ports 80, 443, 22
    │
    ▼
[Nginx :80/:443] ── SSL termination, rate limiting, security headers
    │
    ├──► [Next.js :3000] ── SSR frontend + API routes
    │         │
    │         └──► [PostgreSQL :5432] ── Database (internal only)
    │
    └──► [Python Backend :8000] ── AI/ML simulation (internal only)
              │
              └──► [PostgreSQL :5432]
```

All services run in Docker containers on a single VM.  
PostgreSQL is **never** exposed externally — only accessible within the Docker network.

---

## 3. Security Hardening (Post-Compromise)

### What Happened on DigitalOcean

The previous DigitalOcean droplet was compromised and used in a DDoS attack (92,774 pps). Malicious software was installed. Root causes identified:

1. **PostgreSQL exposed on port 5432** with default credentials (`bfp_user`/`bfp_secret_password`)
2. **Admin API routes had NO server-side authentication** — anyone could list users, change roles, upload files
3. **Deploy scripts committed to git** with hardcoded production passwords
4. **Default credential fallbacks** in Docker Compose and Python config

### Security Fixes Applied

| Fix | Status |
|-----|--------|
| All 15 admin API routes now require JWT + admin role verification | ✅ |
| PostgreSQL only uses `expose` (never `ports`) — no external access | ✅ |
| All default credential fallbacks removed from Docker Compose | ✅ |
| Python backend exits on startup if `DATABASE_URL` not set | ✅ |
| Deploy scripts with hardcoded secrets deleted | ✅ |
| FastAPI docs/OpenAPI disabled in production | ✅ |
| File upload validation (10MB limit, MIME type check) on Python backend | ✅ |
| Path traversal prevention in file-utils.ts | ✅ |
| Password minimum increased from 6 to 8 characters | ✅ |
| Nginx `server_tokens off` hides version info | ✅ |
| Rate limiting on auth, API, and simulation endpoints | ✅ |

### GCP-Specific Security (Applied During Setup)

- **VPC Firewall:** Only ports 22 (SSH), 80, 443 open
- **OS Login:** Use GCP's managed SSH instead of password auth
- **No root SSH:** Disabled by default on GCP
- **Shielded VM:** Secure Boot + vTPM + Integrity Monitoring enabled
- **Automatic security updates:** Configured via `unattended-upgrades`
- **fail2ban:** Installed to block brute-force SSH attempts

---

## 4. GCP Project Setup

### Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed ([install guide](https://cloud.google.com/sdk/docs/install))
- Domain `bfpscberong.app` registered on Name.com

### Create GCP Project

```bash
# Authenticate
gcloud auth login

# Create project (or use existing)
gcloud projects create bfp-safescape --name="BFP SafeScape"
gcloud config set project bfp-safescape

# Enable billing (link to billing account via Console)
# https://console.cloud.google.com/billing

# Enable Compute Engine API
gcloud services enable compute.googleapis.com
```

---

## 5. VM Creation & Firewall

### Create the VM

```bash
# Reserve a static external IP
gcloud compute addresses create bfp-static-ip \
  --region=asia-southeast1

# Note the IP address
gcloud compute addresses describe bfp-static-ip \
  --region=asia-southeast1 --format="value(address)"

# Create the VM
gcloud compute instances create bfp-safescape \
  --zone=asia-southeast1-b \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-balanced \
  --address=bfp-static-ip \
  --tags=http-server,https-server \
  --metadata=enable-oslogin=TRUE \
  --shielded-secure-boot \
  --shielded-vtpm \
  --shielded-integrity-monitoring
```

### Configure Firewall Rules

```bash
# Allow HTTP (for Let's Encrypt challenge, redirects to HTTPS)
gcloud compute firewall-rules create allow-http \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:80 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server

# Allow HTTPS
gcloud compute firewall-rules create allow-https \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=https-server

# SSH is allowed by default via GCP's default-allow-ssh rule
# Verify no other ports are open:
gcloud compute firewall-rules list --format="table(name,direction,allowed,sourceRanges)"
```

> **CRITICAL:** Do NOT open port 5432, 3000, or 8000. These are Docker-internal only.

### Deny All Other Ingress (Defense in Depth)

```bash
# Block all other incoming traffic with low priority
gcloud compute firewall-rules create deny-all-other \
  --direction=INGRESS \
  --priority=65534 \
  --network=default \
  --action=DENY \
  --rules=all \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server
```

---

## 6. Initial Server Setup

### SSH into the VM

```bash
gcloud compute ssh bfp-safescape --zone=asia-southeast1-b
```

### Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose V2 plugin
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version

# Log out and back in for group changes
exit
```

### Install Security Tools

```bash
gcloud compute ssh bfp-safescape --zone=asia-southeast1-b

# fail2ban — blocks brute-force SSH attempts
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Verify fail2ban is running
sudo fail2ban-client status
```

### Install Certbot

```bash
sudo apt install -y certbot
```

---

## 7. DNS Configuration (Name.com)

Point your domain to the GCP static IP:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | `<STATIC_IP>` | 300 |
| A | www | `<STATIC_IP>` | 300 |

Replace `<STATIC_IP>` with the IP from step 5.

### Verify DNS Propagation

```bash
dig bfpscberong.app +short
dig www.bfpscberong.app +short
```

Wait until both return your static IP before proceeding.

---

## 8. Application Deployment

### Clone Repository

```bash
cd ~
git clone https://github.com/Toneejake/berong-safescape.git
cd berong-safescape
```

### Create Production Environment File

```bash
# CRITICAL: Generate STRONG, UNIQUE credentials
# NEVER reuse the compromised DigitalOcean credentials!

cat > .env << 'EOF'
# === DATABASE ===
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=<GENERATE-A-32-CHAR-RANDOM-PASSWORD>
POSTGRES_DB=bfp_berong_prod

# === AUTH ===
JWT_SECRET=<GENERATE-A-64-CHAR-RANDOM-SECRET>

# === API KEYS ===
GEMINI_API_KEY=<YOUR-NEW-GEMINI-API-KEY>

# === CORS (production domain) ===
CORS_ORIGINS=https://bfpscberong.app,https://www.bfpscberong.app,http://nextjs:3000
EOF

chmod 600 .env
```

**Generate secure passwords:**

```bash
# Database password (32 chars)
openssl rand -base64 32

# JWT secret (64 chars)
openssl rand -base64 64
```

> ⚠️ **CRITICAL:** You MUST rotate the Gemini API key. The old one was exposed in the compromised environment. Revoke it in Google AI Studio and generate a new one.

### Create SSL Certificate Directories

```bash
mkdir -p certbot/conf certbot/www
```

### Build and Deploy

```bash
# Build and start all containers
docker compose -f docker-compose.prod.yml up -d --build

# Wait for containers to be healthy
watch docker compose -f docker-compose.prod.yml ps

# Run database migrations
docker exec -it bfp-nextjs npx prisma migrate deploy

# Seed production data (first deploy only)
docker exec -it bfp-nextjs npx prisma db seed
```

---

## 9. SSL Certificate (Let's Encrypt)

### Obtain Certificate

```bash
# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Get certificate using standalone mode
sudo certbot certonly --standalone \
  -d bfpscberong.app \
  -d www.bfpscberong.app \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# Copy certs to project directory
sudo cp -rL /etc/letsencrypt/live ~/berong-safescape/certbot/conf/live
sudo cp -rL /etc/letsencrypt/archive ~/berong-safescape/certbot/conf/archive
sudo chown -R $USER:$USER ~/berong-safescape/certbot/

# Restart nginx
docker compose -f docker-compose.prod.yml up -d nginx
```

### Auto-Renewal Cron Job

```bash
# Add renewal cron (runs twice daily)
(crontab -l 2>/dev/null; echo "0 3,15 * * * certbot renew --quiet --deploy-hook 'docker compose -f ~/berong-safescape/docker-compose.prod.yml restart nginx'") | crontab -
```

---

## 10. Post-Deployment Verification

### Health Checks

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Test HTTPS
curl -I https://bfpscberong.app

# Test API health
curl https://bfpscberong.app/api/auth/me

# Test that PostgreSQL is NOT externally accessible
# (This should FAIL/timeout — that's CORRECT)
nc -z -w 3 <STATIC_IP> 5432 && echo "DANGER: Postgres exposed!" || echo "OK: Postgres is internal-only"

# Test that Python backend is NOT externally accessible
nc -z -w 3 <STATIC_IP> 8000 && echo "DANGER: Backend exposed!" || echo "OK: Backend is internal-only"

# Test admin API requires auth (should return 401)
curl -s https://bfpscberong.app/api/admin/users | head -20
```

### Security Verification Checklist

- [ ] `curl -I https://bfpscberong.app` shows `server: nginx` (no version number)
- [ ] Accessing `/api/admin/users` without auth returns `{"error":"Not authenticated"}`
- [ ] PostgreSQL port 5432 is not reachable from outside
- [ ] Python backend port 8000 is not reachable from outside
- [ ] `sudo fail2ban-client status sshd` shows fail2ban active
- [ ] `gcloud compute firewall-rules list` shows only 22, 80, 443

### Set Budget Alert

```bash
# In GCP Console: Billing → Budgets & Alerts → Create Budget
# Set amount: $200
# Alert thresholds: 50% ($100), 80% ($160), 100% ($200)
```

---

## 11. Monitoring & Maintenance

### View Logs

```bash
# All containers
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Specific container
docker compose -f docker-compose.prod.yml logs -f nextjs
docker compose -f docker-compose.prod.yml logs -f python-backend
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Database Backup

```bash
# Create backup
docker exec bfp-postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Auto-backup cron (daily at 2 AM)
mkdir -p ~/backups
(crontab -l 2>/dev/null; echo "0 2 * * * cd ~/berong-safescape && docker exec bfp-postgres pg_dump -U bfp_prod_user bfp_berong_prod | gzip > ~/backups/backup_\$(date +\%Y\%m\%d).sql.gz") | crontab -
```

### Update Application

```bash
cd ~/berong-safescape
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker exec -it bfp-nextjs npx prisma migrate deploy
```

### Monitor Resource Usage

```bash
# Docker stats (live)
docker stats

# Disk space
df -h

# Memory
free -h
```

---

## 12. Troubleshooting

### Container Won't Start

```bash
# Check logs for the failing container
docker compose -f docker-compose.prod.yml logs <service-name>

# Common issues:
# - DATABASE_URL not set → Python backend crashes on startup (by design)
# - JWT_SECRET not set → Next.js throws in production (by design)
# - .env file missing → all services fail
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
docker compose -f docker-compose.prod.yml restart nginx
```

### Database Connection Issues

```bash
# Check if postgres is healthy
docker exec bfp-postgres pg_isready

# Connect to database directly
docker exec -it bfp-postgres psql -U bfp_prod_user -d bfp_berong_prod
```

### High Memory Usage

```bash
# Check which container is using most memory
docker stats --no-stream

# If Python backend is OOM, restart it
docker compose -f docker-compose.prod.yml restart python-backend
```

---

## 13. Cost Breakdown

### Monthly Estimate (asia-southeast1)

| Resource | Quantity | Unit Price | Monthly Cost |
|----------|----------|------------|-------------|
| e2-standard-2 sustained use | 730 hrs | ~$0.0684/hr | ~$49.92 |
| Balanced PD (30GB) | 30 GB | ~$0.10/GB | ~$3.00 |
| Static IP (attached) | 1 | $0.00 | $0.00 |
| Egress (5GB/mo estimate) | 5 GB | ~$0.12/GB | ~$0.60 |
| **Monthly Total** | | | **~$53.52** |

### Budget Timeline

| Period | Duration | Cost | Running Total |
|--------|----------|------|---------------|
| Feb 11 – Feb 28 | 17 days | ~$30.35 | $30.35 |
| Mar 1 – Mar 31 | 31 days | ~$53.52 | $83.87 |
| Apr 1 – Apr 21 | 21 days | ~$36.27 | **$120.14** |
| **Remaining Budget** | | | **$79.86** |

> With sustained use discount (~30%), actual cost will be even lower.  
> Budget has significant headroom for unexpected costs.

---

## Credential Rotation Checklist

After the DigitalOcean compromise, these credentials MUST be rotated:

- [ ] **PostgreSQL password** — Generate new 32+ char password (NEVER reuse `bfp_secret_password` or `StrongPassw0rd_2026_BFP!`)
- [ ] **JWT secret** — Generate new 64+ char secret (NEVER reuse `dev-secret-key` or `super_secret_production_key_2026`)
- [ ] **Gemini API key** — Revoke the old key in Google AI Studio, generate new one
- [ ] **GitHub** — Verify no secrets were pushed to the repo; check commit history
- [ ] **SSH** — Use GCP OS Login (no manual SSH keys to manage)

---

## Emergency Procedures

### If Compromise is Suspected

1. **Immediately:** `gcloud compute instances stop bfp-safescape --zone=asia-southeast1-b`
2. Take a snapshot: `gcloud compute disks snapshot bfp-safescape --zone=asia-southeast1-b`
3. Review GCP Audit Logs: Console → Logging → Resource type: `gce_instance`
4. Check for unauthorized firewall rules: `gcloud compute firewall-rules list`
5. Review failed SSH attempts: `sudo journalctl -u sshd | grep Failed`
6. If confirmed: Delete VM, create new from scratch, restore DB from backup

### If Budget Running Low

1. Check billing: Console → Billing → Reports
2. Set budget alert: Console → Billing → Budgets → $200 with alerts at 50%, 80%, 100%
3. If needed, can downgrade to e2-medium (1 vCPU, 4GB, ~$25/mo) temporarily
