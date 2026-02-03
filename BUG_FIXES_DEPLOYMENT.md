# BFP Berong SafeScape - Bug Fixes & Deployment Guide

## Date: February 3, 2026
## Environment: Digital Ocean Droplet (139.59.126.120) / bfpscberong.app

---

## 📋 Issues Identified & Status

| # | Issue | Root Cause | Status | Fix Applied |
|---|-------|------------|--------|-------------|
| 1 | Chatbot errors possible | Gemini API timeout/connection | ⏳ Monitor | API exists at `/api/chatbot/ai-response` |
| 2 | House Player Defense 404 | Page wrapper missing + URL encoding issue | ✅ FIXED | Created Next.js page + fixed HTML |
| 3 | Module progress not updating | Cookie encoding issues | ✅ FIXED | Fixed cookie parsing |
| 4 | Simulation 503 error | Python backend not responding | ⚠️ Check | See deployment steps |
| 5 | Broken carousel/adult images | Relative image paths | ⚠️ Check | Verify image URLs in DB |
| 6 | Non-admin navigation issues | Cookie not persisting | ✅ FIXED | Fixed auth-context.tsx |
| 7 | Admin Analytics not working | Database/cache issues | ⏳ Verify | Check DB connection |
| 8 | Auto-logout on navigation | Cookie encoding mismatch | ✅ FIXED | Fixed cookie encoding/decoding |

---

## 🛠️ Code Changes Made

### 1. Created House Player Defense Page & Fixed Game Loading
- **File**: `app/kids/games/house-player-defense/page.tsx`
- **Change**: Created Next.js page wrapper that embeds the HTML5 game via iframe (same pattern as other games)

- **File**: `public/games/house-player-defense/index.html`
- **Change**: URL-encoded spaces in the JavaScript file path (`holy%20shit%20qworking%20mobile%20ui.js`) to fix script loading issues

### 2. Fixed Authentication Cookie Handling
- **File**: `lib/auth-context.tsx`
- **Changes**:
  - Added `credentials: 'include'` to fetch calls for login/register
  - Improved cookie value encoding consistency
  - Added detailed comments for cookie settings

### 3. Fixed Cookie Parsing in /api/auth/me
- **File**: `app/api/auth/me/route.ts`  
- **Change**: Added `decodeURIComponent()` to properly decode URL-encoded cookie values

---

## 🚀 Deployment Steps for Digital Ocean

### Step 1: SSH into your Droplet
```bash
ssh root@139.59.126.120
# or with your SSH key
ssh -i ~/.ssh/your_key root@139.59.126.120
```

### Step 2: Navigate to your project directory
```bash
cd /path/to/berong-safescape
# Usually something like: cd /var/www/berong-safescape or /opt/berong-safescape
```

### Step 3: Pull the latest changes
```bash
git pull origin main
```

### Step 4: Check Docker container status
```bash
docker ps -a
docker logs bfp-nextjs --tail 100
docker logs bfp-python-backend --tail 100
docker logs bfp-postgres --tail 50
```

### Step 5: Rebuild and restart containers
```bash
# Stop all containers
docker-compose -f docker-compose.ssl.yml down

# Rebuild images with new code
docker-compose -f docker-compose.ssl.yml build --no-cache

# Start containers
docker-compose -f docker-compose.ssl.yml up -d
```

### Step 6: Verify all containers are running
```bash
docker ps
# You should see: bfp-nginx, bfp-nextjs, bfp-python-backend, bfp-postgres, bfp-certbot
```

### Step 7: Check logs for errors
```bash
# Check Next.js logs
docker logs bfp-nextjs --follow

# Check Python backend logs (for simulation issues)
docker logs bfp-python-backend --follow
```

### Step 8: Run database migrations (if needed)
```bash
docker exec -it bfp-nextjs npx prisma migrate deploy
docker exec -it bfp-nextjs npx prisma generate
```

---

## 🔧 Troubleshooting Common Issues

### Issue: Simulation 503 Error
**Symptoms**: Error calling `/api/simulation/status/...`
**Cause**: Python backend not running or models not loaded

**Check:**
```bash
docker logs bfp-python-backend --tail 200
```

**Look for:**
- `[FAIL] Model file not found` - Models are missing
- `Out of memory` - Container needs more RAM
- Python dependency errors

**Fix:**
```bash
# If model files are missing, you need to copy them to the container
docker cp /path/to/models bfp-python-backend:/app/

# Or rebuild with models in place
docker-compose -f docker-compose.ssl.yml build python-backend
docker-compose -f docker-compose.ssl.yml up -d python-backend
```

### Issue: Images Not Loading
**Symptoms**: Carousel images show broken links
**Cause**: Image URLs in database are relative instead of absolute

**Check:**
```bash
# Connect to database
docker exec -it bfp-postgres psql -U bfp_user -d bfp_berong -c "SELECT id, title, \"imageUrl\" FROM carousel_images;"
```

**Fix:**
If URLs are relative (like `/uploads/image.jpg`), they should work.
If they're absolute localhost URLs (like `http://localhost:3000/...`), update them:
```sql
UPDATE carousel_images SET "imageUrl" = REPLACE("imageUrl", 'http://localhost:3000', '') WHERE "imageUrl" LIKE 'http://localhost%';
```

### Issue: Users Auto-Logging Out
**Symptoms**: After navigating to protected routes, users get redirected to login
**Cause**: Cookie not being parsed correctly

**Fix Applied**: The `decodeURIComponent()` fix in `/api/auth/me` should resolve this.

After deploying, test by:
1. Log in as a regular user (kid or adult account)
2. Navigate to their respective sections
3. Verify they stay logged in

### Issue: Analytics Not Loading
**Symptoms**: Admin Analytics page shows loading forever or errors
**Cause**: Database tables might be empty or missing data

**Check:**
```bash
docker exec -it bfp-postgres psql -U bfp_user -d bfp_berong -c "SELECT COUNT(*) FROM users WHERE role != 'admin';"
docker exec -it bfp-postgres psql -U bfp_user -d bfp_berong -c "SELECT COUNT(*) FROM engagement_logs;"
docker exec -it bfp-postgres psql -U bfp_user -d bfp_berong -c "SELECT COUNT(*) FROM assessment_questions;"
```

---

## 🔒 Environment Variables Checklist

Make sure these are set in your `.env` file on the server:

```env
# Required
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=[STRONG_PASSWORD]
POSTGRES_DB=bfp_berong_prod

# For Gemini AI (chatbot)
GEMINI_API_KEY=[YOUR_API_KEY]

# Security
JWT_SECRET=[RANDOM_32_CHAR_STRING]

# CORS (for Python backend)
CORS_ORIGINS=https://bfpscberong.app,https://www.bfpscberong.app,http://localhost,http://nextjs:3000
```

---

## ✅ Post-Deployment Verification

After deploying, verify these work:

1. **Home Page Carousel**: Check images load properly
2. **Login/Register**: Create a test user, verify login works
3. **Kids Dashboard**: Access games including House Player Defense (now shows "Coming Soon")
4. **Adult Section**: Navigate around, verify no auto-logout
5. **Simulation** (if backend is up): Upload a floor plan, run simulation
6. **Chatbot**: Click Berong character, ask a fire safety question
7. **Admin Analytics**: Log in as admin, check analytics dashboard

---

## 📞 Next Steps if Issues Persist

1. **Check Server Resources**:
   ```bash
   htop  # Check CPU/Memory usage
   df -h # Check disk space
   ```

2. **Restart All Services**:
   ```bash
   docker-compose -f docker-compose.ssl.yml restart
   ```

3. **Check Nginx**:
   ```bash
   docker logs bfp-nginx --tail 50
   ```

4. **Check Database Connection**:
   ```bash
   docker exec -it bfp-nextjs npx prisma db push
   ```
