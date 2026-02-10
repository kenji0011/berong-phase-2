# Docker Best Practices - Quick Reference Guide

## 🎯 Quick Commands

### Build & Deploy
```bash
# Development
docker-compose up -d --build

# Production
docker-compose -f docker-compose.prod.yml up -d --build

# Production with SSL
docker-compose -f docker-compose.ssl.yml up -d --build

# Rebuild specific service
docker-compose up -d --build nextjs
```

### Security Scanning
```bash
# Lint Dockerfile with Hadolint
docker run --rm -i hadolint/hadolint < Dockerfile
docker run --rm -i hadolint/hadolint < bfp-simulation-backend/Dockerfile

# Scan image for vulnerabilities with Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image bfp-nextjs:latest

docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image bfp-python-backend:latest

# Check image size and layers
docker history bfp-nextjs:latest --human --no-trunc
docker images bfp-nextjs:latest
```

### Monitoring & Debugging
```bash
# Check service health
docker-compose ps

# View logs
docker-compose logs -f nextjs
docker-compose logs -f python-backend
docker-compose logs --tail=100 postgres

# Check resource usage
docker stats

# Inspect container
docker inspect bfp-nextjs
docker inspect bfp-python-backend

# Access container shell (for debugging only)
docker exec -it bfp-nextjs sh
docker exec -it bfp-python-backend bash
```

### Cleanup
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: Deletes data)
docker-compose down -v

# Remove unused images
docker image prune -a

# Complete cleanup (CAUTION: Removes all unused resources)
docker system prune -a --volumes
```

## 📋 Pre-Deployment Checklist

### Code Review
- [ ] Dockerfile uses multi-stage build (if applicable)
- [ ] Base image is minimal and versioned (no `:latest`)
- [ ] All `RUN` commands combine related operations
- [ ] Cleanup commands in same layer as installation
- [ ] Non-root `USER` defined before CMD/ENTRYPOINT
- [ ] `EXPOSE` documents application port
- [ ] Health check defined with appropriate intervals
- [ ] No secrets hardcoded in Dockerfile
- [ ] `.dockerignore` excludes unnecessary files

### Security Review
- [ ] Image scanned with Trivy (no CRITICAL vulnerabilities)
- [ ] Dockerfile linted with Hadolint (no errors)
- [ ] Non-root user configured
- [ ] `no-new-privileges` security option set
- [ ] Resource limits defined in production
- [ ] Read-only root filesystem (where applicable)
- [ ] Environment variables for configuration
- [ ] Secrets managed externally (not in env vars)

### Performance Review
- [ ] Image size optimized (< 500MB for Next.js, < 1GB for Python)
- [ ] Build cache utilized effectively
- [ ] Multi-stage build minimizes final image size
- [ ] System dependencies only what's needed
- [ ] Layer order optimized for caching

### Operations Review
- [ ] Health checks respond correctly
- [ ] Resource limits appropriate for load
- [ ] Logging configured for aggregation
- [ ] Volumes configured for persistent data
- [ ] Network isolation properly configured
- [ ] Restart policy set appropriately
- [ ] Dependencies with health check conditions

## 🔧 Common Issues & Solutions

### Issue: Image Size Too Large
**Symptoms:** Slow builds, large registry storage

**Solutions:**
```dockerfile
# Use smaller base images
FROM node:18-alpine  # Instead of node:18
FROM python:3.11-slim  # Instead of python:3.11

# Multi-stage builds
FROM node:18-alpine AS builder
# ... build steps ...
FROM node:18-alpine AS runtime
COPY --from=builder /app/dist ./dist

# Combine and cleanup in same layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends package && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
```

### Issue: Slow Build Times
**Symptoms:** Long CI/CD pipelines, developer frustration

**Solutions:**
```dockerfile
# Order by change frequency (least to most)
COPY package.json ./
RUN npm install
COPY src/ ./src/

# Use BuildKit cache mounts
# syntax=docker/dockerfile:1
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Improve .dockerignore
node_modules
.git
*.md
tests/
```

### Issue: Container Running as Root
**Symptoms:** Security warnings, vulnerability scans fail

**Solution:**
```dockerfile
# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root
USER appuser

# Or use --chown in COPY (more efficient)
COPY --chown=appuser:appgroup . .
```

### Issue: Privilege Escalation Warnings
**Symptoms:** Security scans flag privilege escalation

**Solution in docker-compose.yml:**
```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
```

### Issue: Container Keeps Restarting
**Symptoms:** Service unavailable, logs show restart loop

**Debug:**
```bash
# Check logs
docker logs bfp-nextjs --tail=100

# Check health status
docker inspect bfp-nextjs | grep -A 10 Health

# Check resource constraints
docker stats bfp-nextjs

# Test health check manually
docker exec bfp-nextjs wget -q --spider http://localhost:3000
```

**Common Causes:**
- Health check failing
- Insufficient resources
- Database not ready (check depends_on)
- Incorrect CMD/ENTRYPOINT

### Issue: Volumes Permission Denied
**Symptoms:** Application can't write to mounted volumes

**Solution:**
```yaml
# In docker-compose.yml
services:
  app:
    volumes:
      - uploads_data:/app/public/uploads
    # In Dockerfile, ensure directory is owned by app user
```

```dockerfile
# In Dockerfile
RUN mkdir -p /app/public/uploads && \
    chown -R appuser:appgroup /app/public/uploads
```

### Issue: Network Connectivity Between Containers
**Symptoms:** Services can't reach each other

**Debug:**
```bash
# Check network
docker network ls
docker network inspect bfp-network

# Test connectivity
docker exec bfp-nextjs ping postgres
docker exec bfp-nextjs wget -O- http://python-backend:8000/api/health
```

**Solution:**
```yaml
# Use service names as hostnames
DATABASE_URL=postgresql://user:pass@postgres:5432/db
BACKEND_URL=http://python-backend:8000
```

## 🎨 Best Practices Summary

### Dockerfile
```dockerfile
# ✅ GOOD Example
FROM python:3.11-slim

WORKDIR /app

# Install deps and cleanup in one layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy dependencies first
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appgroup . .

# Non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["gunicorn", "main:app"]
```

### docker-compose.yml (Production)
```yaml
services:
  app:
    build: .
    restart: unless-stopped
    expose:  # Not ports (internal only)
      - "3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}  # From .env
    volumes:
      - app_data:/app/data
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

## 📊 Metrics to Monitor

### Image Metrics
- **Size:** < 500MB for Next.js, < 1GB for Python
- **Layers:** < 20 layers ideal
- **Build Time:** < 5 minutes for incremental builds
- **Vulnerabilities:** 0 CRITICAL, 0 HIGH

### Runtime Metrics
- **Startup Time:** < 60 seconds
- **Health Check Success Rate:** > 99%
- **Memory Usage:** Within defined limits
- **CPU Usage:** Within defined limits
- **Restart Count:** < 1 per day

### Security Metrics
- **Days Since Last Scan:** < 7 days
- **Base Image Age:** < 30 days
- **CVEs Fixed:** All CRITICAL and HIGH
- **Non-root Containers:** 100%

## 🔗 Quick Links

- [Main Documentation](../docs/DOCKER_SECURITY_IMPLEMENTATION.md)
- [Hadolint Config](../.hadolint.yaml)
- [Security Scan Workflow](../.github/workflows/docker-security-scan.yml)
- [Main Dockerfile](../Dockerfile)
- [Python Dockerfile](../bfp-simulation-backend/Dockerfile)

## 🆘 Getting Help

1. Check logs: `docker-compose logs -f`
2. Review health checks: `docker inspect <container> | grep Health`
3. Scan for vulnerabilities: `trivy image <image>`
4. Lint Dockerfile: `hadolint Dockerfile`
5. Check resource usage: `docker stats`

---

**Remember:** Security is a continuous process, not a one-time task!
