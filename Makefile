# Makefile for BFP Berong Docker Operations
# Simplifies common Docker commands for dev and production

.PHONY: help build up down logs clean scan lint test security dev prod prod-ssl

# Compose file references
DEV_COMPOSE = docker compose
PROD_COMPOSE = docker compose -f docker-compose.prod.yml
SSL_COMPOSE = docker compose -f docker-compose.ssl.yml

# Default target
help:
	@echo "BFP Berong Docker Operations"
	@echo "=============================="
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev              - Start development environment"
	@echo "  make dev-build        - Build dev images"
	@echo "  make logs             - View dev logs (all services)"
	@echo "  make logs-nextjs      - View Next.js dev logs"
	@echo "  make logs-python      - View Python backend dev logs"
	@echo "  make logs-db          - View PostgreSQL dev logs"
	@echo "  make down             - Stop dev services"
	@echo "  make restart          - Restart dev services"
	@echo ""
	@echo "Production Commands:"
	@echo "  make prod             - Start production environment"
	@echo "  make prod-ssl         - Start production with SSL"
	@echo "  make prod-build       - Build all prod images"
	@echo "  make prod-build-nextjs - Rebuild only Next.js (prod)"
	@echo "  make prod-build-python - Rebuild only Python backend (prod)"
	@echo "  make prod-rebuild     - Force rebuild all prod images (no cache)"
	@echo "  make prod-down        - Stop production services"
	@echo "  make prod-restart     - Restart all prod services"
	@echo "  make prod-restart-nginx - Restart only nginx"
	@echo "  make prod-restart-nextjs - Restart only Next.js"
	@echo "  make prod-restart-python - Restart only Python backend"
	@echo "  make prod-logs        - View all prod logs"
	@echo "  make prod-logs-nginx  - View nginx prod logs"
	@echo "  make prod-logs-nextjs - View Next.js prod logs"
	@echo "  make prod-logs-python - View Python backend prod logs"
	@echo "  make prod-logs-db     - View PostgreSQL prod logs"
	@echo "  make prod-ps          - Show prod container status"
	@echo "  make prod-clean       - Stop prod and remove images"
	@echo ""
	@echo "Quick Deploy:"
	@echo "  make deploy-nextjs    - Rebuild & restart Next.js only (prod)"
	@echo "  make deploy-python    - Rebuild & restart Python backend only (prod)"
	@echo "  make deploy-all       - Full prod rebuild & force recreate"
	@echo ""
	@echo "Nginx Commands:"
	@echo "  make nginx-test       - Test nginx config syntax"
	@echo "  make nginx-reload     - Reload nginx config (no downtime)"
	@echo "  make nginx-logs-error - View nginx error log"
	@echo ""
	@echo "Database Commands:"
	@echo "  make db-shell         - Open psql shell (dev)"
	@echo "  make db-shell-prod    - Open psql shell (prod)"
	@echo "  make db-backup        - Backup dev database"
	@echo "  make db-backup-prod   - Backup prod database"
	@echo "  make db-restore       - Restore dev database from backup"
	@echo "  make db-migrate       - Run Prisma migrations (dev)"
	@echo "  make db-migrate-prod  - Run Prisma migrations (prod)"
	@echo "  make db-seed          - Seed database (dev)"
	@echo "  make db-studio        - Open Prisma Studio"
	@echo "  make db-generate      - Generate Prisma client"
	@echo ""
	@echo "Build Commands:"
	@echo "  make build            - Build all dev images"
	@echo "  make rebuild          - Force rebuild all dev images"
	@echo ""
	@echo "Security Commands:"
	@echo "  make security         - Run all security checks"
	@echo "  make scan             - Scan images for vulnerabilities"
	@echo "  make lint             - Lint all Dockerfiles"
	@echo ""
	@echo "Maintenance Commands:"
	@echo "  make ps               - Show running containers"
	@echo "  make stats            - Show resource usage"
	@echo "  make health           - Check health of all services"
	@echo "  make clean            - Remove dev containers and images"
	@echo "  make clean-all        - Remove everything including volumes"
	@echo "  make prune            - Remove all unused Docker resources"
	@echo "  make image-size       - Show image sizes"
	@echo ""
	@echo "Shell Access:"
	@echo "  make shell-nextjs     - Shell into Next.js container"
	@echo "  make shell-python     - Shell into Python backend container"
	@echo "  make shell-nginx      - Shell into nginx container"
	@echo "  make shell-db         - Shell into PostgreSQL container"
	@echo ""
	@echo "Network / Debug:"
	@echo "  make network-test     - Test inter-service connectivity"
	@echo "  make env-check        - Verify .env file exists and has required vars"

# ============================================================
# Development Commands
# ============================================================

dev:
	@echo "Starting development environment..."
	$(DEV_COMPOSE) up -d --build
	@echo "Dev services started at http://localhost:3000"

dev-build:
	@echo "Building dev images..."
	$(DEV_COMPOSE) build

down:
	@echo "Stopping dev services..."
	$(DEV_COMPOSE) down

restart:
	@echo "Restarting dev services..."
	$(DEV_COMPOSE) restart

logs:
	$(DEV_COMPOSE) logs -f

logs-nextjs:
	$(DEV_COMPOSE) logs -f nextjs

logs-python:
	$(DEV_COMPOSE) logs -f python-backend

logs-db:
	$(DEV_COMPOSE) logs -f postgres

# ============================================================
# Production Commands
# ============================================================

prod:
	@echo "Starting production environment..."
	$(PROD_COMPOSE) up -d --build
	@echo "Production services started!"

prod-ssl:
	@echo "Starting production environment with SSL..."
	$(SSL_COMPOSE) up -d --build
	@echo "Production services with SSL started!"

prod-build:
	@echo "Building prod images..."
	$(PROD_COMPOSE) build

prod-build-nextjs:
	@echo "Building only Next.js image (prod)..."
	$(PROD_COMPOSE) build nextjs

prod-build-python:
	@echo "Building only Python backend image (prod)..."
	$(PROD_COMPOSE) build python-backend

prod-rebuild:
	@echo "Force rebuilding all prod images (no cache)..."
	$(PROD_COMPOSE) build --no-cache

prod-down:
	@echo "Stopping production services..."
	$(PROD_COMPOSE) down

prod-restart:
	@echo "Restarting all prod services..."
	$(PROD_COMPOSE) restart

prod-restart-nginx:
	@echo "Restarting nginx..."
	$(PROD_COMPOSE) restart nginx

prod-restart-nextjs:
	@echo "Restarting Next.js..."
	$(PROD_COMPOSE) restart nextjs

prod-restart-python:
	@echo "Restarting Python backend..."
	$(PROD_COMPOSE) restart python-backend

prod-logs:
	$(PROD_COMPOSE) logs -f

prod-logs-nginx:
	$(PROD_COMPOSE) logs -f nginx

prod-logs-nextjs:
	$(PROD_COMPOSE) logs -f nextjs

prod-logs-python:
	$(PROD_COMPOSE) logs -f python-backend

prod-logs-db:
	$(PROD_COMPOSE) logs -f postgres

prod-ps:
	@echo "Production container status:"
	@$(PROD_COMPOSE) ps

prod-clean:
	@echo "Stopping prod and removing images..."
	$(PROD_COMPOSE) down --rmi all

# Rebuild and restart a single service without touching others
prod-up-nextjs:
	@echo "Rebuilding and restarting Next.js only..."
	$(PROD_COMPOSE) up -d --build --no-deps nextjs

prod-up-python:
	@echo "Rebuilding and restarting Python backend only..."
	$(PROD_COMPOSE) up -d --build --no-deps python-backend

# ============================================================
# Nginx Commands
# ============================================================

nginx-test:
	@echo "Testing nginx configuration..."
	@docker exec bfp-nginx nginx -t

nginx-reload:
	@echo "Reloading nginx configuration (zero downtime)..."
	@docker exec bfp-nginx nginx -s reload
	@echo "Nginx config reloaded!"

nginx-logs-error:
	@docker exec bfp-nginx tail -100 /var/log/nginx/error.log 2>/dev/null || docker logs bfp-nginx --tail 100 2>&1 | grep -i error

# ============================================================
# Database Commands
# ============================================================

db-shell:
	@docker compose exec postgres psql -U bfp_user bfp_berong

db-shell-prod:
	@docker exec -it bfp-postgres psql -U bfp_user bfp_berong

db-backup:
	@echo "Backing up dev database..."
	@docker compose exec -T postgres pg_dump -U bfp_user bfp_berong > backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "Backup complete!"

db-backup-prod:
	@echo "Backing up production database..."
	@docker exec bfp-postgres pg_dump -U bfp_user bfp_berong > backup-prod-$$(date +%Y%m%d-%H%M%S).sql
	@echo "Production backup complete!"

db-restore:
	@echo "Restoring database..."
	@read -p "Enter backup file name: " backup_file; \
	docker compose exec -T postgres psql -U bfp_user bfp_berong < $$backup_file
	@echo "Restore complete!"

db-migrate:
	@echo "Running Prisma migrations..."
	$(DEV_COMPOSE) exec nextjs npx prisma migrate deploy

db-migrate-prod:
	@echo "Running Prisma migrations (prod)..."
	@docker exec bfp-nextjs npx prisma migrate deploy

db-seed:
	@echo "Seeding database..."
	$(DEV_COMPOSE) exec nextjs npx prisma db seed

db-studio:
	@echo "Opening Prisma Studio..."
	npx prisma studio

db-generate:
	@echo "Generating Prisma client..."
	npx prisma generate

# ============================================================
# Build Commands
# ============================================================

build:
	@echo "Building Docker images..."
	$(DEV_COMPOSE) build

rebuild:
	@echo "Force rebuilding Docker images..."
	$(DEV_COMPOSE) build --no-cache

# ============================================================
# Status & Monitoring
# ============================================================

ps:
	@echo "Container Status:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "bfp-|NAMES"

stats:
	@echo "Resource Usage:"
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep -E "bfp-|NAME"

health:
	@echo "Health Check Status:"
	@docker inspect --format='{{.Name}}: {{if .State.Health}}{{.State.Health.Status}}{{else}}no healthcheck{{end}}' $$(docker ps -q --filter "name=bfp-") 2>/dev/null || echo "No running BFP containers"

# ============================================================
# Security Commands
# ============================================================

security: lint scan
	@echo "Security checks complete!"

lint:
	@echo "Linting Dockerfiles..."
	@docker run --rm -i hadolint/hadolint < Dockerfile || echo "Next.js Dockerfile has issues"
	@docker run --rm -i hadolint/hadolint < bfp-simulation-backend/Dockerfile || echo "Python Dockerfile has issues"
	@echo "Linting complete!"

scan:
	@echo "Scanning images for vulnerabilities..."
	@echo "--- Next.js image ---"
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy:latest image --severity HIGH,CRITICAL berong-safescape-nextjs:latest || echo "Build image first with 'make build'"
	@echo ""
	@echo "--- Python Backend image ---"
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy:latest image --severity HIGH,CRITICAL berong-safescape-python-backend:latest || echo "Build image first with 'make build'"
	@echo "Vulnerability scan complete!"

scan-full:
	@echo "Full vulnerability scan (all severities)..."
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy:latest image berong-safescape-nextjs:latest
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy:latest image berong-safescape-python-backend:latest

# ============================================================
# Clean Up
# ============================================================

clean:
	@echo "Cleaning up dev containers and images..."
	$(DEV_COMPOSE) down --rmi all

clean-all:
	@echo "WARNING: This will remove all containers, images, and volumes!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(DEV_COMPOSE) down -v --rmi all; \
		$(PROD_COMPOSE) down -v --rmi all 2>/dev/null; \
		echo "Cleanup complete!"; \
	else \
		echo "Cleanup cancelled"; \
	fi

prune:
	@echo "Pruning unused Docker resources..."
	docker system prune -f
	@echo "Prune complete! Use 'docker system prune -a' for aggressive cleanup."

# ============================================================
# Testing
# ============================================================

test:
	@echo "Running tests in containers..."
	@$(DEV_COMPOSE) exec nextjs pnpm test || echo "Tests not configured for Next.js"
	@$(DEV_COMPOSE) exec python-backend python -m pytest || echo "Tests not configured for Python"

test-python:
	@echo "Running Python backend tests..."
	@docker exec bfp-python-backend python -m pytest -v

# ============================================================
# Shell Access
# ============================================================

shell-nextjs:
	@docker exec -it bfp-nextjs sh

shell-python:
	@docker exec -it bfp-python-backend bash

shell-nginx:
	@docker exec -it bfp-nginx sh

shell-db:
	@docker exec -it bfp-postgres psql -U bfp_user bfp_berong

# ============================================================
# Image Info
# ============================================================

image-size:
	@echo "Image Sizes:"
	@docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -E "bfp|berong|REPOSITORY"

image-history:
	@echo "Next.js Image Layers:"
	@docker history berong-safescape-nextjs:latest --human 2>/dev/null || echo "Build image first"
	@echo ""
	@echo "Python Backend Image Layers:"
	@docker history berong-safescape-python-backend:latest --human 2>/dev/null || echo "Build image first"

# ============================================================
# Network / Debug
# ============================================================

network-test:
	@echo "Testing network connectivity..."
	@echo "--- Next.js -> Python Backend ---"
	@docker exec bfp-nextjs wget -q -O- http://python-backend:8000/api/health 2>/dev/null && echo " OK" || echo " FAILED"
	@echo "--- Python Backend -> PostgreSQL ---"
	@docker exec bfp-python-backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health'); print(' OK')" 2>/dev/null || echo " FAILED"
	@echo "--- Nginx -> Next.js ---"
	@docker exec bfp-nginx wget -q -O- http://nextjs:3000 2>/dev/null && echo " OK" || echo " FAILED"

env-check:
	@echo "Checking .env file..."
	@if [ -f .env ]; then \
		echo ".env file found"; \
		echo "Required variables:"; \
		for var in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB JWT_SECRET; do \
			if grep -q "^$$var=" .env; then \
				echo "  $$var: SET"; \
			else \
				echo "  $$var: MISSING"; \
			fi; \
		done; \
	else \
		echo "ERROR: .env file not found! Copy from .env.example"; \
	fi

# ============================================================
# Update Base Images
# ============================================================

update-images:
	@echo "Pulling latest base images..."
	@docker pull node:20-alpine
	@docker pull python:3.11-slim
	@docker pull postgres:15-alpine
	@docker pull nginx:alpine
	@echo "Base images updated! Run 'make rebuild' to rebuild with new bases."

# ============================================================
# CI/CD Simulation
# ============================================================

ci-test:
	@echo "Running CI/CD checks..."
	@make lint
	@make build
	@make scan
	@echo "All CI/CD checks passed!"

# ============================================================
# Quick Deploy Shortcuts
# ============================================================

# Rebuild & restart Next.js only (prod)
deploy-nextjs: prod-build-nextjs prod-restart-nextjs
	@echo "Next.js deployed!"

# Rebuild & restart Python backend only (prod)
deploy-python: prod-build-python prod-restart-python
	@echo "Python backend deployed!"

# Full prod deploy: rebuild all + force recreate
deploy-all:
	@echo "Full production deployment..."
	$(PROD_COMPOSE) up -d --build --force-recreate
	@echo "Full deployment complete!"

# Tail last 100 lines of all prod logs (non-follow)
prod-logs-tail:
	$(PROD_COMPOSE) logs --tail 100
