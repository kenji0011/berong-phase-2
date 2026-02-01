# BFP SafeScape - Secure DigitalOcean Droplet Setup Guide

## Overview

This guide sets up a **hardened Ubuntu droplet** for your BFP SafeScape fire safety e-learning platform.

**Tech Stack:**
- Next.js 15 (Frontend)
- Python FastAPI (ML/Simulation Backend)
- PostgreSQL 15 (Database)
- Nginx (Reverse Proxy + SSL)
- Docker + Docker Compose
- Let's Encrypt SSL (Certbot)

**Domain:** `bfpscberong.app`

---

## Part 1: Initial Droplet Configuration

### 1.1 Create New Droplet on DigitalOcean

**Recommended specs:**
- **Image:** Ubuntu 24.04 LTS
- **Plan:** Basic, 4GB RAM / 2 vCPUs (minimum for ML)
- **Region:** Singapore (nearest to Philippines)
- **Authentication:** SSH Key (NOT password!)
- **Options:** Enable monitoring, enable backups

### 1.2 First Login (as root via SSH)

```bash
# From your local machine
ssh root@YOUR_DROPLET_IP
```

---

## Part 2: Security Hardening Script

**Save this as `setup-secure-droplet.sh` and run it:**

```bash
#!/bin/bash
set -e

# ==============================================
# BFP SafeScape - Secure Droplet Setup Script
# Run as: bash setup-secure-droplet.sh
# ==============================================

echo "🔒 Starting secure droplet setup..."

# --- Configuration (CHANGE THESE!) ---
NEW_USER="bfpadmin"
NEW_USER_PASSWORD="CHANGE_THIS_STRONG_PASSWORD"
SSH_PORT=2222  # Non-standard SSH port
DOMAIN="bfpscberong.app"

# --- System Updates ---
echo "📦 Updating system packages..."
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban unattended-upgrades apt-transport-https ca-certificates gnupg lsb-release

# --- Create Non-Root User ---
echo "👤 Creating non-root user: $NEW_USER..."
if ! id "$NEW_USER" &>/dev/null; then
    useradd -m -s /bin/bash -G sudo "$NEW_USER"
    echo "$NEW_USER:$NEW_USER_PASSWORD" | chpasswd
    
    # Copy SSH keys from root to new user
    mkdir -p /home/$NEW_USER/.ssh
    cp /root/.ssh/authorized_keys /home/$NEW_USER/.ssh/
    chown -R $NEW_USER:$NEW_USER /home/$NEW_USER/.ssh
    chmod 700 /home/$NEW_USER/.ssh
    chmod 600 /home/$NEW_USER/.ssh/authorized_keys
    
    echo "$NEW_USER ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$NEW_USER
fi

# --- SSH Hardening ---
echo "🔐 Hardening SSH configuration..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

cat > /etc/ssh/sshd_config << EOF
# BFP SafeScape - Hardened SSH Config
Port $SSH_PORT
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Authentication
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Security
MaxAuthTries 3
MaxSessions 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2

# Disable unused features
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no

# Only allow specific user
AllowUsers $NEW_USER
EOF

# --- UFW Firewall ---
echo "🧱 Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow $SSH_PORT/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
# Do NOT expose PostgreSQL (5432) or internal ports!
echo "y" | ufw enable

# --- Fail2Ban ---
echo "🚫 Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = $SSH_PORT
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# --- Automatic Security Updates ---
echo "🔄 Enabling automatic security updates..."
cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# --- Install Docker ---
echo "🐳 Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
usermod -aG docker $NEW_USER

# --- Docker Security ---
echo "🔒 Hardening Docker..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOF
{
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

# --- Create app directory ---
echo "📁 Creating application directory..."
mkdir -p /home/$NEW_USER/bfp-safescape
chown -R $NEW_USER:$NEW_USER /home/$NEW_USER/bfp-safescape

# --- Swap file (for 4GB RAM droplet) ---
echo "💾 Creating swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- Final Security Tweaks ---
echo "🛡️ Applying kernel security tweaks..."
cat >> /etc/sysctl.conf << EOF

# BFP Security Hardening
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
kernel.randomize_va_space = 2
EOF
sysctl -p

echo ""
echo "✅ ====================================="
echo "✅ SETUP COMPLETE!"
echo "✅ ====================================="
echo ""
echo "⚠️  IMPORTANT - SAVE THIS INFO:"
echo "   New SSH Port: $SSH_PORT"
echo "   New User: $NEW_USER"
echo "   SSH Command: ssh -p $SSH_PORT $NEW_USER@YOUR_IP"
echo ""
echo "⚠️  Root login is now DISABLED!"
echo "⚠️  Test the new SSH connection BEFORE closing this session!"
echo ""
echo "🔄 Restarting SSH service..."
systemctl restart sshd

echo "Done! Open a NEW terminal and test: ssh -p $SSH_PORT $NEW_USER@YOUR_IP"
```

---

## Part 3: Deploy Application Securely

### 3.1 Connect with New User

```bash
# From your local machine (new terminal!)
ssh -p 2222 bfpadmin@YOUR_DROPLET_IP
```

### 3.2 Clone Repository (Using Deploy Key - SECURE METHOD)

**On your local machine, generate a deploy key:**
```bash
ssh-keygen -t ed25519 -C "bfp-deploy-key" -f ~/.ssh/bfp_deploy_key -N ""
```

**Add the PUBLIC key to GitHub:**
1. Go to your repo → Settings → Deploy keys → Add deploy key
2. Paste contents of `~/.ssh/bfp_deploy_key.pub`
3. Check "Allow write access" (optional)

**On the droplet, add the PRIVATE key:**
```bash
# Create SSH config for GitHub
mkdir -p ~/.ssh
nano ~/.ssh/bfp_deploy_key
# Paste your PRIVATE key, save

chmod 600 ~/.ssh/bfp_deploy_key

# Configure SSH to use this key for GitHub
cat >> ~/.ssh/config << EOF
Host github.com
    IdentityFile ~/.ssh/bfp_deploy_key
    IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config
```

**Clone the repository:**
```bash
cd ~
git clone git@github.com:Toneejake/berong-safescape.git bfp-safescape
cd bfp-safescape
```

### 3.3 Create Environment File (SECURE CREDENTIALS)

```bash
# Create .env file with secure credentials
cat > .env << 'EOF'
# Database - USE STRONG PASSWORDS!
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=GENERATE_32_CHAR_RANDOM_PASSWORD_HERE
POSTGRES_DB=bfp_berong_prod

# Application Security
JWT_SECRET=GENERATE_64_CHAR_RANDOM_SECRET_HERE
NODE_ENV=production

# API Keys (get from your accounts)
GEMINI_API_KEY=your_gemini_api_key_here

# CORS Configuration
CORS_ORIGINS=https://bfpscberong.app,https://www.bfpscberong.app
EOF

# Secure the .env file
chmod 600 .env
```

**Generate secure passwords:**
```bash
# Generate random password (run locally or on server)
openssl rand -base64 32  # For POSTGRES_PASSWORD
openssl rand -base64 48  # For JWT_SECRET
```

### 3.4 Initial SSL Certificate Setup

**Before starting with SSL, get certificates:**
```bash
# Create certbot directories
mkdir -p certbot/conf certbot/www

# Get initial certificate (HTTP-only first)
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

### 3.5 Start the Application

```bash
# Build and start all services with SSL
docker compose -f docker-compose.ssl.yml up -d --build

# Check status
docker compose -f docker-compose.ssl.yml ps

# View logs
docker compose -f docker-compose.ssl.yml logs -f
```

### 3.6 Initialize Database

```bash
# Run Prisma migrations
docker exec -it bfp-nextjs npx prisma migrate deploy

# Seed initial data (if needed)
docker exec -it bfp-nextjs npx prisma db seed
```

---

## Part 4: Ongoing Security Maintenance

### 4.1 Regular Updates Script

Create `/home/bfpadmin/update-system.sh`:
```bash
#!/bin/bash
# Run weekly: sudo crontab -e
# Add: 0 3 * * 0 /home/bfpadmin/update-system.sh

echo "Starting system update..."
apt update && apt upgrade -y
docker system prune -af --volumes
echo "Update complete: $(date)"
```

### 4.2 Monitoring Commands

```bash
# Check for failed SSH attempts
sudo fail2ban-client status sshd

# View banned IPs
sudo fail2ban-client status sshd | grep "Banned IP"

# Check UFW status
sudo ufw status verbose

# Docker resource usage
docker stats --no-stream

# Check disk space
df -h
```

### 4.3 Backup Script

Create `/home/bfpadmin/backup-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/home/bfpadmin/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec bfp-postgres pg_dump -U bfp_prod_user bfp_berong_prod | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

---

## Part 5: Security Checklist

### Before Deployment ✅
- [ ] Changed default SSH port from 22 to 2222
- [ ] Created non-root user with sudo
- [ ] Disabled root SSH login
- [ ] Disabled password authentication (SSH keys only)
- [ ] UFW firewall enabled (only ports 80, 443, 2222)
- [ ] Fail2ban configured
- [ ] Strong passwords generated for database
- [ ] Strong JWT secret generated
- [ ] Deploy key used instead of personal credentials
- [ ] `.env` file has proper permissions (600)

### After Deployment ✅
- [ ] SSL certificate installed and working
- [ ] All containers running healthy
- [ ] Database not exposed externally
- [ ] Automatic security updates enabled
- [ ] Backup script scheduled
- [ ] Monitoring enabled in DigitalOcean dashboard

---

## Quick Reference Commands

```bash
# SSH into server
ssh -p 2222 bfpadmin@YOUR_IP

# Restart all services
cd ~/bfp-safescape && docker compose -f docker-compose.ssl.yml restart

# View logs
docker compose -f docker-compose.ssl.yml logs -f nextjs
docker compose -f docker-compose.ssl.yml logs -f python-backend

# Update application
cd ~/bfp-safescape
git pull origin main
docker compose -f docker-compose.ssl.yml up -d --build

# Renew SSL certificate
docker compose -f docker-compose.ssl.yml run --rm certbot renew
docker compose -f docker-compose.ssl.yml restart nginx
```

---

## Troubleshooting

### Can't SSH after setup?
- Make sure you test the NEW SSH connection before closing the root session
- Check UFW: `sudo ufw status`
- Emergency: Use DigitalOcean console (web-based)

### 502 Bad Gateway?
- Check if containers are running: `docker ps`
- Check nginx can reach nextjs: `docker logs bfp-nginx`
- Ensure all services on same network

### Database connection failed?
- Check DATABASE_URL in .env matches docker-compose
- Ensure postgres is healthy: `docker ps | grep postgres`

---

## Important Security Notes

1. **NEVER commit `.env` to Git** - it's in `.gitignore`
2. **Rotate credentials** if you suspect any compromise
3. **Enable 2FA** on your DigitalOcean and GitHub accounts
4. **Set up DigitalOcean Firewall** as additional layer (Cloud Firewall)
5. **Monitor** DigitalOcean alerts for unusual CPU/bandwidth usage
