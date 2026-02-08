import gc
import threading
import uuid
from typing import Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from core.config import SIMULATION_TIMEOUT_SECONDS
from core.state import state
from db.jobs import update_job_status
from schemas import SimulationConfig
from simulation import EvacuationEnv, run_heuristic_simulation, sample_fire_coords

# Dedicated thread pool for simulations — isolated from FastAPI's event loop
_simulation_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="sim")

# Max fire coordinates per frame to prevent payload explosion (57 MB -> ~3 MB)
MAX_FIRE_COORDS = 3000


def _cap_fire_coords(fire_map):
    """Extract fire coordinates, capping at MAX_FIRE_COORDS with dense coverage."""
    return sample_fire_coords(fire_map, MAX_FIRE_COORDS)


def frontend_to_backend(row: int, col: int) -> Tuple[int, int]:
    return (col, row)


def backend_to_frontend(x: int, y: int) -> Tuple[int, int]:
    return (y, x)


def distribute_exits_to_model(
    user_exits: List[Tuple[int, int]],
    grid: np.ndarray,
    total_model_exits: int = 248,
) -> List[Tuple[int, int]]:
    if not user_exits:
        return auto_detect_exits(grid, total_model_exits)

    num_user_exits = len(user_exits)
    exits_per_location = total_model_exits // num_user_exits
    remainder = total_model_exits % num_user_exits

    distributed_exits = []

    for i, (exit_x, exit_y) in enumerate(user_exits):
        count = exits_per_location + (1 if i < remainder else 0)

        for j in range(count):
            angle = (2 * np.pi * j) / count if count > 1 else 0
            radius = min(2, j % 3)
            offset_x = int(radius * np.cos(angle))
            offset_y = int(radius * np.sin(angle))

            new_x = exit_x + offset_x
            new_y = exit_y + offset_y

            new_x = max(0, min(255, new_x))
            new_y = max(0, min(255, new_y))

            if 0 <= new_y < grid.shape[0] and 0 <= new_x < grid.shape[1]:
                if grid[new_y][new_x] == 0:
                    distributed_exits.append((new_x, new_y))
                else:
                    distributed_exits.append((exit_x, exit_y))
            else:
                distributed_exits.append((exit_x, exit_y))

    while len(distributed_exits) < total_model_exits:
        distributed_exits.append(user_exits[0])

    return distributed_exits[:total_model_exits]


def auto_detect_exits(grid: np.ndarray, max_exits: int = 248) -> List[Tuple[int, int]]:
    exits = []
    height, width = grid.shape

    for x in range(width):
        if grid[0, x] == 0:
            exits.append((x, 0))
        if grid[height - 1, x] == 0:
            exits.append((x, height - 1))

    for y in range(height):
        if grid[y, 0] == 0:
            exits.append((0, y))
        if grid[y, width - 1] == 0:
            exits.append((width - 1, y))

    exits = list(set(exits))[:max_exits]

    while len(exits) < max_exits:
        exits.append(exits[0] if exits else (0, 0))

    return exits[:max_exits]


def _run_simulation_inner(job_id: str, config: SimulationConfig, result_holder: dict):
    try:
        grid = np.array(config.grid)

        agent_positions_xy = [frontend_to_backend(row, col) for row, col in config.agent_positions]
        fire_position_xy = frontend_to_backend(config.fire_position[0], config.fire_position[1])

        if config.exits and len(config.exits) > 0:
            exits_xy = [frontend_to_backend(row, col) for row, col in config.exits]
            print(
                f"[JOB {job_id[:8]}] Converted {len(config.exits)} exits from (row,col) to (x,y) format",
                flush=True,
            )

            min_exit_agent_distance = 20
            validated_exits = []
            for ex in exits_xy:
                ex_x, ex_y = int(ex[0]), int(ex[1])
                if 0 <= ex_y < grid.shape[0] and 0 <= ex_x < grid.shape[1]:
                    if grid[ex_y][ex_x] == 1:
                        print(
                            f"[JOB {job_id[:8]}] WARNING: Exit ({ex_x}, {ex_y}) is on WALL, finding nearest free cell...",
                            flush=True,
                        )
                        found = False
                        for radius in range(1, 50):
                            for dy in range(-radius, radius + 1):
                                for dx in range(-radius, radius + 1):
                                    if abs(dx) == radius or abs(dy) == radius:
                                        new_x, new_y = ex_x + dx, ex_y + dy
                                        if 0 <= new_y < grid.shape[0] and 0 <= new_x < grid.shape[1]:
                                            if grid[new_y][new_x] == 0:
                                                too_close = False
                                                for agent_pos in agent_positions_xy:
                                                    dist = np.sqrt(
                                                        (new_x - agent_pos[0]) ** 2
                                                        + (new_y - agent_pos[1]) ** 2
                                                    )
                                                    if dist < min_exit_agent_distance:
                                                        too_close = True
                                                        break
                                                if not too_close:
                                                    print(
                                                        f"[JOB {job_id[:8]}] Fixed exit: ({ex_x}, {ex_y}) -> ({new_x}, {new_y})",
                                                        flush=True,
                                                    )
                                                    validated_exits.append((new_x, new_y))
                                                    found = True
                                                    break
                                    if found:
                                        break
                                if found:
                                    break
                            if found:
                                break
                    else:
                        validated_exits.append((ex_x, ex_y))

            if len(validated_exits) > 0:
                exits_xy = validated_exits
                print(f"[JOB {job_id[:8]}] Using {len(exits_xy)} validated exits", flush=True)
            else:
                exits_xy = None
                print(f"[JOB {job_id[:8]}] No valid exits found, will auto-detect", flush=True)
        else:
            exits_xy = None

        print(
            f"[JOB {job_id[:8]}] Fire position: frontend={config.fire_position} -> backend={fire_position_xy}",
            flush=True,
        )
        print(
            f"[JOB {job_id[:8]}] Agent positions converted: {len(agent_positions_xy)} agents",
            flush=True,
        )

        num_agents = len(agent_positions_xy)
        use_heuristic = not config.use_rl or num_agents > 10 or state.ppo_model is None

        if use_heuristic:
            print(
                f"[JOB {job_id[:8]}] Using HEURISTIC mode (agents={num_agents}, use_rl={config.use_rl})",
                flush=True,
            )
            result = run_heuristic_simulation(
                grid=grid,
                agent_positions=agent_positions_xy,
                fire_position=fire_position_xy,
                exits=exits_xy,
                max_steps=500,
                extended_fire_steps=config.extended_fire_steps,
                assembly_point=(
                    frontend_to_backend(config.assembly_point[0], config.assembly_point[1])
                    if config.assembly_point
                    else None
                ),
                material_type=config.material_type,
            )
            update_job_status(job_id, "complete", result=result)
            gc.collect()
            return

        if exits_xy and len(exits_xy) > 0:
            distributed_exits = distribute_exits_to_model(exits_xy, grid, total_model_exits=248)
            print(
                f"[JOB {job_id[:8]}] Distributed {len(exits_xy)} user exits -> 248 model exits",
                flush=True,
            )
        else:
            distributed_exits = auto_detect_exits(grid, max_exits=248)
            print(
                f"[JOB {job_id[:8]}] Auto-detected {len(distributed_exits)} exits from grid boundaries",
                flush=True,
            )

        env = EvacuationEnv(
            grid=grid,
            num_agents=len(agent_positions_xy),
            max_steps=500,
            agent_start_positions=agent_positions_xy,
            fire_start_position=fire_position_xy,
            exits=distributed_exits,
            max_agents=10,
        )

        obs, _ = env.reset()
        terminated, truncated = False, False
        history = []
        step_count = 0
        max_steps = 500

        print(
            f"[JOB {job_id[:8]}] Starting RL simulation: {len(agent_positions_xy)} agents, {len(env.exits)} exits",
            flush=True,
        )

        while not terminated and not truncated and step_count < max_steps:
            action = 0

            obs, _, terminated, truncated, _ = env.step(action)
            step_count += 1

            if step_count % 50 == 0:
                active = sum(1 for a in env.agents if a.status == "evacuating")
                escaped = sum(1 for a in env.agents if a.status == "escaped")
                burned = sum(1 for a in env.agents if a.status == "burned")
                print(
                    f"[JOB {job_id[:8]}] Step {step_count}/{max_steps}: {active} active, {escaped} escaped, {burned} burned",
                    flush=True,
                )

            fire_coords = _cap_fire_coords(env.fire_sim.fire_map)

            agents_data = []
            for agent in env.agents:
                agent_pos_frontend = [agent.pos[1], agent.pos[0]]
                agents_data.append(
                    {
                        "pos": agent_pos_frontend,
                        "status": agent.status,
                        "state": agent.state,
                        "tripped": agent.tripped_timer > 0,
                    }
                )

            history.append({"fire_map": fire_coords, "agents": agents_data})

        assembly_point_xy = (
            frontend_to_backend(config.assembly_point[0], config.assembly_point[1])
            if config.assembly_point
            else None
        )

        if config.extended_fire_steps != 0:
            if config.extended_fire_steps == -1:
                print(
                    f"[JOB {job_id[:8]}] Burn until complete mode - spreading fire until fully consumed",
                    flush=True,
                )
                if assembly_point_xy:
                    print(
                        f"[JOB {job_id[:8]}] Assembly point: {assembly_point_xy} - agents will move there after escaping",
                        flush=True,
                    )

                max_burn_steps = 500  # Continue until fire fully spreads
                burn_step = 0
                while burn_step < max_burn_steps:
                    prev_fire_count = np.sum(env.fire_sim.fire_map)
                    env.fire_sim.step()
                    new_fire_count = np.sum(env.fire_sim.fire_map)

                    if assembly_point_xy:
                        for agent in env.agents:
                            if agent.status == "escaped":
                                agent.move_to_assembly(grid, assembly_point_xy, env.fire_sim.fire_map)
                                agent.check_status(
                                    env.fire_sim.fire_map,
                                    env.exits,
                                    assembly_point=assembly_point_xy,
                                )

                    fire_coords = _cap_fire_coords(env.fire_sim.fire_map)
                    agents_data = []
                    for agent in env.agents:
                        agent_pos_frontend = [agent.pos[1], agent.pos[0]]
                        agents_data.append(
                            {
                                "pos": agent_pos_frontend,
                                "status": agent.status,
                                "state": agent.state,
                                "tripped": False,
                            }
                        )
                    history.append({"fire_map": fire_coords, "agents": agents_data})

                    burn_step += 1

                    fire_stopped = new_fire_count == prev_fire_count
                    if assembly_point_xy:
                        all_at_assembly = all(
                            a.status in ["at_assembly", "burned"] for a in env.agents
                        )
                        if fire_stopped and all_at_assembly:
                            print(
                                f"[JOB {job_id[:8]}] Fire fully spread and all agents at assembly after {burn_step} extra steps",
                                flush=True,
                            )
                            break
                    elif fire_stopped:
                        print(
                            f"[JOB {job_id[:8]}] Fire fully spread after {burn_step} extra steps",
                            flush=True,
                        )
                        break
            else:
                print(
                    f"[JOB {job_id[:8]}] Running {config.extended_fire_steps} extended fire steps...",
                    flush=True,
                )
                for _ in range(config.extended_fire_steps):
                    env.fire_sim.step()
                    if assembly_point_xy:
                        for agent in env.agents:
                            if agent.status == "escaped":
                                agent.move_to_assembly(grid, assembly_point_xy, env.fire_sim.fire_map)
                                agent.check_status(
                                    env.fire_sim.fire_map,
                                    env.exits,
                                    assembly_point=assembly_point_xy,
                                )
                    fire_coords = _cap_fire_coords(env.fire_sim.fire_map)
                    agents_data = []
                    for agent in env.agents:
                        agent_pos_frontend = [agent.pos[1], agent.pos[0]]
                        agents_data.append(
                            {
                                "pos": agent_pos_frontend,
                                "status": agent.status,
                                "state": agent.state,
                                "tripped": False,
                            }
                        )
                    history.append({"fire_map": fire_coords, "agents": agents_data})

        escaped = sum(1 for agent in env.agents if agent.status in ["escaped", "at_assembly"])
        burned = sum(1 for agent in env.agents if agent.status == "burned")
        total_agents = len(env.agents)

        print(
            f"[JOB {job_id[:8]}] Simulation complete at step {step_count}: {escaped}/{total_agents} escaped, {burned} burned",
            flush=True,
        )
        print(f"[JOB {job_id[:8]}] Total frames recorded: {len(history)}", flush=True)

        # Downsample history to reduce payload size
        from core.config import MAX_HISTORY_FRAMES
        if len(history) > MAX_HISTORY_FRAMES:
            step_size = len(history) / MAX_HISTORY_FRAMES
            indices = [int(i * step_size) for i in range(MAX_HISTORY_FRAMES)]
            if indices[-1] != len(history) - 1:
                indices[-1] = len(history) - 1
            history = [history[i] for i in indices]
            print(f"[JOB {job_id[:8]}] Downsampled to {len(history)} frames", flush=True)

        agent_results = []
        for i, agent in enumerate(env.agents):
            final_status = "escaped" if agent.status in ["escaped", "at_assembly"] else agent.status
            agent_results.append(
                {
                    "agent_id": i,
                    "status": final_status,
                    "exit_time": agent.escape_time
                    if hasattr(agent, "escape_time") and agent.status in ["escaped", "at_assembly"]
                    else None,
                    "path_length": agent.steps_taken if hasattr(agent, "steps_taken") else step_count,
                }
            )

        exits_frontend = [[y, x] for x, y in (exits_xy if exits_xy else [])]
        assembly_point_frontend = (
            [config.assembly_point[0], config.assembly_point[1]] if config.assembly_point else None
        )

        result = {
            "total_agents": total_agents,
            "escaped_count": escaped,
            "burned_count": burned,
            "time_steps": step_count,
            "agent_results": agent_results,
            "exits": exits_frontend,
            "assembly_point": assembly_point_frontend,
            "commander_actions": history[:100] if history else [],
            "animation_data": {"history": history},
            "mode": "rl",
        }

        update_job_status(job_id, "complete", result=result)

        del env
        del history
        del grid
        gc.collect()
    except Exception as exc:
        print(f"[JOB {job_id[:8]}] FAILED with error: {exc}", flush=True)
        import traceback
        traceback.print_exc()
        result_holder["error"] = str(exc)
        gc.collect()


def run_simulation_task(job_id: str, config: SimulationConfig):
    """Run the simulation in a dedicated thread with timeout monitoring."""
    result_holder = {}

    sim_thread = threading.Thread(
        target=_run_simulation_inner,
        args=(job_id, config, result_holder),
        daemon=True,
    )
    sim_thread.start()

    # Poll with progress updates instead of blocking join
    check_interval = 5  # Check every 5 seconds
    elapsed = 0

    while elapsed < SIMULATION_TIMEOUT_SECONDS:
        sim_thread.join(timeout=check_interval)
        if not sim_thread.is_alive():
            break
        elapsed += check_interval
        if elapsed % 30 == 0:
            print(f"[JOB {job_id[:8]}] Still running... ({elapsed}s elapsed)", flush=True)

    if sim_thread.is_alive():
        print(
            f"[JOB {job_id[:8]}] TIMEOUT after {SIMULATION_TIMEOUT_SECONDS}s - marking as failed",
            flush=True,
        )
        update_job_status(
            job_id,
            "failed",
            error=(
                f"Simulation timed out after {SIMULATION_TIMEOUT_SECONDS} seconds. "
                "Try reducing the number of agents, using a simpler floor plan, or disabling 'burn until complete'."
            ),
        )
        gc.collect()
        return

    if "error" in result_holder:
        update_job_status(job_id, "failed", error=result_holder["error"])


def create_job_id() -> str:
    return str(uuid.uuid4())
