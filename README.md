# BFP Berong SafeScape: Intelligent Fire Safety & Evacuation Simulator

Berong SafeScape is an interactive e-learning and fire safety simulation platform developed for the Bureau of Fire Protection (BFP). It combines comprehensive educational modules tracking safe practices with an advanced AI-driven evacuation simulation engine to assess and teach fire safety effectively.

## 🌟 Key Features

### 📚 Adaptive E-Learning System
- **Role-based Tracks**: Distinct learning modules and experiences tailored for Kids, Adults, and Professionals/Admins.
- **Assessments**: Pre-test and post-test assessments to gauge knowledge improvement before and after completing modules.
- **Dynamic Certification**: Upon passing the final post-test, users earn a personalized SafeScape Hero Certificate, dynamically generated over an SVG template and exportable as a high-quality PDF.
- **Content Management System (CMS)**: Admins can dynamically reorder and manage articles, blogs, and educational videos directly from the dashboard.

### 🚒 Advanced 3D Fire Evacuation Simulation
- **AI Floor Plan Processing**: Utilizes a deep learning **U-Net** model (`unet_floorplan_model.pth`) to segment and analyze uploaded 2D floor plans.
- **Intelligent Pathfinding**: Implements the **A* Algorithm** to compute the fastest and safest evacuation routes dynamically.
- **Fire Spread Modeling**: Uses **Cellular Automata** to realistically simulate the spread of fire and smoke throughout the building.
- **Agent Behavior Modeling**: Employs **Finite State Machines (FSM)** and a Proximal Policy Optimization (**PPO**) Commander model to simulate realistic human behaviors, panic, and reactions during evacuation scenarios.

### 🤖 AI Integration & Tools
- **Fire Safety Chatbot**: An integrated AI assistant powered by the Google Gemini API to answer users' fire safety questions in real-time.
- **Email Notifications**: Automated email delivery using Nodemailer for user sign-ups, alerts, and system notifications.

## 🛠️ Technology Stack

**Frontend (Web Application)**
*   **Framework**: Next.js 15.2 (App Router) & React 19
*   **Styling**: Tailwind CSS v4 & Tailwind Animate
*   **Components**: Radix UI Primitives, Lucide React (Icons)
*   **State & Forms**: React Hook Form, Zod (Validation), Zustand/Context API
*   **Visualization**: Embla Carousel, Recharts, Fabric.js (Canvas drawing)
*   **Utilities**: `html-to-image` and `jspdf` for Certificate generation

**Backend (Simulation Engine)**
*   **Framework**: Python 3.x with FastAPI & Uvicorn
*   **AI/ML**: PyTorch (U-Net), Stable Baselines3 (PPO), OpenCV for image processing

**Database & Infrastructure**
*   **Database**: PostgreSQL
*   **ORM**: Prisma ORM (v6)
*   **Authentication**: Custom implementation using JWT/Jose and bcryptjs
*   **Deployment**: Docker & Docker Compose Support

---

## 🚀 Quick Start Guide

The easiest way to start both the Next.js frontend and the Python simulation backend simultaneously is using the provided `concurrently` script:

### Prerequisites
- Node.js & `pnpm` (Package Manager)
- Python 3.9+ (with `venv` setup in `bfp-simulation-backend/.venv`)
- PostgreSQL database running locally or remotely.

### Installation & Setup

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Environment Variables**
   Ensure your `.env` file is properly configured with your `DATABASE_URL`, JWT secrets, and `GEMINI_API_KEY`.

3. **Database Setup**
   Push the Prisma schema and seed the initial data (assessments, admin accounts, etc.):
   ```bash
   npx prisma db push
   pnpm run seed:all
   ```

4. **Run the Application**
   ```bash
   pnpm run dev:full
   ```
   *This command spins up the Next.js frontend at `http://localhost:3000` and the FastAPI backend at `http://0.0.0.0:8001`.*

## 🐳 Docker Deployment

For production-ready containerized deployment, we provide a robust setup:

```bash
# Development (Hot-reloading)
make dev          # Uses docker-compose.yml

# Production
make prod         # Uses docker-compose.prod.yml

# Commands reference
make logs         # View running logs
make security     # Run automated security scans
```
*Note: Ensure your `.env` is correctly mapped for Docker environments.*

---

## 📂 Project Structure Overview

```text
bfp-berong-safescape/
├── app/                        # Next.js App Router (Pages, API Routes, Layouts)
│   ├── admin/                  # CMS & Admin Dashboard
│   ├── api/                    # Next.js REST API endpoints
│   ├── assessment/             # Pre/Post-Test evaluation pages
│   ├── kids/                   # Kids learning track
│   └── profile/                # User profile & certificate viewing
├── bfp-simulation-backend/     # Python FastAPI Simulation Engine
│   ├── models/                 # Pre-trained U-Net and PPO models
│   └── simulation.py           # Core logic (A*, Cellular Automata, FSM)
├── components/                 # Reusable React UI Components (Radix, Custom)
├── prisma/                     # Database Schema and Seed Scripts
└── public/                     # Static assets (SVGs, Images, Legacy HTML modules)
```