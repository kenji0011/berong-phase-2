# 🔥 BFP SafeScape - Complete DigitalOcean Deployment Guide

## Your Details:
- **Droplet IP:** 143.198.217.102
- **Domain:** bfpscberong.app
- **GitHub Repo:** https://github.com/Toneejake/berong-safescape.git

---

# ✅ PREREQUISITE: Changes Already Pushed to GitHub
All deployment files have been pushed to your repo. You're ready to deploy!

---

# 📋 PART 1: Configure DNS at Name.com

## Do This First (Takes 5-30 min to Propagate)

### Step 1: Login
1. Go to **https://www.name.com/**
2. Click **Sign In** (top right)
3. Enter your login credentials

### Step 2: Access DNS Settings
1. Click **My Domains**
2. Click **bfpscberong.app**
3. Click **Manage DNS Records** (or look for "DNS" tab)

### Step 3: Remove Old Records
- If you see any existing A records or CNAME for `@` or `www`, **delete them**

### Step 4: Add These Two Records

**Click "Add Record" and enter:**

| Type | Host | Answer | TTL |
|------|------|--------|-----|
| A | @ | 143.198.217.102 | 300 |

**Click "Add Record"**

**Click "Add Record" again and enter:**

| Type | Host | Answer | TTL |
|------|------|--------|-----|
| A | www | 143.198.217.102 | 300 |

**Click "Add Record"**

### Step 5: Verify Your DNS Records Look Like This:
```
Type    Host    Answer              TTL
A       @       143.198.217.102     300
A       www     143.198.217.102     300
```

### Step 6: Wait for Propagation
- DNS takes 5-30 minutes to propagate
- You can continue with the next steps while waiting

---

# 🖥️ PART 2: Open Droplet Console

1. Go to **https://cloud.digitalocean.com/**
2. Login to your account
3. Click **Droplets** (left sidebar)
4. Click on your droplet (shows IP: 143.198.217.102)
5. Click the blue **Console** button (top right)
6. A terminal window opens in your browser - this is where you'll paste commands

---

# 🔧 PART 3: Install Required Software

**Copy each command below, paste into the Console, and press Enter. Wait for each to complete before running the next.**

### Command 1: Update System
```bash
apt update && apt upgrade -y
```
*Wait 1-2 minutes*

### Command 2: Install Basic Tools
```bash
apt install -y curl git ufw fail2ban git-lfs
```
*Wait 30 seconds*

### Command 3: Install Docker
```bash
curl -fsSL https://get.docker.com | sh
```
*Wait 2-3 minutes*

### Command 4: Install Docker Compose
```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose
```
*Wait 30 seconds*

### Command 5: Setup Git LFS
```bash
git lfs install
```

### Command 6: Verify Everything Installed
```bash
docker --version && docker-compose --version && git --version
```
*You should see version numbers for Docker, Docker Compose, and Git*

### Command 7: Configure Firewall
```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

---

# 📦 PART 4: Clone Your Project

### Command 8: Create Directory and Clone
```bash
mkdir -p /root/apps && cd /root/apps && git clone https://github.com/Toneejake/berong-safescape.git bfp-berong
```
*Wait 1-2 minutes*

### Command 9: Enter Project Folder
```bash
cd /root/apps/bfp-berong
```

### Command 10: Pull Large Files (AI Models)
```bash
git lfs pull
```
*This may take a few minutes if you have large model files*

### Command 11: Verify Files
```bash
ls -la
```
*You should see: docker-compose.prod.yml, docker-compose.ssl.yml, Dockerfile, nginx/, etc.*

---

# ⚙️ PART 5: Create Environment File

### Command 12: Create .env File
```bash
cat > /root/apps/bfp-berong/.env << 'EOF'
# ===========================================
# BFP Berong - Production Environment
# ===========================================

# Database Configuration
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=BfP2026SuperSecurePass!xK9mN2pQ
POSTGRES_DB=bfp_berong_prod

# Application Settings
NODE_ENV=production
DOMAIN=bfpscberong.app
CORS_ORIGINS=https://bfpscberong.app,https://www.bfpscberong.app,http://localhost,http://nextjs:3000

# Security
JWT_SECRET=BfPJwtSecret2026!vR4nD0mK3y@Berong#SafeScape

# Optional: Gemini API Key (add your key if you have one)
GEMINI_API_KEY=
EOF
```

### Command 13: Verify .env Created
```bash
cat /root/apps/bfp-berong/.env
```
*You should see your environment variables*

---

# 🚀 PART 6: Deploy Application (HTTP First)

### Command 14: Make Sure You're in Project Folder
```bash
cd /root/apps/bfp-berong
```

### Command 15: Build and Start Everything
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

⏰ **THIS TAKES 10-20 MINUTES ON FIRST RUN - BE PATIENT!**

### Command 16: Watch the Progress (Optional)
```bash
docker-compose -f docker-compose.prod.yml logs -f
```
*Press Ctrl+C to exit logs when you see "Starting Next.js server..."*

### Command 17: Check All Containers Are Running
```bash
docker ps
```

**You should see 4 containers:**
```
NAMES               STATUS
bfp-nginx           Up
bfp-nextjs          Up (healthy)
bfp-postgres        Up (healthy)
bfp-python-backend  Up
```

### Command 18: Test Locally
```bash
curl -I http://localhost
```
*You should see "HTTP/1.1 200 OK"*

### Step: Test in Browser
Open your browser and go to: **http://143.198.217.102**

**If you see your app, continue to Part 7 for HTTPS!**

---

# 🔒 PART 7: Setup SSL Certificate (HTTPS)

### Command 19: Create Certificate Directories
```bash
cd /root/apps/bfp-berong && mkdir -p certbot/conf certbot/www
```

### Command 20: Stop Nginx Temporarily
```bash
docker stop bfp-nginx
```

### Command 21: Get SSL Certificate
**⚠️ IMPORTANT: Replace `your-email@gmail.com` with YOUR actual email!**

```bash
docker run -it --rm \
  -v /root/apps/bfp-berong/certbot/conf:/etc/letsencrypt \
  -v /root/apps/bfp-berong/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  --email your-email@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d bfpscberong.app \
  -d www.bfpscberong.app
```

**If successful, you'll see:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/bfpscberong.app/fullchain.pem
```

### Command 22: Verify Certificate Files
```bash
ls /root/apps/bfp-berong/certbot/conf/live/bfpscberong.app/
```
*You should see: fullchain.pem, privkey.pem, etc.*

### Command 23: Stop All HTTP Containers
```bash
cd /root/apps/bfp-berong && docker-compose -f docker-compose.prod.yml down
```

### Command 24: Start with SSL Configuration
```bash
docker-compose -f docker-compose.ssl.yml up -d --build
```
*Wait 2-5 minutes for containers to start*

### Command 25: Check All Containers Running
```bash
docker ps
```
*Should show 5 containers including bfp-certbot*

### Command 26: Test HTTPS
```bash
curl -I https://bfpscberong.app
```
*Should show "HTTP/2 200" or "HTTP/1.1 200"*

---

# ✅ PART 8: Final Verification

## Test in Your Browser:
1. Open **https://bfpscberong.app**
2. You should see a 🔒 padlock icon (secure connection)
3. Test your app - login, navigate, etc.

## Also Test:
- **https://www.bfpscberong.app** (should work)
- **http://bfpscberong.app** (should redirect to https)

---

# 🎉 CONGRATULATIONS!

Your BFP SafeScape is now live at:
## **https://bfpscberong.app**

---

# 📚 USEFUL COMMANDS REFERENCE

Save these for future use:

### Go to App Folder
```bash
cd /root/apps/bfp-berong
```

### View Logs (All Services)
```bash
docker-compose -f docker-compose.ssl.yml logs -f
```

### View Specific Service Log
```bash
docker logs bfp-nextjs -f
docker logs bfp-python-backend -f
docker logs bfp-postgres -f
docker logs bfp-nginx -f
```

### Restart All Services
```bash
cd /root/apps/bfp-berong && docker-compose -f docker-compose.ssl.yml restart
```

### Stop All Services
```bash
cd /root/apps/bfp-berong && docker-compose -f docker-compose.ssl.yml down
```

### Start All Services
```bash
cd /root/apps/bfp-berong && docker-compose -f docker-compose.ssl.yml up -d
```

### Update App After Code Changes
```bash
cd /root/apps/bfp-berong && git pull origin main && git lfs pull && docker-compose -f docker-compose.ssl.yml up -d --build
```

### Check System Resources
```bash
docker stats
```

### Backup Database
```bash
docker exec bfp-postgres pg_dump -U bfp_prod_user bfp_berong_prod > /root/backup_$(date +%Y%m%d).sql
```

### Renew SSL Certificate (Every 90 Days)
```bash
cd /root/apps/bfp-berong && docker stop bfp-nginx && docker run --rm -v /root/apps/bfp-berong/certbot/conf:/etc/letsencrypt -p 80:80 certbot/certbot renew && docker start bfp-nginx
```

---

# 🚨 TROUBLESHOOTING

## Problem: "Cannot connect to database"
```bash
docker logs bfp-postgres
docker exec bfp-postgres pg_isready
```

## Problem: Site not loading
```bash
docker ps
docker logs bfp-nextjs --tail 50
docker logs bfp-nginx --tail 50
```

## Problem: SSL Certificate Failed
Make sure DNS is pointing to your IP:
```bash
nslookup bfpscberong.app
```
Should return 143.198.217.102

## Problem: Out of Memory
```bash
free -h
docker stats --no-stream
```

## Problem: Container Keeps Restarting
```bash
docker logs bfp-nextjs --tail 100
```

---

# 📞 QUICK CHEAT SHEET

| Task | Command |
|------|---------|
| Start app | `docker-compose -f docker-compose.ssl.yml up -d` |
| Stop app | `docker-compose -f docker-compose.ssl.yml down` |
| Restart | `docker-compose -f docker-compose.ssl.yml restart` |
| Logs | `docker-compose -f docker-compose.ssl.yml logs -f` |
| Status | `docker ps` |
| Update | `git pull && docker-compose -f docker-compose.ssl.yml up -d --build` |
