# BFP Berong - Secure Redeployment Guide

## Context: Why This Redeployment Is Needed

The previous GCP VM (`bfp-safescape`, IP `35.247.149.240`) was compromised and flagged for performing DoS attacks. This is the **second time** the system was compromised (first was DigitalOcean). Root cause analysis identified multiple application-layer vulnerabilities that enabled the attacks.

## What Was Fixed (Security Hardening)

### Critical Fixes Applied

| # | Fix | File(s) |
|---|-----|---------|
| 1 | **Removed JWT fallback key** — middleware now fails closed instead of using predictable `fallback-dev-key` | `middleware.ts` |
| 2 | **Admin password no longer resets on restart** — seed script only creates admin if not exists | `prisma/seed-production.js` |
| 3 | **Test accounts removed from production** — only created when `NODE_ENV !== production` | `prisma/seed-production.js` |
| 4 | **Authentication added to simulation API** — prevents unauthenticated CPU-exhaustion attacks | `app/api/simulation/run-simulation/route.ts` |
| 5 | **Authentication added to image processing API** — prevents unauthenticated file upload abuse | `app/api/simulation/process-image/route.ts` |
| 6 | **Authentication added to chatbot API** — prevents Gemini API key billing abuse | `app/api/chatbot/ai-response/route.ts` |
| 7 | **Authentication added to notifications API** — fixes IDOR vulnerability (users could read others' notifications) | `app/api/notifications/route.ts`, `app/api/notifications/[id]/route.ts` |
| 8 | **Grid size validation** — simulation endpoint now rejects grids > 200x200 (prevents memory exhaustion) | `app/api/simulation/run-simulation/route.ts` |
| 9 | **Simulation rate limit tightened** — 1 request/minute per IP (was 2) | `nginx/nginx-ssl.conf` |
| 10 | **New chatbot rate limit** — 5 requests/minute per IP | `nginx/nginx-ssl.conf` |
| 11 | **Connection limits added** — max 50 concurrent connections per IP | `nginx/nginx-ssl.conf` |
| 12 | **Reduced max body size** — 15MB (was 50MB) | `nginx/nginx-ssl.conf` |
| 13 | **Security headers inherited in all locations** — fixed nginx `add_header` inheritance bug | `nginx/nginx-ssl.conf` |
| 14 | **Catch-all timeout reduced** — 60s (was 300s, which allowed slow-loris style attacks) | `nginx/nginx-ssl.conf` |
| 15 | **Redundant `prisma generate` removed from entrypoint** — already done at build time | `docker-entrypoint.sh` |
| 16 | **Database retry loop** — replaces fragile `sleep 3` with proper DB readiness check | `docker-entrypoint.sh` |
| 17 | **SQL dump restore support** — skips seeding if DB already has data from dump | `docker-entrypoint.sh` |

### New Files Created

| File | Purpose |
|------|---------|
| `lib/auth-guard.ts` | Reusable `requireAuth()` and `requireRole()` helpers for API route authentication |
| `scripts/gcp-deploy.sh` | Comprehensive GCP deployment script with full security hardening |
| `scripts/init-db.sh` | PostgreSQL initialization script that restores from SQL dump |

## Infrastructure Security Enhancements

### SSH Access
- SSH only via **Google IAP Tunnel** (no direct SSH from internet)
- `PermitRootLogin no`, `PasswordAuthentication no`, `MaxAuthTries 3`
- Session timeout after 10 minutes idle

### Firewall (GCP + UFW)
- **Egress filtering** — only HTTP/HTTPS/DNS outbound allowed (blocks VM from being used as DDoS source)
- SSH restricted to IAP CIDR range (`35.235.240.0/20`) only
- UFW default deny incoming AND outgoing
- Docker internal networking explicitly allowed

### Kernel Hardening
- SYN flood protection enabled
- IP spoofing prevention (reverse path filtering)
- ICMP redirects disabled
- IPv6 disabled (reduces attack surface)
- Connection tracking limits

### Docker Daemon Hardening
- `no-new-privileges` enforced globally
- User namespace remapping (`userns-remap: default`)
- Inter-container communication disabled (`icc: false`)
- Log rotation enforced at daemon level
- Process/file limits (`ulimits`)

### Monitoring & Audit
- Fail2Ban with SSH monitoring (7200s ban after 3 attempts)
- `auditd` monitoring Docker, SSH config, and passwd/shadow changes
- Unattended security updates enabled

## Deployment Steps

### Prerequisites
1. `gcloud` CLI installed and authenticated
2. Access to GCP project `berong`
3. Domain `bfpscberong.app` DNS access

### Option A: Automated Deployment (Recommended)

```bash
# From your local machine
chmod +x scripts/gcp-deploy.sh
./scripts/gcp-deploy.sh
```

The script will:
1. Reserve a new static IP
2. Prompt you to update DNS
3. Create a new hardened VM
4. Install Docker, harden SSH/UFW/Fail2Ban/kernel
5. Clone the repo and generate secrets
6. Build and deploy all containers
7. Set up SSL with Let's Encrypt
8. Configure cron jobs (backups, cert renewal, cleanup)

### Option B: Manual Step-by-Step

#### 1. Reserve New Static IP
```bash
gcloud config set project berong
gcloud compute addresses create bfp-static-ip-v2 --region=asia-southeast1
gcloud compute addresses describe bfp-static-ip-v2 --region=asia-southeast1 --format="value(address)"
```

#### 2. Update DNS (Name.com)
- A record `@` → new IP
- A record `www` → new IP
- TTL: 300

#### 3. Create VM
```bash
gcloud compute instances create bfp-safescape-v2 \
    --zone=asia-southeast1-b \
    --machine-type=e2-standard-2 \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=30GB \
    --boot-disk-type=pd-balanced \
    --address=bfp-static-ip-v2 \
    --tags=http-server,https-server,ssh-iap,restricted-egress \
    --metadata=enable-oslogin=TRUE \
    --shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring
```

#### 4. SSH via IAP
```bash
gcloud compute ssh bfp-safescape-v2 --zone=asia-southeast1-b --tunnel-through-iap
```

#### 5. On the VM
```bash
# Install Docker
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin git-lfs certbot

# Clone repo
git clone https://github.com/Toneejake/berong-safescape.git
cd berong-safescape
git lfs pull

# Create .env
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/' | head -c 40)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '=+/' | head -c 80)
cat > .env << EOF
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=bfp_berong_prod
JWT_SECRET=$JWT_SECRET
GEMINI_API_KEY=AIzaSyCbFsMBnoiQhBW8eT0HlwHUWblNE7XMV2U
CORS_ORIGINS=https://bfpscberong.app,https://www.bfpscberong.app,http://nextjs:3000
EOF
chmod 600 .env

# Make init script executable
chmod +x scripts/init-db.sh

# Build and deploy
docker compose -f docker-compose.prod.yml up -d --build

# SSL (after containers are running)
docker compose -f docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone \
    -d bfpscberong.app -d www.bfpscberong.app \
    --email evangelistajohnkervin@gmail.com \
    --agree-tos --no-eff-email
sudo cp -rL /etc/letsencrypt/live ~/berong-safescape/certbot/conf/live
sudo cp -rL /etc/letsencrypt/archive ~/berong-safescape/certbot/conf/archive
sudo chown -R $USER:$USER ~/berong-safescape/certbot/
docker compose -f docker-compose.prod.yml start nginx
```

## Database: Using the SQL Dump

The `Database-bfp-berong.sql` file contains a complete database dump with all existing data (users, images, content, assessments, etc.). The deployment is configured to:

1. **PostgreSQL container initialization**: When the `postgres_data` volume is empty (first boot), PostgreSQL runs `scripts/init-db.sh` which detects and restores the dump file
2. **Prisma migrations**: The Next.js entrypoint runs `prisma migrate deploy` which applies any schema changes
3. **Smart seeding**: The entrypoint checks if the database already has data (from the dump) and skips seeding if so

This means the SQL dump takes priority over the seed script, preserving all existing data including uploaded images, user accounts, assessment results, etc.

## Post-Deployment Checklist

- [ ] Verify `https://bfpscberong.app` loads correctly
- [ ] Change admin password immediately after login
- [ ] Rotate the Gemini API key in Google AI Studio
- [ ] Test simulation (requires authentication now)
- [ ] Test chatbot (requires authentication now)
- [ ] Verify SSL certificate (`certbot certificates`)
- [ ] Submit GCP abuse appeal for old VM
- [ ] Delete old compromised VM: `gcloud compute instances delete bfp-safescape --zone=asia-southeast1-b`
- [ ] Delete old static IP: `gcloud compute addresses delete bfp-static-ip --region=asia-southeast1`
- [ ] Monitor logs for 24h: `docker compose -f docker-compose.prod.yml logs -f`

## Ongoing Operations

```bash
# SSH (always via IAP)
gcloud compute ssh bfp-safescape-v2 --zone=asia-southeast1-b --tunnel-through-iap

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart a service
docker compose -f docker-compose.prod.yml restart nextjs

# Manual backup
docker exec bfp-postgres pg_dump -U bfp_prod_user bfp_berong_prod | gzip > ~/backups/manual_$(date +%Y%m%d_%H%M%S).sql.gz

# Update code
cd ~/berong-safescape
git pull origin main
git lfs pull
docker compose -f docker-compose.prod.yml up -d --build
```
