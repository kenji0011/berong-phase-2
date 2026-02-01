# BFP SafeScape - Continue Deployment Tomorrow

## Current Status ✅
- ✅ Droplet created: **165.232.170.245**
- ✅ Security hardened (firewall, fail2ban, user created)
- ✅ Docker installed
- ✅ Code cloned from GitHub
- ⏸️ **Stopped here** - Ready to deploy tomorrow

---

## Tomorrow's Deployment Steps

### Step 1: Connect to Droplet

Open DigitalOcean console OR use PowerShell:

**Option A: DigitalOcean Console (Easiest)**
1. Go to: https://cloud.digitalocean.com/droplets
2. Click **bfp-safescape-prod**
3. Click **Access** → **Launch Droplet Console**
4. Login as: `bfpadmin` (use the password you set yesterday)

**Option B: PowerShell (if you add your SSH key)**
```powershell
ssh bfpadmin@165.232.170.245
```

---

### Step 2: Navigate to Project

```bash
cd ~/bfp-safescape
pwd  # Should show: /home/bfpadmin/bfp-safescape
```

---

### Step 3: Create Environment File

```bash
cat > .env << 'EOF'
# Database - STRONG PASSWORDS!
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=BFP_Pr0d_S3cur3_P@ssw0rd_2026_Chang3_Th1s!
POSTGRES_DB=bfp_berong_prod

# Application Security
JWT_SECRET=bfp_jwt_s3cr3t_k3y_f0r_pr0duct10n_2026_v3ry_l0ng_and_s3cur3_Chang3_Th1s!
NODE_ENV=production

# API Keys (get from your Google Cloud Console)
GEMINI_API_KEY=your_actual_gemini_api_key_here

# CORS Configuration
CORS_ORIGINS=https://bfpscberong.app,https://www.bfpscberong.app,http://165.232.170.245
EOF

chmod 600 .env
```

**⚠️ IMPORTANT:** Before deploying to production, change the passwords above to truly random ones:
```bash
# Generate secure passwords (run these and copy the output)
openssl rand -base64 32  # Use for POSTGRES_PASSWORD
openssl rand -base64 48  # Use for JWT_SECRET
```

---

### Step 4: Create Certbot Directories

```bash
mkdir -p certbot/conf certbot/www
```

---

### Step 5: Build and Start Application (HTTP First)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**⏱️ This takes 5-10 minutes** - You'll see:
- Building nextjs image
- Building python-backend image
- Pulling postgres and nginx images
- Starting containers

---

### Step 6: Monitor Build Progress

```bash
# Watch the build logs
docker compose -f docker-compose.prod.yml logs -f

# Press Ctrl+C to stop watching logs
```

Wait until you see:
- `nextjs` - "Ready on http://localhost:3000"
- `python-backend` - "Uvicorn running on http://0.0.0.0:8000"

---

### Step 7: Check Container Status

```bash
docker compose -f docker-compose.prod.yml ps
```

**Expected output:**
```
NAME                   STATUS
bfp-nextjs            Up (healthy)
bfp-postgres          Up (healthy)
bfp-python-backend    Up (healthy)
bfp-nginx             Up
```

All should show "Up" or "Up (healthy)"

---

### Step 8: Initialize Database

```bash
# Run migrations
docker exec -it bfp-nextjs npx prisma migrate deploy

# Seed initial data
docker exec -it bfp-nextjs npx prisma db seed
```

---

### Step 9: Test the Site (HTTP)

```bash
# Test from inside the server
curl -I http://localhost

# Test nginx is serving
curl http://localhost | head -20
```

Should return HTML content with no errors.

---

### Step 10: Test From Your Browser

Open in your browser:
```
http://165.232.170.245
```

**Expected:** You should see the BFP SafeScape homepage!

**If you see errors:**
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs nextjs
docker compose -f docker-compose.prod.yml logs python-backend
docker compose -f docker-compose.prod.yml logs nginx
```

---

### Step 11: Set Up SSL (HTTPS)

**First, ensure your domain points to the server:**
1. Go to your domain registrar (where you bought bfpscberong.app)
2. Add DNS A records:
   - `bfpscberong.app` → `165.232.170.245`
   - `www.bfpscberong.app` → `165.232.170.245`
3. Wait 5-10 minutes for DNS to propagate

**Check if DNS is ready:**
```bash
nslookup bfpscberong.app
# Should show: 165.232.170.245
```

**Get SSL certificate:**
```bash
# Stop current containers
docker compose -f docker-compose.prod.yml down

# Get certificate
sudo docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d bfpscberong.app \
  -d www.bfpscberong.app
```

**Start with SSL:**
```bash
docker compose -f docker-compose.ssl.yml up -d
```

**Test HTTPS:**
```
https://bfpscberong.app
```

---

## Quick Reference Commands

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f nextjs
docker compose -f docker-compose.prod.yml logs -f python-backend
```

### Restart Services
```bash
# All services
docker compose -f docker-compose.prod.yml restart

# Specific service
docker compose -f docker-compose.prod.yml restart nextjs
```

### Stop Everything
```bash
docker compose -f docker-compose.prod.yml down
```

### Update Code (When You Push New Changes)
```bash
cd ~/bfp-safescape
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Check System Resources
```bash
# Memory/CPU usage
docker stats --no-stream

# Disk space
df -h

# Container status
docker ps
```

---

## Troubleshooting

### Site Shows 502 Bad Gateway
```bash
# Check if nextjs is running
docker logs bfp-nextjs --tail 50

# Check nginx can reach nextjs
docker exec bfp-nginx ping nextjs
```

### Database Connection Error
```bash
# Check if postgres is healthy
docker ps | grep postgres

# Check database logs
docker logs bfp-postgres

# Verify DATABASE_URL in .env matches docker-compose
cat .env | grep DATABASE_URL
```

### Python Backend Not Working
```bash
# Check logs
docker logs bfp-python-backend --tail 100

# Test if it's responding
curl http://localhost:8000/docs
```

### Out of Memory
```bash
# Check memory usage
free -h

# Restart a heavy service
docker compose -f docker-compose.prod.yml restart nextjs
```

---

## Important Security Notes

✅ **What's Already Secured:**
- Firewall active (only ports 22, 80, 443 open)
- Root login disabled
- Fail2ban protecting SSH
- Database not exposed to internet
- Auto security updates enabled

⚠️ **Before Production:**
- [ ] Change default passwords in `.env`
- [ ] Add your real GEMINI_API_KEY
- [ ] Set up SSL certificates
- [ ] Test all features (registration, login, simulation, games)
- [ ] Set up database backups (see backup script in SECURE_DROPLET_SETUP.md)

---

## Contact Info Saved

**Droplet Details:**
- IP: `165.232.170.245`
- User: `bfpadmin`
- Domain: `bfpscberong.app`
- Project: `bfp-safescape-prod`

**Console Access:**
https://cloud.digitalocean.com/droplets → bfp-safescape-prod → Access → Launch Console

---

## Expected Timeline Tomorrow

| Step | Task | Time |
|------|------|------|
| 1-4 | Connect & Setup .env | 5 min |
| 5 | Build containers | 10 min |
| 6-9 | Initialize & test | 5 min |
| 10 | Browser test | 2 min |
| 11 | SSL setup | 10 min |
| **Total** | | **~30 minutes** |

---

Good luck tomorrow! 🚀
