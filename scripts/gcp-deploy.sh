#!/bin/bash
# ============================================================
# BFP Berong - Secure GCP Deployment Script
# ============================================================
# This script creates a NEW secure VM on GCP and deploys
# the application with enhanced security measures.
#
# PREREQUISITES:
#   - gcloud CLI installed and authenticated
#   - Project 'berong' already exists
#   - Domain bfpscberong.app DNS updated to new IP
#
# USAGE:
#   chmod +x scripts/gcp-deploy.sh
#   ./scripts/gcp-deploy.sh
# ============================================================

set -euo pipefail

# ==================== CONFIGURATION ==========================
PROJECT_ID="berong"
ZONE="asia-southeast1-b"
REGION="asia-southeast1"
INSTANCE_NAME="bfp-safescape-v2"
MACHINE_TYPE="e2-standard-2"
BOOT_DISK_SIZE="30GB"
STATIC_IP_NAME="bfp-static-ip-v2"
GITHUB_REPO="https://github.com/Toneejake/berong-safescape.git"
DOMAIN="bfpscberong.app"
EMAIL="evangelistajohnkervin@gmail.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ==================== STEP 1: GCP Setup =======================
echo ""
echo "============================================================"
echo "  BFP Berong - Secure GCP Deployment"
echo "  Instance: $INSTANCE_NAME"
echo "  Zone: $ZONE"
echo "============================================================"
echo ""

# Set project
log_info "Setting GCP project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"

# Enable required APIs
log_info "Enabling required APIs..."
gcloud services enable compute.googleapis.com --quiet

# ==================== STEP 2: Reserve New Static IP =============
log_info "Reserving static IP..."
if gcloud compute addresses describe "$STATIC_IP_NAME" --region="$REGION" &>/dev/null; then
    log_warn "Static IP $STATIC_IP_NAME already exists"
else
    gcloud compute addresses create "$STATIC_IP_NAME" --region="$REGION"
    log_ok "Static IP reserved"
fi

STATIC_IP=$(gcloud compute addresses describe "$STATIC_IP_NAME" --region="$REGION" --format="value(address)")
log_ok "Static IP: $STATIC_IP"

echo ""
echo "============================================================"
echo "  ⚠️  UPDATE DNS RECORDS BEFORE CONTINUING!"
echo "  A record: @ → $STATIC_IP"
echo "  A record: www → $STATIC_IP"
echo "  Domain: $DOMAIN"
echo "============================================================"
echo ""
read -p "Press Enter after DNS is updated (or Ctrl+C to abort)..."

# ==================== STEP 3: Create Firewall Rules ==============
log_info "Configuring firewall rules..."

# Allow HTTP (for Let's Encrypt challenge and redirect)
gcloud compute firewall-rules create allow-http-v2 \
    --direction=INGRESS --priority=1000 --network=default \
    --action=ALLOW --rules=tcp:80 \
    --source-ranges=0.0.0.0/0 --target-tags=http-server \
    --description="Allow HTTP for Let's Encrypt and redirect" \
    2>/dev/null || log_warn "allow-http-v2 rule already exists"

# Allow HTTPS
gcloud compute firewall-rules create allow-https-v2 \
    --direction=INGRESS --priority=1000 --network=default \
    --action=ALLOW --rules=tcp:443 \
    --source-ranges=0.0.0.0/0 --target-tags=https-server \
    --description="Allow HTTPS traffic" \
    2>/dev/null || log_warn "allow-https-v2 rule already exists"

# SECURITY: Restrict SSH to Google IAP (Identity-Aware Proxy) only
# This blocks ALL direct SSH from the internet
gcloud compute firewall-rules create allow-ssh-iap \
    --direction=INGRESS --priority=900 --network=default \
    --action=ALLOW --rules=tcp:22 \
    --source-ranges=35.235.240.0/20 --target-tags=ssh-iap \
    --description="Allow SSH only via Identity-Aware Proxy (IAP)" \
    2>/dev/null || log_warn "allow-ssh-iap rule already exists"

# SECURITY: Block SSH from all other sources
gcloud compute firewall-rules create deny-ssh-direct \
    --direction=INGRESS --priority=950 --network=default \
    --action=DENY --rules=tcp:22 \
    --source-ranges=0.0.0.0/0 --target-tags=ssh-iap \
    --description="Deny direct SSH (force IAP tunnel)" \
    2>/dev/null || log_warn "deny-ssh-direct rule already exists"

# SECURITY: Egress filtering - block outbound to common DDoS amplification ports
# Allow only HTTP/HTTPS/DNS outbound + PostgreSQL internal
gcloud compute firewall-rules create restrict-egress \
    --direction=EGRESS --priority=1000 --network=default \
    --action=ALLOW --rules=tcp:80,tcp:443,udp:53,tcp:53 \
    --destination-ranges=0.0.0.0/0 --target-tags=restricted-egress \
    --description="Allow only essential outbound traffic" \
    2>/dev/null || log_warn "restrict-egress rule already exists"

gcloud compute firewall-rules create deny-egress-default \
    --direction=EGRESS --priority=1100 --network=default \
    --action=DENY --rules=all \
    --destination-ranges=0.0.0.0/0 --target-tags=restricted-egress \
    --description="Deny all other outbound traffic" \
    2>/dev/null || log_warn "deny-egress-default rule already exists"

# Delete old insecure rules if they exist
gcloud compute firewall-rules delete default-allow-rdp --quiet 2>/dev/null || true

log_ok "Firewall rules configured"

# ==================== STEP 4: Create VM Instance ================
log_info "Creating VM instance $INSTANCE_NAME..."

if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &>/dev/null; then
    log_warn "Instance $INSTANCE_NAME already exists. Skipping creation."
else
    gcloud compute instances create "$INSTANCE_NAME" \
        --zone="$ZONE" \
        --machine-type="$MACHINE_TYPE" \
        --image-family=ubuntu-2204-lts \
        --image-project=ubuntu-os-cloud \
        --boot-disk-size="$BOOT_DISK_SIZE" \
        --boot-disk-type=pd-balanced \
        --address="$STATIC_IP_NAME" \
        --tags=http-server,https-server,ssh-iap,restricted-egress \
        --metadata=enable-oslogin=TRUE \
        --shielded-secure-boot \
        --shielded-vtpm \
        --shielded-integrity-monitoring \
        --no-scopes \
        --service-account=default

    log_ok "VM instance created"
fi

# Wait for VM to be ready
log_info "Waiting for VM to be ready..."
sleep 15

# ==================== STEP 5: SSH via IAP and Setup ==============
log_info "Connecting to VM via IAP tunnel..."

# Create the setup script
cat > /tmp/vm-setup.sh << 'SETUP_SCRIPT'
#!/bin/bash
set -euo pipefail

echo "============================================================"
echo "  VM Setup Starting..."
echo "============================================================"

# --- System Updates ---
echo "📦 Updating system packages..."
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y

# --- Install Docker ---
echo "🐳 Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
fi
sudo apt install -y docker-compose-plugin

# --- Install Git LFS ---
echo "📦 Installing Git LFS..."
sudo apt install -y git-lfs
git lfs install

# --- Install Certbot ---
echo "🔒 Installing Certbot..."
sudo apt install -y certbot

# --- Security: SSH Hardening ---
echo "🔐 Hardening SSH..."
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?LoginGraceTime.*/LoginGraceTime 30/' /etc/ssh/sshd_config
# Add session idle timeout (10 minutes)
echo "ClientAliveInterval 300" | sudo tee -a /etc/ssh/sshd_config
echo "ClientAliveCountMax 2" | sudo tee -a /etc/ssh/sshd_config
sudo systemctl restart sshd

# --- Security: Firewall (UFW) ---
echo "🧱 Configuring UFW firewall..."
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default deny outgoing  # DENY outgoing by default — more restrictive
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
# Allow essential outbound
sudo ufw allow out 80/tcp comment 'HTTP outbound'
sudo ufw allow out 443/tcp comment 'HTTPS outbound'
sudo ufw allow out 53 comment 'DNS outbound'
# Allow Docker internal networking
sudo ufw allow out on docker0
sudo ufw allow in on docker0
# Allow NTP
sudo ufw allow out 123/udp comment 'NTP'
sudo ufw --force enable

# --- Security: Fail2Ban ---
echo "🛡️ Installing Fail2Ban..."
sudo apt install -y fail2ban
cat << 'EOF' | sudo tee /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
EOF
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# --- Security: Automatic Updates ---
echo "🔄 Enabling automatic security updates..."
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# --- Security: Kernel Hardening ---
echo "🔧 Applying kernel security settings..."
cat << 'EOF' | sudo tee /etc/sysctl.d/99-security.conf
# Prevent IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Disable IP source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Disable ICMP redirect acceptance
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0

# Disable ICMP redirect sending
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Enable SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Log Martian packets
net.ipv4.conf.all.log_martians = 1

# Disable IPv6 if not needed (reduces attack surface)
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# Reduce TIME_WAIT connections
net.ipv4.tcp_fin_timeout = 15

# Connection tracking limits
net.netfilter.nf_conntrack_max = 65536
EOF
sudo sysctl -p /etc/sysctl.d/99-security.conf 2>/dev/null || true

# --- Security: Docker Daemon Hardening ---
echo "🐳 Hardening Docker daemon..."
sudo mkdir -p /etc/docker
cat << 'EOF' | sudo tee /etc/docker/daemon.json
{
    "live-restore": true,
    "no-new-privileges": true,
    "userns-remap": "default",
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 64000,
            "Soft": 64000
        },
        "nproc": {
            "Name": "nproc",
            "Hard": 4096,
            "Soft": 4096
        }
    },
    "icc": false
}
EOF
sudo systemctl restart docker

# --- Security: Audit logging ---
echo "📝 Setting up audit logging..."
sudo apt install -y auditd
sudo systemctl enable auditd
cat << 'EOF' | sudo tee /etc/audit/rules.d/docker.rules
# Monitor Docker daemon
-w /usr/bin/docker -p rwxa -k docker
-w /var/lib/docker -p rwxa -k docker
-w /etc/docker -p rwxa -k docker
-w /usr/lib/systemd/system/docker.service -p rwxa -k docker

# Monitor ssh config
-w /etc/ssh/sshd_config -p rwxa -k sshd_config

# Monitor passwd/shadow
-w /etc/passwd -p wa -k passwd_changes
-w /etc/shadow -p wa -k shadow_changes
EOF
sudo systemctl restart auditd

echo "✅ VM setup complete!"
SETUP_SCRIPT

# Upload and execute setup script via IAP
gcloud compute scp /tmp/vm-setup.sh "$INSTANCE_NAME":/tmp/vm-setup.sh \
    --zone="$ZONE" --tunnel-through-iap
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --tunnel-through-iap \
    --command="chmod +x /tmp/vm-setup.sh && /tmp/vm-setup.sh"

log_ok "VM setup completed"

# ==================== STEP 6: Clone Repository ==================
log_info "Cloning repository..."

gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --tunnel-through-iap \
    --command="
cd ~
if [ -d berong-safescape ]; then
    cd berong-safescape
    git pull origin main
    git lfs pull
else
    git clone $GITHUB_REPO
    cd berong-safescape
    git lfs pull
fi
echo '✅ Repository ready'
"

log_ok "Repository cloned"

# ==================== STEP 7: Generate Secrets & .env ==========
log_info "Generating production secrets..."

gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --tunnel-through-iap \
    --command="
cd ~/berong-safescape

# Generate strong random secrets
DB_PASSWORD=\$(openssl rand -base64 32 | tr -d '=+/' | head -c 40)
JWT_SECRET_VAL=\$(openssl rand -base64 64 | tr -d '=+/' | head -c 80)
ADMIN_PASS=\$(openssl rand -base64 16 | tr -d '=+/' | head -c 20)

# Create production .env file
cat > .env << ENVEOF
# ============================================
# BFP Berong - Production Environment
# Generated: \$(date -u +%Y-%m-%dT%H:%M:%SZ)
# ============================================

# Database
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=\${DB_PASSWORD}
POSTGRES_DB=bfp_berong_prod

# Authentication
JWT_SECRET=\${JWT_SECRET_VAL}
ADMIN_DEFAULT_PASSWORD=\${ADMIN_PASS}

# AI/ML
GEMINI_API_KEY=AIzaSyCbFsMBnoiQhBW8eT0HlwHUWblNE7XMV2U

# CORS
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,http://nextjs:3000
ENVEOF

# Secure permissions
chmod 600 .env

echo '✅ Production .env created'
echo '⚠️  Admin default password: '\${ADMIN_PASS}
echo '⚠️  CHANGE THIS IMMEDIATELY after first login!'
"

log_ok "Secrets generated"

# ==================== STEP 8: Build & Deploy ====================
log_info "Building and deploying containers..."

gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --tunnel-through-iap \
    --command="
cd ~/berong-safescape

# Ensure the init-db script is executable
chmod +x scripts/init-db.sh

# Build and start all containers
sudo docker compose -f docker-compose.prod.yml up -d --build

# Wait for containers to be healthy
echo 'Waiting for containers to start...'
sleep 30

# Check status
sudo docker compose -f docker-compose.prod.yml ps
echo ''
echo 'Container logs (last 20 lines each):'
echo '--- Postgres ---'
sudo docker logs bfp-postgres --tail 20 2>&1
echo ''
echo '--- NextJS ---'
sudo docker logs bfp-nextjs --tail 20 2>&1
echo ''
echo '--- Python Backend ---'
sudo docker logs bfp-python-backend --tail 20 2>&1
"

log_ok "Containers deployed"

# ==================== STEP 9: SSL Certificate =================
log_info "Setting up SSL certificate..."

gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --tunnel-through-iap \
    --command="
cd ~/berong-safescape

# Stop nginx to free port 80 for certbot standalone
sudo docker compose -f docker-compose.prod.yml stop nginx

# Get Let's Encrypt certificate
sudo certbot certonly --standalone \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive

# Copy certs to project directory
sudo cp -rL /etc/letsencrypt/live ~/berong-safescape/certbot/conf/live 2>/dev/null || true
sudo cp -rL /etc/letsencrypt/archive ~/berong-safescape/certbot/conf/archive 2>/dev/null || true
sudo chown -R \$USER:\$USER ~/berong-safescape/certbot/

# Restart nginx with SSL
sudo docker compose -f docker-compose.prod.yml start nginx

echo '✅ SSL certificate installed'
"

log_ok "SSL configured"

# ==================== STEP 10: Cron Jobs =======================
log_info "Setting up cron jobs..."

gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --tunnel-through-iap \
    --command="
# Create backup directory
mkdir -p ~/backups

# Add cron jobs
(crontab -l 2>/dev/null || true; cat << 'CRON'
# SSL Certificate renewal (twice daily)
0 3,15 * * * certbot renew --quiet --deploy-hook 'docker compose -f ~/berong-safescape/docker-compose.prod.yml restart nginx'

# Database backup (daily at 2 AM)
0 2 * * * cd ~/berong-safescape && docker exec bfp-postgres pg_dump -U bfp_prod_user bfp_berong_prod | gzip > ~/backups/backup_\$(date +\%Y\%m\%d).sql.gz

# Clean old backups (keep last 14 days)
0 4 * * * find ~/backups -name 'backup_*.sql.gz' -mtime +14 -delete

# Docker cleanup (weekly)
0 5 * * 0 docker system prune -af --filter 'until=168h'
CRON
) | sort -u | crontab -

echo '✅ Cron jobs configured'
"

log_ok "Cron jobs set up"

# ==================== STEP 11: Verify Deployment ================
echo ""
echo "============================================================"
echo "  Deployment Complete! Verification:"
echo "============================================================"
echo ""

gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --tunnel-through-iap \
    --command="
echo '🔍 Container Status:'
sudo docker compose -f ~/berong-safescape/docker-compose.prod.yml ps
echo ''
echo '🔍 Disk Usage:'
df -h /
echo ''
echo '🔍 Memory Usage:'
free -h
echo ''
echo '🔍 UFW Status:'
sudo ufw status verbose
echo ''
echo '🔍 Fail2Ban Status:'
sudo fail2ban-client status
echo ''
echo '🔍 SSL Certificate:'
sudo certbot certificates 2>/dev/null || echo 'Certbot not configured yet'
"

echo ""
echo "============================================================"
echo -e "${GREEN}  ✅ Deployment Complete!${NC}"
echo "============================================================"
echo ""
echo "  Instance: $INSTANCE_NAME"
echo "  IP: $STATIC_IP"
echo "  Domain: https://$DOMAIN"
echo ""
echo "  ⚠️  POST-DEPLOYMENT CHECKLIST:"
echo "  1. Verify https://$DOMAIN loads correctly"
echo "  2. Change the admin password immediately"
echo "  3. Test all functionality (login, simulation, chatbot)"
echo "  4. Rotate the Gemini API key in Google AI Studio"
echo "  5. Submit GCP abuse appeal for old instance"
echo "  6. Delete old compromised VM and static IP"
echo ""
echo "  🔑 SSH Access (via IAP tunnel only):"
echo "  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --tunnel-through-iap"
echo ""
echo "============================================================"
