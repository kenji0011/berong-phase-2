# Implementation Plan - Building Material Selection

## Goal
Add a user interface option to select the building material (Wood vs. Concrete) during simulation configuration. The selected material will influence the fire spread rate in the simulation, with wood causing faster fire spread.

## User Review Required
> [!NOTE]
> I am placing the "Material Type" selection in the `SimulationSetup` component (Stage 3: "Configure Simulation") rather than the "Exits" stage (Stage 2). The "Exits" stage is dedicated to the visual placement of exits and assembly points on the canvas, while `SimulationSetup` is where simulation parameters (agent count, fire position) are defined. This provides a cleaner UI experience.

## Proposed Changes

### Frontend (`components/simulation-wizard.tsx` & `components/simulation-setup.tsx`)
1.  **Modify `SimulationData` interface** in `simulation-wizard.tsx`:
    *   Add `materialType: 'concrete' | 'wood'` to the `config` object.
    *   Default to `'concrete'`.
2.  **Update `SimulationSetup` component**:
    *   Add a visual selector (Cards or Radio Group) for "Building Material".
    *   Wood: Higher fire risk icon/description.
    *   Concrete: Standard fire risk icon/description.
    *   Pass the selection back via `onConfigUpdate`.
3.  **Update `handleRunSimulation` in `simulation-wizard.tsx`**:
    *   Include `material_type` in the POST request body to `/api/simulation/run-simulation`.

### Backend (`bfp-simulation-backend/`)
1.  **Update `SimulationConfig` model in `main.py`**:
    *   Add `material_type: str = "concrete"`.
2.  **Update `run_simulation_task` in `main.py`**:
    *   Extract `material_type` from config.
    *   Pass it to `run_heuristic_simulation`.
3.  **Update `run_heuristic_simulation` in `simulation.py`**:
    *   Accept `material_type` argument.
    *   Pass it to `FireSimulator` constructor.
4.  **Update `FireSimulator` in `simulation.py`**:
    *   Accept `material_type` in `__init__`.
    *   **Logic Change**: If `material_type == 'wood'`, increase `FIRE_SPREAD_PROBS`.
        *   `CELL_FREE`: 0.25 -> 0.45
        *   `CELL_DOOR`: 0.6 -> 0.8
        *   `CELL_WINDOW`: 0.8 -> 0.95

## Verification Plan

### Manual Verification
1.  **Frontend Test**:
    *   Open Simulation Wizard.
    *   Upload a floor plan.
    *   Place exits.
    *   In "Configure Simulation", verify the "Material Type" selector appears.
    *   Select "Wood".
    *   Run Simulation.
2.  **Simulation Behavior**:
    *   Observe the fire spread rate. It should be noticeably faster than the default "Concrete" setting.
3.  **Backend Logs**:
    *   Check backend logs to confirm `material_type='wood'` was received and applied.
