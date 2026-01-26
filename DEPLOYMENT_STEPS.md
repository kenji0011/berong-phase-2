# BFP SafeScape - Complete Deployment Guide
## Your Droplet IP: 143.198.217.102
## Your Domain: bfpscberong.app

---

# 📋 PART 1: Configure DNS at Name.com (Do This First!)

## Step 1: Login to Name.com
1. Go to https://www.name.com/
2. Click **Sign In** (top right)
3. Enter your credentials

## Step 2: Go to DNS Management
1. Click **My Domains** in the menu
2. Click on **bfpscberong.app**
3. Click **Manage DNS Records** (or "DNS" tab)

## Step 3: Delete Old Records (if any exist)
- Delete any existing **A records** for `@` or `www`
- Delete any **CNAME records** for `@` or `www`

## Step 4: Add New DNS Records
Click **Add Record** and create these TWO records:

### Record 1:
| Field | Value |
|-------|-------|
| Type | A |
| Host | @ |
| Answer | 143.198.217.102 |
| TTL | 300 |

Click **Add Record**

### Record 2:
| Field | Value |
|-------|-------|
| Type | A |
| Host | www |
| Answer | 143.198.217.102 |
| TTL | 300 |

Click **Add Record**

## Step 5: Verify
Your DNS records should look like this:
```
A    @      143.198.217.102    300
A    www    143.198.217.102    300
```

⏰ **Wait 5-10 minutes** for DNS to propagate before continuing.

---

# 🖥️ PART 2: Access Droplet Console

1. Go to https://cloud.digitalocean.com/
2. Click **Droplets** in the left sidebar
3. Click on your droplet (the one with IP 143.198.217.102)
4. Click the **Console** button (top right, blue button)
5. A terminal window will open in your browser

---

# 🔧 PART 3: Server Setup (Copy-Paste These Commands)

## Step 1: Update the System
Copy and paste this command, then press Enter:
```bash
apt update && apt upgrade -y
```
⏰ Wait for it to complete (1-2 minutes)

## Step 2: Install Required Packages
```bash
apt install -y curl git ufw fail2ban
```

## Step 3: Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```
⏰ Wait for it to complete (2-3 minutes)

## Step 4: Install Docker Compose
```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose
```

## Step 5: Install Git LFS (for AI model files)
```bash
apt install -y git-lfs && git lfs install
```

## Step 6: Verify Installations
```bash
docker --version && docker-compose --version && git --version
```
You should see version numbers for all three.

## Step 7: Configure Firewall
```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

---

# 📦 PART 4: Clone Your Project

## Step 1: Create App Directory
```bash
mkdir -p /root/apps && cd /root/apps
```

## Step 2: Clone Repository
⚠️ **IMPORTANT**: Replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub details!

**Option A: If your repo is PUBLIC:**
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git bfp-berong
```

**Option B: If your repo is PRIVATE:**
You need a GitHub Personal Access Token:
1. Go to GitHub.com → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use this command (replace YOUR_TOKEN and YOUR_USERNAME):
```bash
git clone https://YOUR_TOKEN@github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git bfp-berong
```

## Step 3: Enter Project Directory
```bash
cd /root/apps/bfp-berong
```

## Step 4: Pull Large Files (AI Models)
```bash
git lfs pull
```

## Step 5: Verify Files
```bash
ls -la
```
You should see files like: `docker-compose.prod.yml`, `Dockerfile`, `package.json`, etc.

---

# ⚙️ PART 5: Create Environment File

## Step 1: Create .env File
```bash
nano /root/apps/bfp-berong/.env
```

## Step 2: Paste This Configuration
Copy everything below and paste it into nano (right-click to paste in console):

```
# ===========================================
# BFP Berong - Production Environment
# ===========================================

# Database Configuration
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=BfP2026SecureDbPass!@#$
POSTGRES_DB=bfp_berong_prod

# Application Settings
NODE_ENV=production
DOMAIN=bfpscberong.app
CORS_ORIGINS=https://bfpscberong.app,https://www.bfpscberong.app,http://localhost,http://nextjs:3000

# Security - JWT Secret (IMPORTANT: Change this!)
JWT_SECRET=YourSuperSecretJWTKey2026BFPBerong!@#$%

# Optional: Gemini API Key (add if you have one)
GEMINI_API_KEY=
```

## Step 3: Save the File
1. Press `Ctrl + X`
2. Press `Y` (to confirm save)
3. Press `Enter` (to confirm filename)

## Step 4: Verify .env was created
```bash
cat /root/apps/bfp-berong/.env
```
You should see your configuration.

---

# 🚀 PART 6: Initial Deployment (HTTP Only - To Test)

## Step 1: Make sure you're in the right directory
```bash
cd /root/apps/bfp-berong
```

## Step 2: Build and Start Containers
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
⏰ **This will take 10-20 minutes** on first run. Be patient!

## Step 3: Watch the Build Progress
```bash
docker-compose -f docker-compose.prod.yml logs -f
```
Press `Ctrl + C` to exit logs when you see "Starting Next.js server..."

## Step 4: Check Container Status
```bash
docker ps
```
You should see 4 containers running:
- `bfp-nginx`
- `bfp-nextjs`
- `bfp-postgres`
- `bfp-python-backend`

## Step 5: Test HTTP Access
```bash
curl http://localhost
```
You should get HTML response.

## Step 6: Test from Browser
Open your browser and go to:
- http://143.198.217.102
- http://bfpscberong.app (if DNS has propagated)

If you see your app, continue to Part 7 for HTTPS!

---

# 🔒 PART 7: Setup SSL/HTTPS (Let's Encrypt)

## Step 1: Create Certbot Directories
```bash
cd /root/apps/bfp-berong
mkdir -p certbot/conf certbot/www
```

## Step 2: Create Temporary Nginx Config for SSL Verification
```bash
cat > /root/apps/bfp-berong/nginx/nginx-temp.conf << 'EOF'
server {
    listen 80;
    server_name bfpscberong.app www.bfpscberong.app;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        proxy_pass http://nextjs:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
```

## Step 3: Update Nginx to Use Temp Config
```bash
docker cp /root/apps/bfp-berong/nginx/nginx-temp.conf bfp-nginx:/etc/nginx/conf.d/default.conf
docker exec bfp-nginx nginx -s reload
```

## Step 4: Get SSL Certificate
⚠️ **Replace `your-email@example.com` with your actual email!**

```bash
docker run -it --rm \
  -v /root/apps/bfp-berong/certbot/conf:/etc/letsencrypt \
  -v /root/apps/bfp-berong/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d bfpscberong.app \
  -d www.bfpscberong.app
```

**If port 80 is in use, stop nginx first:**
```bash
docker stop bfp-nginx
```

Then run the certbot command above, then:
```bash
docker start bfp-nginx
```

## Step 5: Verify Certificate was Created
```bash
ls -la /root/apps/bfp-berong/certbot/conf/live/bfpscberong.app/
```
You should see: `fullchain.pem`, `privkey.pem`, etc.

## Step 6: Stop Current Containers
```bash
cd /root/apps/bfp-berong
docker-compose -f docker-compose.prod.yml down
```

## Step 7: Start with SSL Configuration
```bash
docker-compose -f docker-compose.ssl.yml up -d --build
```

## Step 8: Check Everything is Running
```bash
docker ps
```

## Step 9: Test HTTPS
```bash
curl -I https://bfpscberong.app
```
You should see `HTTP/2 200` or similar.

---

# ✅ PART 8: Verify Deployment

## Test in Browser:
1. Open https://bfpscberong.app
2. You should see a 🔒 padlock icon
3. Test your app features

## Check Container Logs (if issues):
```bash
docker logs bfp-nextjs
docker logs bfp-python-backend
docker logs bfp-postgres
docker logs bfp-nginx
```

---

# 🔄 PART 9: Useful Commands Reference

## View All Logs
```bash
cd /root/apps/bfp-berong && docker-compose -f docker-compose.ssl.yml logs -f
```

## Restart All Services
```bash
cd /root/apps/bfp-berong && docker-compose -f docker-compose.ssl.yml restart
```

## Stop All Services
```bash
cd /root/apps/bfp-berong && docker-compose -f docker-compose.ssl.yml down
```

## Start All Services
```bash
cd /root/apps/bfp-berong && docker-compose -f docker-compose.ssl.yml up -d
```

## Update Application (After Code Changes)
```bash
cd /root/apps/bfp-berong
git pull origin main
git lfs pull
docker-compose -f docker-compose.ssl.yml up -d --build
```

## Check Disk Space
```bash
df -h
```

## Check Memory Usage
```bash
free -h
```

## Check Docker Resource Usage
```bash
docker stats
```

## Backup Database
```bash
docker exec bfp-postgres pg_dump -U bfp_prod_user bfp_berong_prod > /root/backup_$(date +%Y%m%d).sql
```

---

# 🚨 TROUBLESHOOTING

## Problem: Containers Keep Restarting
```bash
docker logs bfp-nextjs --tail 100
docker logs bfp-python-backend --tail 100
```

## Problem: Database Connection Error
```bash
docker logs bfp-postgres
docker exec bfp-postgres pg_isready
```

## Problem: SSL Certificate Issues
```bash
# Check certificate
ls -la /root/apps/bfp-berong/certbot/conf/live/bfpscberong.app/

# Renew certificate
docker run --rm -v /root/apps/bfp-berong/certbot/conf:/etc/letsencrypt certbot/certbot renew
```

## Problem: Out of Memory
```bash
# Check memory
free -h

# Restart Docker to free memory
systemctl restart docker

# Then restart app
cd /root/apps/bfp-berong && docker-compose -f docker-compose.ssl.yml up -d
```

## Problem: Port 80/443 Already in Use
```bash
# Find what's using the port
lsof -i :80
lsof -i :443

# Kill the process (replace PID with actual number)
kill -9 PID
```

---

# 📝 QUICK REFERENCE CARD

| What | Command |
|------|---------|
| Go to app folder | `cd /root/apps/bfp-berong` |
| Start app | `docker-compose -f docker-compose.ssl.yml up -d` |
| Stop app | `docker-compose -f docker-compose.ssl.yml down` |
| View logs | `docker-compose -f docker-compose.ssl.yml logs -f` |
| Restart | `docker-compose -f docker-compose.ssl.yml restart` |
| Update app | `git pull && docker-compose -f docker-compose.ssl.yml up -d --build` |
| Check status | `docker ps` |

---

# 🎉 SUCCESS!

Once completed, your app will be live at:
- **https://bfpscberong.app** ✅
- **https://www.bfpscberong.app** ✅

The HTTP versions will automatically redirect to HTTPS.

---

## Need Your GitHub Repo URL?
Before starting Part 4, make sure you know:
1. Your GitHub username
2. Your repository name
3. If it's private, you need a Personal Access Token

Example repo URL: `https://github.com/Toneejake/berong-safescape.git`
