# BFP Evacuation Simulation Application

This application provides a fire evacuation simulation tool with a web interface for creating and running evacuation scenarios.

## Quick Start

The easiest way to start the application is by using one of the provided startup scripts:

### Windows
```bash
# Double-click start-app.bat or run in command prompt:
start-app.bat
```

### Linux/Mac
```bash
# Make the script executable and run it:
chmod +x start-app.sh
./start-app.sh
```

### Using npm (Alternative)
```bash
npm run dev:full
```

## Docker Deployment 🐳

For production-ready containerized deployment:

### Quick Start with Docker
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d

# Production with SSL
docker-compose -f docker-compose.ssl.yml up -d
```

### Using Makefile (Recommended)
```bash
make dev          # Start development
make prod         # Start production
make prod-ssl     # Start with SSL
make logs         # View logs
make security     # Run security checks
make help         # Show all commands
```

### Docker Documentation
- 📖 [Docker Review Summary](docs/DOCKER_REVIEW_SUMMARY.md) - Complete overview
- 🔒 [Security Implementation](docs/DOCKER_SECURITY_IMPLEMENTATION.md) - Security details
- 🚀 [Quick Reference](docs/DOCKER_QUICK_REFERENCE.md) - Commands & troubleshooting

**Features:**
- ✅ Multi-stage builds for optimal image size
- ✅ Non-root users for security
- ✅ Health checks for all services
- ✅ Automated security scanning
- ✅ Resource limits in production
- ✅ Comprehensive logging

## Manual Setup

If you prefer to start the servers manually:

### Frontend (Next.js)
```bash
npm run dev
```
The frontend will be available at http://localhost:3000

### Backend (FastAPI)
```bash
cd bfp-simulation-backend
python main.py
```
The backend API will be available at http://localhost:8000

## Prerequisites

- Node.js (for the frontend)
- Python 3.x (for the backend)
- npm or pnpm package manager

## Features

- Interactive floor plan simulation
- Evacuation route planning
- Real-time simulation visualization
- Fire spread modeling
- Agent-based evacuation behavior

## Project Structure

- `app/` - Next.js frontend pages and components
- `bfp-simulation-backend/` - Python FastAPI backend for simulation processing
- `components/` - React UI components
- `public/` - Static assets