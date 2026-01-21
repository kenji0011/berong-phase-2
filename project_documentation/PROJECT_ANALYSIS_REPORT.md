# Project Analysis Report: Berong SafeScape

## 1. Project Overview

**Berong SafeScape** is a comprehensive fire safety e-learning and evacuation simulation platform designed for the Bureau of Fire Protection (BFP). It serves multiple user roles (Kids, Adults, Professionals, Admins) with tailored educational content and features a sophisticated AI-powered fire evacuation simulation tool.

### 1.1 Technology Stack

*   **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Shadcn/UI, Radix UI, Framer Motion.
*   **Backend (Simulation)**: Python 3.x, FastAPI, PyTorch (U-Net), Gymnasium (RL Environment), Google Gemini API (Semantic Analysis/Chatbot).
*   **Database**:
    *   **Frontend**: Prisma ORM with SQLite (local) / PostgreSQL (production ready).
    *   **Backend**: `jobs.db` (SQLite) for tracking simulation job statuses.
*   **Infrastructure**: Docker support, Nginx configuration.

### 1.2 Project Structure

The project is a monorepo-style structure containing both frontend and backend:

*   **`/app`**: Next.js App Router structure. Contains routes for different user roles (`/kids`, `/adult`, `/professional`, `/admin`) and API routes (`/api`).
*   **`/components`**: React UI components. Notable complex components include:
    *   `fabric-floor-plan-builder.tsx`: Interactive floor plan editor using Fabric.js.
    *   `simulation-wizard.tsx`: Wizard interface for configuring and running simulations.
*   **`/bfp-simulation-backend`**: Dedicated Python backend for the simulation engine.
    *   `main.py`: FastAPI application entry point.
    *   `simulation.py`: Core simulation logic (Cellular Automata & Agents).
    *   `unet.py`: Neural network definition for floor plan segmentation.
    *   `inference.py`: Image processing and model inference pipelines.
*   **`/project_documentation`**: Extensive documentation covering architecture, plans, and analysis.

---

## 2. Simulation Deep Dive

The simulation component is the technical centerpiece of the application, transforming static floor plan images into dynamic, interactive fire evacuation scenarios.

### 2.1 Architecture

The simulation operates as a decoupled microservice:
1.  **Frontend**: User uploads a floor plan image and configures parameters (fire origin, number of agents).
2.  **API Layer**: The Next.js API acts as a gateway, forwarding requests to the FastAPI backend.
3.  **Processing**: The Python backend uses Computer Vision to understand the floor plan and Agent-Based Modeling (ABM) to simulate the evacuation.

### 2.2 Key Algorithms & Models

#### A. Floor Plan Understanding (CV)
*   **U-Net Model**: A Convolutional Neural Network (CNN) defined in `unet.py`. It performs semantic segmentation to convert a raw image into a binary grid (Wall vs. Free Space).
*   **Gemini Vision Integration**: The `process_image_gemini` endpoint attempts to use Google's Gemini Pro Vision to semantically identify distinct architectural elements:
    *   **Walls** (Impassable)
    *   **Doors** (Passable but flammable)
    *   **Windows** (Passable for fire, not agents, unless specific logic applies)
    *   *Fallback Strategy*: If Gemini fails or detects insufficient walls, the system falls back to the local U-Net model.

#### B. Fire Spread (Cellular Automata)
Implemented in `FireSimulator` class (`simulation.py`):
*   **Model**: Cellular Automata (CA) on a grid.
*   **Dynamics**: Fire spreads from burning cells to neighbors (von Neumann neighborhood).
*   **Material Awareness**: Distinct probabilities for spreading based on cell type:
    *   `CELL_FREE`: 0.25 (Standard spread)
    *   `CELL_WALL`: 0.0 (Blocks fire)
    *   `CELL_DOOR`: 0.6 (Higher spread risk)
    *   `CELL_WINDOW`: 0.8 (Rapid spread due to breaking behavior)

#### C. Agent Behavior (ABM)
Implemented in `Person` class (`simulation.py`):
*   **Pathfinding**: Agents use **A* Search Algorithm** to find the shortest path to an exit.
    *   *Dynamic Re-routing*: Agents recalculate paths if their current path is blocked by fire.
*   **State Machine**:
    *   `CALM` (Normal speed)
    *   `ALERT` (Increased speed, when fire is within distance 50)
    *   `PANICKED` (High speed, erratic behavior, when fire is within distance 25). Panicked agents have a probability (`trip_probability`) of "tripping" (pausing for several steps).
*   **Assembly Point Logic**: A two-phase evacuation system:
    1.  **Phase 1**: Escape the building (reach an exterior cell).
    2.  **Phase 2**: Navigate via "exterior-only" paths to a designated Assembly Point, preventing agents from re-entering the burning building.

### 2.3 Data Flow

1.  **Input**: Floor plan image + Configuration (Fire Start, Agent Counts).
2.  **Preprocessing**: Image -> U-Net/Gemini -> Grid (256x256 numpy array).
3.  **Simulation Loop**:
    *   **Step T**:
        *   Update Fire (Probabilistic spread).
        *   Update Agents (Check fire proximity -> Update State -> Plan A* Path -> Move).
        *   Record State (Fire locations, Agent positions/statuses).
    *   Repeat until all agents escape or perish.
4.  **Output**: A JSON sequence of frames containing delta-compressed or full-state updates for the frontend to render via HTML5 Canvas.

### 2.4 Reinforcement Learning (RL) Component
The codebase includes an `EvacuationEnv` gym environment and references to a PPO (Proximal Policy Optimization) model.
*   **Intent**: To train "Smart Agents" that learn optimal evacuation strategies rather than just following heuristic A* paths.
*   **Observation Space**: Fire map, Agent positions, Agent states.
*   **Status**: The code supports loading a `ppo_commander` model, but the `run_heuristic_simulation` path (using standard A*) appears to be the primary/fallback execution mode for reliability.

## 3. Conclusion

The project is a robust, well-architected application blending modern web technologies with classical AI (Pathfinding, CA) and modern ML (U-Net, LLMs). The simulation engine is sophisticated, handling complex behaviors like panic and dynamic path recalculation, making it a valuable tool for fire safety training.
