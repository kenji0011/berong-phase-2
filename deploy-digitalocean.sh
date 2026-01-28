#!/bin/bash
# ===========================================
# BFP Berong - DigitalOcean Deployment Script
# ===========================================
# Run this script on your DigitalOcean Droplet
# Usage: chmod +x deploy-digitalocean.sh && ./deploy-digitalocean.sh

set -e

echo "================================================"
echo "   BFP Berong - DigitalOcean Deployment"
echo "   Domain: bfpscberong.app"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="bfpscberong.app"
EMAIL="${EMAIL:-admin@bfpscberong.app}"
APP_DIR="$HOME/apps/bfp-berong"

# ===========================================
# Step 1: System Update & Dependencies
# ===========================================
echo -e "${YELLOW}[1/7] Updating system and installing dependencies...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban

# ===========================================
# Step 2: Install Docker
# ===========================================
echo -e "${YELLOW}[2/7] Setting up Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}Docker installed!${NC}"
else
    echo -e "${GREEN}Docker already installed.${NC}"
fi

# ===========================================
# Step 3: Install Docker Compose
# ===========================================
echo -e "${YELLOW}[3/7] Setting up Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed!${NC}"
else
    echo -e "${GREEN}Docker Compose already installed.${NC}"
fi

# ===========================================
# Step 4: Install Git LFS
# ===========================================
echo -e "${YELLOW}[4/7] Setting up Git LFS...${NC}"
if ! command -v git-lfs &> /dev/null; then
    sudo apt install -y git-lfs
    git lfs install
    echo -e "${GREEN}Git LFS installed!${NC}"
else
    echo -e "${GREEN}Git LFS already installed.${NC}"
fi

# ===========================================
# Step 5: Configure Firewall
# ===========================================
echo -e "${YELLOW}[5/7] Configuring firewall...${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
echo -e "${GREEN}Firewall configured!${NC}"

# ===========================================
# Step 6: Setup Application
# ===========================================
echo -e "${YELLOW}[6/7] Setting up application...${NC}"

if [ -d "$APP_DIR" ]; then
    echo "Updating existing installation..."
    cd "$APP_DIR"
    git pull origin main
    git lfs pull
else
    echo "Please clone your repository first:"
    echo "  mkdir -p ~/apps && cd ~/apps"
    echo "  git clone YOUR_REPO_URL bfp-berong"
    echo "  cd bfp-berong"
    echo "Then run this script again."
    exit 1
fi

# Create certbot directories
mkdir -p certbot/conf certbot/www

# ===========================================
# Step 7: Setup Environment
# ===========================================
echo -e "${YELLOW}[7/7] Setting up environment...${NC}"

if [ ! -f "$APP_DIR/.env" ]; then
    echo "Creating .env file..."
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > "$APP_DIR/.env" << EOF
# ===========================================
# BFP Berong - Production Environment
# Generated: $(date)
# ===========================================

# Database
POSTGRES_USER=bfp_prod_user
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=bfp_berong_prod

# Application
NODE_ENV=production
DOMAIN=$DOMAIN
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,http://localhost,http://nextjs:3000

# Security
JWT_SECRET=$JWT_SECRET

# Optional: Add your API keys
GEMINI_API_KEY=
EOF

    echo -e "${GREEN}Created .env with secure credentials!${NC}"
    echo -e "${YELLOW}⚠️  Please add your GEMINI_API_KEY to .env if needed${NC}"
else
    echo -e "${GREEN}.env file exists${NC}"
fi

# ===========================================
# Deployment Instructions
# ===========================================
echo ""
echo "================================================"
echo -e "${GREEN}   Setup Complete!${NC}"
echo "================================================"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. ${YELLOW}Edit .env file if needed:${NC}"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. ${YELLOW}Get SSL Certificate:${NC}"
echo "   cd $APP_DIR"
echo "   docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "   # Wait for containers to be healthy, then:"
echo "   docker run --rm -v \$(pwd)/certbot/conf:/etc/letsencrypt \\"
echo "     -v \$(pwd)/certbot/www:/var/www/certbot \\"
echo "     certbot/certbot certonly --webroot \\"
echo "     --webroot-path=/var/www/certbot \\"
echo "     --email $EMAIL --agree-tos --no-eff-email \\"
echo "     -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "3. ${YELLOW}Switch to SSL configuration:${NC}"
echo "   docker-compose -f docker-compose.prod.yml down"
echo "   docker-compose -f docker-compose.ssl.yml up -d --build"
echo ""
echo "4. ${YELLOW}Verify deployment:${NC}"
echo "   curl https://$DOMAIN"
echo ""
echo "================================================"
echo -e "${GREEN}Your site will be live at: https://$DOMAIN${NC}"
echo "================================================"
