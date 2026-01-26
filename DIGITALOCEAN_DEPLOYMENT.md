# BFP SafeScape - DigitalOcean Deployment Guide

## 🎯 Overview
This guide will help you deploy your BFP SafeScape application to your DigitalOcean Droplet ($48/month) and connect it to your domain **bfpscberong.app** (from name.com).

---

## 📋 Prerequisites Checklist
- [x] DigitalOcean Droplet ($48/month - likely 4GB RAM, 2 vCPUs)
- [x] Domain: bfpscberong.app (name.com)
- [ ] SSH access to your Droplet
- [ ] Your project code ready to deploy

---

## 🔧 PART 1: Configure DNS at Name.com

### Step 1: Get Your Droplet's IP Address
1. Log in to [DigitalOcean](https://cloud.digitalocean.com/)
2. Go to **Droplets** in the left sidebar
3. Click on your droplet
4. Copy the **IPv4 address** (e.g., `167.99.123.456`)

### Step 2: Configure DNS Records at Name.com
1. Log in to [Name.com](https://www.name.com/)
2. Go to **My Domains** → Click on **bfpscberong.app**
3. Click on **Manage DNS Records**
4. **Delete** any existing A records or CNAME for @ and www
5. Add the following DNS records:

| Type | Host | Answer | TTL |
|------|------|--------|-----|
| A | @ | `YOUR_DROPLET_IP` | 300 |
| A | www | `YOUR_DROPLET_IP` | 300 |

> 💡 Replace `YOUR_DROPLET_IP` with your actual Droplet IP address

6. Click **Save** or **Add Record** for each entry
7. DNS propagation takes 5-30 minutes (sometimes up to 48 hours)

---

## 🖥️ PART 2: Connect to Your Droplet

### Option A: Using SSH (Recommended)
```bash
# From your terminal (PowerShell/CMD on Windows, or use PuTTY)
ssh root@YOUR_DROPLET_IP
```

### Option B: Using DigitalOcean Console
1. Go to your Droplet in DigitalOcean
2. Click **Console** in the top right
3. This opens a web-based terminal

---

## 🚀 PART 3: Server Setup (Run on Droplet)

### Step 1: Update System & Install Dependencies
```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git ufw fail2ban

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git LFS (for model files)
sudo apt install -y git-lfs
git lfs install

# IMPORTANT: Log out and back in for docker group to take effect
exit
```

### Step 2: Reconnect and Verify Docker
```bash
ssh root@YOUR_DROPLET_IP
docker --version
docker-compose --version
```

### Step 3: Configure Firewall
```bash
# Enable UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

---

## 📦 PART 4: Deploy Application

### Step 1: Clone Your Repository
```bash
# Create app directory
mkdir -p ~/apps && cd ~/apps

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/YOUR_USERNAME/berong-safescape.git bfp-berong
cd bfp-berong

# Pull LFS files (for AI models)
git lfs pull
```

### Step 2: Create Environment File
```bash
# Create .env file
nano .env
```

**Paste the following (edit the values):**
```env
# ===========================================
# Database Configuration
# ===========================================
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE
POSTGRES_DB=bfp_berong_prod

# ===========================================
# Application Settings
# ===========================================
NODE_ENV=production
DOMAIN=bfpscberong.app
CORS_ORIGINS=https://bfpscberong.app,https://www.bfpscberong.app,http://localhost,http://nextjs:3000

# ===========================================
# Security (IMPORTANT: Generate new secrets!)
# ===========================================
JWT_SECRET=GENERATE_A_SECURE_32_CHAR_SECRET

# ===========================================
# Optional: AI Features
# ===========================================
GEMINI_API_KEY=your_gemini_api_key_if_you_have_one
```

**To generate secure passwords/secrets:**
```bash
# Generate secure password (run this in another terminal)
openssl rand -base64 32
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Build and Start Services
```bash
# Make sure you're in the project directory
cd ~/apps/bfp-berong

# Build and start all containers
docker-compose -f docker-compose.prod.yml up -d --build

# This will take 5-15 minutes on first run
# Watch the logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 4: Verify Deployment
```bash
# Check running containers
docker ps

# You should see:
# - bfp-nginx (running)
# - bfp-nextjs (running)
# - bfp-postgres (running)
# - bfp-python-backend (running)

# Test locally
curl http://localhost
```

---

## 🔒 PART 5: Setup SSL (HTTPS) with Let's Encrypt

### Step 1: Create SSL-enabled Nginx Config
```bash
# Create certbot directory
mkdir -p ~/apps/bfp-berong/certbot

# Create new nginx config with SSL support
nano ~/apps/bfp-berong/nginx/nginx-ssl.conf
```

**Paste this configuration:**
```nginx
# BFP Berong - Nginx Configuration with SSL

upstream nextjs {
    server nextjs:3000;
    keepalive 32;
}

upstream python_backend {
    server python-backend:8000;
    keepalive 16;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name bfpscberong.app www.bfpscberong.app;
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name bfpscberong.app www.bfpscberong.app;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/bfpscberong.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bfpscberong.app/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss image/svg+xml;
    gzip_comp_level 6;
    
    # Client body size (for file uploads)
    client_max_body_size 50M;
    
    # Proxy timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;
    
    # Health check endpoint
    location /nginx-health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
    
    # Python Backend
    location /backend/ {
        proxy_pass http://python_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /_next/static/ {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Uploaded files
    location /uploads/ {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=86400";
    }
    
    # All other requests to Next.js
    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

**Save:** `Ctrl+X`, `Y`, `Enter`

### Step 2: Create SSL Docker Compose
```bash
nano ~/apps/bfp-berong/docker-compose.ssl.yml
```

**Paste:**
```yaml
# BFP Berong - Production with SSL
# Use: docker-compose -f docker-compose.ssl.yml up -d

services:
  nginx:
    image: nginx:alpine
    container_name: bfp-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      nextjs:
        condition: service_started
      python-backend:
        condition: service_started
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.25'

  certbot:
    image: certbot/certbot
    container_name: bfp-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  postgres:
    image: postgres:15-alpine
    container_name: bfp-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    expose:
      - "5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  nextjs:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bfp-nextjs
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      - BACKEND_URL=http://python-backend:8000
      - GEMINI_API_KEY=${GEMINI_API_KEY:-}
      - JWT_SECRET=${JWT_SECRET}
      - NODE_OPTIONS=--max-old-space-size=1536
    volumes:
      - uploads_data:/app/public/uploads
    expose:
      - "3000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      start_period: 120s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1'

  python-backend:
    build:
      context: ./bfp-simulation-backend
      dockerfile: Dockerfile
    container_name: bfp-python-backend
    restart: unless-stopped
    environment:
      - PYTHONUNBUFFERED=1
      - CORS_ORIGINS=${CORS_ORIGINS:-http://localhost,http://nextjs:3000}
    volumes:
      - simulation_jobs:/app/data
    expose:
      - "8000"
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')"]
      interval: 30s
      timeout: 10s
      start_period: 120s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 3G
          cpus: '2'

volumes:
  postgres_data:
  simulation_jobs:
  uploads_data:

networks:
  default:
    name: bfp-network-prod
```

**Save:** `Ctrl+X`, `Y`, `Enter`

### Step 3: Obtain SSL Certificate

```bash
# First, stop the current deployment
docker-compose -f docker-compose.prod.yml down

# Create required directories
mkdir -p certbot/conf certbot/www

# Start nginx temporarily for certificate verification
docker run -d --name temp-nginx -p 80:80 \
  -v $(pwd)/certbot/www:/var/www/certbot:ro \
  nginx:alpine

# Get SSL certificate
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d bfpscberong.app \
  -d www.bfpscberong.app

# Stop temporary nginx
docker stop temp-nginx && docker rm temp-nginx

# Start with SSL configuration
docker-compose -f docker-compose.ssl.yml up -d --build
```

---

## ✅ PART 6: Verify Everything Works

### Check Services
```bash
# View running containers
docker ps

# Check logs
docker-compose -f docker-compose.ssl.yml logs -f

# Test HTTP redirect
curl -I http://bfpscberong.app

# Test HTTPS
curl -I https://bfpscberong.app
```

### Test in Browser
1. Open https://bfpscberong.app
2. You should see a green padlock 🔒
3. Test main features of your app

---

## 🔄 PART 7: Maintenance Commands

### Update Application
```bash
cd ~/apps/bfp-berong
git pull origin main
git lfs pull
docker-compose -f docker-compose.ssl.yml up -d --build
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.ssl.yml logs -f

# Specific service
docker logs bfp-nextjs -f
docker logs bfp-python-backend -f
docker logs bfp-postgres -f
```

### Restart Services
```bash
docker-compose -f docker-compose.ssl.yml restart
```

### Stop Services
```bash
docker-compose -f docker-compose.ssl.yml down
```

### Backup Database
```bash
docker exec bfp-postgres pg_dump -U bfp_prod_user bfp_berong_prod > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
cat backup_YYYYMMDD.sql | docker exec -i bfp-postgres psql -U bfp_prod_user bfp_berong_prod
```

---

## 🚨 Troubleshooting

### Container not starting
```bash
# Check logs
docker logs bfp-nextjs
docker logs bfp-python-backend

# Restart specific container
docker restart bfp-nextjs
```

### Database connection issues
```bash
# Check if postgres is healthy
docker exec bfp-postgres pg_isready

# View postgres logs
docker logs bfp-postgres
```

### SSL Certificate Issues
```bash
# Check certificate status
docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt certbot/certbot certificates

# Force renew
docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt -v $(pwd)/certbot/www:/var/www/certbot certbot/certbot renew --force-renewal
```

### Out of Memory
```bash
# Check memory usage
docker stats

# If needed, reduce memory limits in docker-compose.ssl.yml
```

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Start services | `docker-compose -f docker-compose.ssl.yml up -d` |
| Stop services | `docker-compose -f docker-compose.ssl.yml down` |
| View logs | `docker-compose -f docker-compose.ssl.yml logs -f` |
| Restart | `docker-compose -f docker-compose.ssl.yml restart` |
| Update code | `git pull && docker-compose -f docker-compose.ssl.yml up -d --build` |
| Check status | `docker ps` |

---

## 🎉 Success!

Your BFP SafeScape application should now be live at:
- **https://bfpscberong.app** ✅
- **https://www.bfpscberong.app** ✅

Both HTTP and www versions will redirect to the secure HTTPS version.
