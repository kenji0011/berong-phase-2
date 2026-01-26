import heapq
import numpy as np
import gymnasium as gym
from gymnasium import spaces
import cv2

# Grid cell types
CELL_FREE = 0
CELL_WALL = 1
CELL_DOOR = 2
CELL_WINDOW = 3
CELL_EXTERIOR = 4  # Exterior padding zone (assembly only, fire blocked)

# Material-aware fire spread probabilities
FIRE_SPREAD_PROBS = {
    CELL_FREE: 0.25,      # Normal spread through free space
    CELL_WALL: 0.0,       # Cannot spread through walls
    CELL_DOOR: 0.6,       # Doors allow fire spread (open/burnable)
    CELL_WINDOW: 0.8,     # Windows spread fire quickly (glass breaks)
    CELL_EXTERIOR: 0.0,   # Fire cannot spread to exterior zone
}


# A* Pathfinding Algorithm
def a_star_search(grid, start, goal, fire_map=None):
    """
    A* pathfinding from start to goal.
    
    Args:
        grid: 2D numpy array where grid[y][x] = cell type (0=free, 1=wall, 2=door, 3=window)
        start: (x, y) tuple - starting position
        goal: (x, y) tuple - target position
        fire_map: Optional 2D array where 1=fire, 0=no fire
    
    Returns:
        List of (x, y) positions from start to goal (excluding start)
    """
    # Validate start position
    if not (0 <= start[0] < grid.shape[1] and 0 <= start[1] < grid.shape[0]):
        print(f"[DEBUG] A* Failed: Start {start} out of bounds", flush=True)
        return []
    if grid[start[1]][start[0]] == CELL_WALL:
        print(f"[DEBUG] A* Failed: Start {start} is in WALL", flush=True)
        return []
    
    # Validate goal position
    if not (0 <= goal[0] < grid.shape[1] and 0 <= goal[1] < grid.shape[0]):
        print(f"[DEBUG] A* Failed: Goal {goal} out of bounds", flush=True)
        return []
    if grid[goal[1]][goal[0]] == CELL_WALL:
        print(f"[DEBUG] A* Failed: Goal {goal} is in WALL", flush=True)
        return []
        
    def heuristic(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    
    neighbors = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    close_set = set()
    came_from = {}
    gscore = {start: 0}
    fscore = {start: heuristic(start, goal)}
    oheap = []
    heapq.heappush(oheap, (fscore[start], start))
    
    while oheap:
        current = heapq.heappop(oheap)[1]
        if current == goal:
            data = []
            while current in came_from:
                data.append(current)
                current = came_from[current]
            data.reverse()
            return data
        close_set.add(current)
        for i, j in neighbors:
            neighbor = current[0] + i, current[1] + j
            tentative_g_score = gscore[current] + 1
            if 0 <= neighbor[0] < grid.shape[1] and 0 <= neighbor[1] < grid.shape[0]:
                cell_type = grid[neighbor[1]][neighbor[0]]
                # Walls block movement completely
                if cell_type == CELL_WALL:
                    continue
                # Fire blocks movement
                if fire_map is not None and fire_map[neighbor[1]][neighbor[0]] == 1:
                    continue
                # Doors and windows are passable (agents can go through)
            else:
                continue
            if neighbor in close_set and tentative_g_score >= gscore.get(neighbor, 0):
                continue
            if tentative_g_score < gscore.get(neighbor, 0) or neighbor not in [i[1] for i in oheap]:
                came_from[neighbor] = current
                gscore[neighbor] = tentative_g_score
                fscore[neighbor] = tentative_g_score + heuristic(neighbor, goal)
                heapq.heappush(oheap, (fscore[neighbor], neighbor))
    
    print(f"[DEBUG] A* Failed: No path found from {start} to {goal}", flush=True)
    return []


def find_nearest_exterior(grid, start):
    """Find the nearest exterior cell (value=4) from start position using BFS.
    
    Args:
        grid: 2D numpy array of cell types
        start: (x, y) tuple - starting position
    
    Returns:
        (x, y) tuple of nearest exterior cell, or None if not found
    """
    from collections import deque
    
    start_x, start_y = int(start[0]), int(start[1])
    
    # If already on exterior, return current position
    if 0 <= start_y < grid.shape[0] and 0 <= start_x < grid.shape[1]:
        if grid[start_y][start_x] == CELL_EXTERIOR:
            return start
    
    # BFS to find nearest exterior cell
    visited = set()
    queue = deque([(start_x, start_y, 0)])  # (x, y, distance)
    visited.add((start_x, start_y))
    
    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    
    while queue:
        x, y, dist = queue.popleft()
        
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            
            if 0 <= nx < grid.shape[1] and 0 <= ny < grid.shape[0]:
                if (nx, ny) not in visited:
                    visited.add((nx, ny))
                    
                    # Found exterior cell!
                    if grid[ny][nx] == CELL_EXTERIOR:
                        return (nx, ny)
                    
                    # Can traverse through non-wall cells
                    if grid[ny][nx] != CELL_WALL:
                        queue.append((nx, ny, dist + 1))
    
    print(f"[DEBUG] No exterior cell found from {start}", flush=True)
    return None


def a_star_exterior_only(grid, start, goal):
    """A* pathfinding restricted to EXTERIOR cells only (value=4).
    Used for escaped agents moving to assembly point.
    
    Args:
        grid: 2D numpy array where grid[y][x] = cell type
        start: (x, y) tuple - starting position (must be on exterior)
        goal: (x, y) tuple - target position (must be on exterior)
    
    Returns:
        List of (x, y) positions from start to goal (excluding start)
    """
    # Validate start and goal are on exterior
    if not (0 <= start[0] < grid.shape[1] and 0 <= start[1] < grid.shape[0]):
        print(f"[DEBUG] Exterior A* Failed: Start {start} out of bounds", flush=True)
        return []
    if grid[start[1]][start[0]] != CELL_EXTERIOR:
        print(f"[DEBUG] Exterior A* Failed: Start {start} not on exterior (value={grid[start[1]][start[0]]})", flush=True)
        return []
    
    if not (0 <= goal[0] < grid.shape[1] and 0 <= goal[1] < grid.shape[0]):
        print(f"[DEBUG] Exterior A* Failed: Goal {goal} out of bounds", flush=True)
        return []
    if grid[goal[1]][goal[0]] != CELL_EXTERIOR:
        print(f"[DEBUG] Exterior A* Failed: Goal {goal} not on exterior (value={grid[goal[1]][goal[0]]})", flush=True)
        return []
    
    def heuristic(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    
    neighbors = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    close_set = set()
    came_from = {}
    gscore = {start: 0}
    fscore = {start: heuristic(start, goal)}
    oheap = []
    heapq.heappush(oheap, (fscore[start], start))
    
    while oheap:
        current = heapq.heappop(oheap)[1]
        if current == goal:
            data = []
            while current in came_from:
                data.append(current)
                current = came_from[current]
            data.reverse()
            return data
        close_set.add(current)
        
        for i, j in neighbors:
            neighbor = current[0] + i, current[1] + j
            tentative_g_score = gscore[current] + 1
            
            if 0 <= neighbor[0] < grid.shape[1] and 0 <= neighbor[1] < grid.shape[0]:
                cell_type = grid[neighbor[1]][neighbor[0]]
                
                # ONLY allow exterior cells - this is the key difference!
                if cell_type != CELL_EXTERIOR:
                    continue
            else:
                continue
                
            if neighbor in close_set and tentative_g_score >= gscore.get(neighbor, 0):
                continue
            if tentative_g_score < gscore.get(neighbor, 0) or neighbor not in [i[1] for i in oheap]:
                came_from[neighbor] = current
                gscore[neighbor] = tentative_g_score
                fscore[neighbor] = tentative_g_score + heuristic(neighbor, goal)
                heapq.heappush(oheap, (fscore[neighbor], neighbor))
    
    print(f"[DEBUG] Exterior A* Failed: No path found from {start} to {goal}", flush=True)
    return []

# Fire Simulator Class with Material-Aware Spread
class FireSimulator:
    def __init__(self, grid, spread_probability=0.25, firewall_spread_factor=0.1, material_type="concrete"):
        self.base_grid = grid
        self.spread_probability = spread_probability
        self.firewall_spread_factor = firewall_spread_factor
        self.material_type = material_type
        
        # Adjust probabilities based on material type
        self.current_spread_probs = FIRE_SPREAD_PROBS.copy()
        if self.material_type == "wood":
            print("[FIRE SIM] Using WOOD material settings (Faster Spread)", flush=True)
            self.current_spread_probs[CELL_FREE] = 0.50  # Much faster spread in free space (was 0.25)
            self.current_spread_probs[CELL_DOOR] = 0.85  # Doors burn faster (was 0.6)
            self.current_spread_probs[CELL_WINDOW] = 0.95 # Windows almost immediate (was 0.8)
        else:
            print("[FIRE SIM] Using CONCRETE material settings (Standard Spread)", flush=True)

        self.fire_map = np.zeros_like(self.base_grid, dtype=float)
        self.directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]

    def start_fire(self, ignition_points):
        """Start fire at given points. Points are (y, x) format."""
        for y, x in ignition_points:
            if 0 <= y < self.fire_map.shape[0] and 0 <= x < self.fire_map.shape[1]:
                self.fire_map[y, x] = 1

    def step(self):
        """Advance fire spread by one step with material-aware probabilities."""
        new_fire_map = self.fire_map.copy()
        rows, cols = self.fire_map.shape
        burning_cells = np.argwhere(self.fire_map == 1)

        for r, c in burning_cells:
            for dr, dc in self.directions:
                nr, nc = r + dr, c + dc

                if 0 <= nr < rows and 0 <= nc < cols:
                    if self.fire_map[nr, nc] == 0:
                        # Use material-specific spread probability
                        cell_type = int(self.base_grid[nr, nc])
                        current_spread_prob = self.current_spread_probs.get(cell_type, self.spread_probability)
                        
                        if np.random.rand() < current_spread_prob:
                            new_fire_map[nr, nc] = 1

        self.fire_map = new_fire_map

    def reset(self, ignition_points=None):
        self.fire_map = np.zeros_like(self.base_grid, dtype=float)
        if ignition_points:
            self.start_fire(ignition_points)


# Person Agent Class with Improved Movement
class Person:
    def __init__(self, position):
        """Initialize agent. Position is (x, y) format."""
        self.initial_pos = tuple(position)
        self.pos = list(position)  # [x, y]
        self.path = []
        self.status = 'evacuating'  # 'evacuating', 'escaped', 'burned', 'at_assembly'
        self.state = 'CALM'  # 'CALM', 'ALERT', 'PANICKED'
        self.speed = 1.0
        self.trip_probability = 0.0
        self.tripped_timer = 0
        self.PANIC_DISTANCE = 25
        self.ALERT_DISTANCE = 50
        self.escape_time = None
        self.steps_taken = 0
        self.assigned_exit = None

    def update_state(self, fire_map):
        """Update panic state based on fire proximity."""
        if self.tripped_timer > 0:
            return
        fire_locations = np.argwhere(fire_map == 1)
        if len(fire_locations) == 0:
            min_dist = float('inf')
        else:
            # Fire locations are [y, x], agent pos is [x, y]
            agent_pos_yx = np.array([self.pos[1], self.pos[0]])
            min_dist = np.min(np.linalg.norm(fire_locations - agent_pos_yx, axis=1))

        if min_dist < self.PANIC_DISTANCE:
            self.state = 'PANICKED'
            self.speed = 1.5
            self.trip_probability = 0.1
        elif min_dist < self.ALERT_DISTANCE:
            self.state = 'ALERT'
            self.speed = 1.2
            self.trip_probability = 0.0
        else:
            self.state = 'CALM'
            self.speed = 1.0
            self.trip_probability = 0.0

    def move(self, grid, fire_map=None):
        """Move agent along path with per-cell wall and fire validation."""
        if self.tripped_timer > 0:
            self.tripped_timer -= 1
            return
            
        if self.state == 'PANICKED':
            if np.random.rand() < self.trip_probability:
                self.tripped_timer = 5
                return
                
        steps_to_move = int(round(self.speed))
        for _ in range(steps_to_move):
            if self.path:
                next_pos = self.path[0]
                
                # Validate next position is within bounds
                if not (0 <= next_pos[0] < grid.shape[1] and 0 <= next_pos[1] < grid.shape[0]):
                    print(f"[DEBUG] Agent path goes out of bounds: {next_pos}", flush=True)
                    self.path = []
                    break
                
                # Check for wall collision before moving (grid uses [y][x])
                cell_type = grid[next_pos[1]][next_pos[0]]
                if cell_type == CELL_WALL:
                    print(f"[DEBUG] Agent blocked by wall at {next_pos}", flush=True)
                    self.path = []  # Clear invalid path
                    break
                
                # Check if next position is on fire - CRITICAL: avoid fire!
                if fire_map is not None and fire_map[next_pos[1]][next_pos[0]] >= 1:
                    print(f"[DEBUG] Agent avoiding fire at {next_pos}, recalculating path", flush=True)
                    self.path = []  # Clear path to trigger recalculation
                    break
                
                # Move to next position
                self.pos = list(self.path.pop(0))
                self.steps_taken += 1
            else:
                break

    def check_status(self, fire_map, exits, exit_radius=5, assembly_point=None):
        """Check if agent escaped, burned, or still evacuating.
        
        Args:
            fire_map: 2D array where 1=fire
            exits: List of (x, y) exit positions
            exit_radius: Distance to exit to count as escaped (default 5 for stricter detection)
            assembly_point: Optional (x, y) for post-escape gathering
        """
        if self.status == 'at_assembly' or self.status == 'burned':
            return
            
        # Check bounds and fire
        pos_x, pos_y = int(self.pos[0]), int(self.pos[1])
        if 0 <= pos_y < fire_map.shape[0] and 0 <= pos_x < fire_map.shape[1]:
            if fire_map[pos_y, pos_x] == 1:
                self.status = 'burned'
                return
        
        # Check if agent is escaped and has reached assembly point
        if self.status == 'escaped' and assembly_point is not None:
            distance_to_assembly = np.sqrt((self.pos[0] - assembly_point[0])**2 + (self.pos[1] - assembly_point[1])**2)
            if distance_to_assembly < 10:  # Close to assembly point
                self.status = 'at_assembly'
            return
        
        # Check if agent reached an exit (must be very close - within exit_radius)
        for ex in exits:
            distance = np.sqrt((self.pos[0] - ex[0])**2 + (self.pos[1] - ex[1])**2)
            if distance < exit_radius:
                self.status = 'escaped'
                self.escape_time = self.steps_taken
                self.path = []  # Clear path so move_to_assembly computes new path to assembly
                print(f"[AGENT] Escaped! Clearing path for assembly movement.", flush=True)
                return

    def move_to_assembly(self, grid, assembly_point, fire_map):
        """Move agent toward assembly point after escape using TWO-PHASE approach.
        
        Phase 1: Move from current position to nearest exterior cell
        Phase 2: Move along exterior-only path to assembly point
        
        This prevents agents from re-entering the building.
        """
        if self.status != 'escaped':
            return
        
        current_pos = (int(self.pos[0]), int(self.pos[1]))
        
        # Check if agent is on exterior zone
        is_on_exterior = False
        if 0 <= current_pos[1] < grid.shape[0] and 0 <= current_pos[0] < grid.shape[1]:
            is_on_exterior = grid[current_pos[1]][current_pos[0]] == CELL_EXTERIOR
        
        # Recompute path if needed
        if not self.path:
            if not is_on_exterior:
                # PHASE 1: Find nearest exterior cell and path to it
                nearest_ext = find_nearest_exterior(grid, current_pos)
                if nearest_ext:
                    print(f"[ASSEMBLY DEBUG] Phase 1: Agent at {current_pos} finding path to exterior at {nearest_ext}", flush=True)
                    self.path = a_star_search(grid, current_pos, nearest_ext, fire_map)
                    if self.path:
                        print(f"[ASSEMBLY DEBUG] Phase 1 path found: {len(self.path)} steps to exterior", flush=True)
                    else:
                        # Fallback: go directly to assembly point if exterior path fails
                        print(f"[ASSEMBLY DEBUG] WARNING: No path to exterior, trying direct path to assembly", flush=True)
                        assembly_pos = (int(assembly_point[0]), int(assembly_point[1]))
                        self.path = a_star_search(grid, current_pos, assembly_pos, fire_map)
                        if self.path:
                            print(f"[ASSEMBLY DEBUG] Direct path found: {len(self.path)} steps to assembly", flush=True)
                else:
                    # Fallback: try direct path to assembly
                    print(f"[ASSEMBLY DEBUG] WARNING: No exterior cell found, trying direct path to assembly", flush=True)
                    assembly_pos = (int(assembly_point[0]), int(assembly_point[1]))
                    self.path = a_star_search(grid, current_pos, assembly_pos, fire_map)
            else:
                # PHASE 2: Already on exterior, use exterior-only path to assembly
                assembly_pos = (int(assembly_point[0]), int(assembly_point[1]))
                print(f"[ASSEMBLY DEBUG] Phase 2: Agent on exterior at {current_pos}, pathfinding to assembly {assembly_pos}", flush=True)
                self.path = a_star_exterior_only(grid, current_pos, assembly_pos)
                if self.path:
                    print(f"[ASSEMBLY DEBUG] Phase 2 exterior-only path found: {len(self.path)} steps to assembly", flush=True)
                else:
                    # Fallback: use regular A* if exterior-only fails
                    print(f"[ASSEMBLY DEBUG] WARNING: No exterior path, trying regular A* to assembly", flush=True)
                    self.path = a_star_search(grid, current_pos, assembly_pos, fire_map)
                    if self.path:
                        print(f"[ASSEMBLY DEBUG] Fallback path found: {len(self.path)} steps to assembly", flush=True)
        
        # Move along path with FASTER speed for assembly movement
        if self.path:
            self.speed = 2.0  # Faster speed when moving to assembly (was 1.0)
            self.move(grid)  # No fire avoidance needed for assembly movement

    def compute_path(self, grid, goal, fire_map):
        """Compute path to goal using A*."""
        start_pos = (int(self.pos[0]), int(self.pos[1]))
        goal_pos = (int(goal[0]), int(goal[1]))
        self.path = a_star_search(grid, start_pos, goal_pos, fire_map)

    def reset(self):
        self.pos = list(self.initial_pos)
        self.path = []
        self.status = 'evacuating'
        self.state = 'CALM'
        self.speed = 1.0
        self.trip_probability = 0.0
        self.tripped_timer = 0
        self.escape_time = None
        self.steps_taken = 0
        self.assigned_exit = None


# Gymnasium Environment for RL
class EvacuationEnv(gym.Env):
    def __init__(self, grid, num_agents=5, max_steps=500, agent_start_positions=None, 
                 fire_start_position=None, exits=None, max_agents=10):
        super(EvacuationEnv, self).__init__()

        self.base_grid = grid
        self.num_agents = num_agents
        self.max_agents = max_agents  # For zero-padding observations
        self.max_steps = max_steps
        self.initial_agent_positions = agent_start_positions
        self.initial_fire_position = fire_start_position
        self.initial_exits = exits

        self.exits = self._find_exits() if self.initial_exits is None else self.initial_exits
        if not self.exits:
            raise ValueError("No exits were found or provided. Cannot create environment.")

        # Debug: Check grid composition
        unique, counts = np.unique(self.base_grid, return_counts=True)
        print(f"[DEBUG] Grid composition: {dict(zip(unique, counts))}", flush=True)

        self.fire_sim = FireSimulator(self.base_grid)
        self.agents = []

        self.action_space = spaces.Discrete(len(self.exits))

        # Use max_agents for observation space (zero-padded)
        fire_obs_shape = 64 * 64
        agent_pos_shape = self.max_agents * 2
        agent_state_shape = self.max_agents * 1
        obs_shape = fire_obs_shape + agent_pos_shape + agent_state_shape + 1
        self.observation_space = spaces.Box(low=0, high=1, shape=(obs_shape,), dtype=np.float32)

    def _find_exits(self):
        """Auto-detect exits from grid edges."""
        rows, cols = self.base_grid.shape
        exits = []
        for x in range(cols):
            if self.base_grid[1, x] == 0:
                exits.append((x, 1))
            if self.base_grid[rows-2, x] == 0:
                exits.append((x, rows-2))
        for y in range(rows):
            if self.base_grid[y, 1] == 0:
                exits.append((1, y))
            if self.base_grid[y, cols-2] == 0:
                exits.append((cols-2, y))
        if not exits:
            return []
        # Filter to keep exits at least 20 pixels apart
        filtered_exits = [exits[0]]
        for ex in exits:
            if all(np.linalg.norm(np.array(ex) - np.array(f_ex)) > 20 for f_ex in filtered_exits):
                filtered_exits.append(ex)
        return filtered_exits

    def _get_observation(self):
        fire_map_resized = cv2.resize(self.fire_sim.fire_map.astype(np.float32), (64, 64), interpolation=cv2.INTER_AREA)
        fire_obs = fire_map_resized.flatten()

        # Agent positions: normalized and zero-padded to max_agents
        agent_pos = np.array([agent.pos for agent in self.agents]).flatten() / np.array([self.base_grid.shape[1], self.base_grid.shape[0]] * self.num_agents)
        agent_pos_obs = np.zeros(self.max_agents * 2, dtype=np.float32)
        agent_pos_obs[:len(agent_pos)] = agent_pos

        # Agent states: mapped to float values and zero-padded to max_agents
        state_map = {'CALM': 0.0, 'ALERT': 0.5, 'PANICKED': 1.0}
        agent_states = np.array([state_map.get(agent.state, 0.0) for agent in self.agents])
        agent_state_obs = np.zeros(self.max_agents, dtype=np.float32)
        agent_state_obs[:len(agent_states)] = agent_states

        time_obs = np.array([self.current_step / self.max_steps])

        obs = np.concatenate([fire_obs, agent_pos_obs, agent_state_obs, time_obs]).astype(np.float32)
        return obs

    def reset(self, seed=None):
        super().reset(seed=seed)
        self.current_step = 0

        # Fire position: input is (x, y) but fire_sim expects (y, x) format
        if self.initial_fire_position:
            # Convert from (x, y) to (y, x) for fire_map
            fire_start = (self.initial_fire_position[1], self.initial_fire_position[0])
            print(f"[RL ENV] Fire position converted: input (x,y)={self.initial_fire_position} -> fire_map (y,x)={fire_start}", flush=True)
        else:
            fire_start = (self.base_grid.shape[0] // 2, self.base_grid.shape[1] // 2)
            print(f"[RL ENV] Using default fire position (center): {fire_start}", flush=True)
        self.fire_sim.reset(ignition_points=[fire_start])

        self.agents = []
        if self.initial_agent_positions:
            for pos in self.initial_agent_positions:
                self.agents.append(Person(position=pos))
        else:
            while len(self.agents) < self.num_agents:
                y, x = np.random.randint(0, self.base_grid.shape[0]), np.random.randint(0, self.base_grid.shape[1])
                if self.base_grid[y, x] == 0 and self.fire_sim.fire_map[y, x] == 0:
                    self.agents.append(Person(position=(x, y)))

        for agent in self.agents:
            agent.reset()

        return self._get_observation(), {}

    def step(self, action):
        self.current_step += 1
        self.fire_sim.step()

        # PPO action is ignored - each agent goes to their nearest exit instead
        reward = -0.01

        for agent in self.agents:
            if agent.status == 'evacuating':
                agent.update_state(self.fire_sim.fire_map)

                is_stuck_or_needs_path = not agent.path or (self.current_step % 10 == 0)
                if agent.state != 'PANICKED' and is_stuck_or_needs_path:
                    # Find nearest exit for this agent
                    min_dist = float('inf')
                    nearest_exit = self.exits[0] if self.exits else (0, 0)
                    for ex in self.exits:
                        dist = np.sqrt((agent.pos[0] - ex[0])**2 + (agent.pos[1] - ex[1])**2)
                        if dist < min_dist:
                            min_dist = dist
                            nearest_exit = ex
                    agent.compute_path(self.base_grid, nearest_exit, self.fire_sim.fire_map)

                agent.move(self.base_grid, self.fire_sim.fire_map)
                
                # Debug: Check for wall collision after move
                pos_y, pos_x = int(agent.pos[1]), int(agent.pos[0])
                if 0 <= pos_y < self.base_grid.shape[0] and 0 <= pos_x < self.base_grid.shape[1]:
                    if self.base_grid[pos_y, pos_x] == CELL_WALL:
                        print(f"[CRITICAL] Agent moved into WALL at {agent.pos}!", flush=True)

                agent.check_status(self.fire_sim.fire_map, self.exits)
                
                if agent.status == 'escaped':
                    print(f"[DEBUG] Agent ESCAPED at step {self.current_step}, took {agent.steps_taken} steps", flush=True)
                    reward += 10
                elif agent.status == 'burned':
                    print(f"[DEBUG] Agent BURNED at step {self.current_step}", flush=True)
                    reward -= 10

        terminated = all(agent.status != 'evacuating' for agent in self.agents)
        truncated = self.current_step >= self.max_steps
        observation = self._get_observation()

        return observation, reward, terminated, truncated, {}


# Heuristic (Non-RL) Simulation Function
def run_heuristic_simulation(grid, agent_positions, fire_position, exits=None, 
                              max_steps=500, extended_fire_steps=0, assembly_point=None, material_type="concrete"):
    """
    Run a heuristic-based simulation without PPO model.
    Supports unlimited agents and provides the same output format as RL simulation.
    
    Args:
        grid: 2D numpy array (256x256)
        agent_positions: List of (x, y) positions
        fire_position: (x, y) tuple for fire start (converted to (y, x) internally)
        exits: List of (x, y) exit positions
        max_steps: Maximum simulation steps
        extended_fire_steps: Continue fire spread after agents done
        extended_fire_steps: Continue fire spread after agents done
        assembly_point: (x, y) for post-escape gathering (optional)
        material_type: "wood" or "concrete" (default "concrete")
    
    Returns:
        Result dict compatible with frontend
    """
    print(f"[HEURISTIC] Starting simulation: {len(agent_positions)} agents", flush=True)
    
    # Validate fire position - ensure it's on a free cell
    fire_x, fire_y = int(fire_position[0]), int(fire_position[1])
    if 0 <= fire_y < grid.shape[0] and 0 <= fire_x < grid.shape[1]:
        if grid[fire_y][fire_x] == CELL_WALL:
            print(f"[HEURISTIC] WARNING: Fire position ({fire_x}, {fire_y}) is on WALL, finding nearest free cell...", flush=True)
            # Search for nearest free cell
            found = False
            for radius in range(1, 50):
                for dy in range(-radius, radius + 1):
                    for dx in range(-radius, radius + 1):
                        if abs(dx) == radius or abs(dy) == radius:
                            new_x, new_y = fire_x + dx, fire_y + dy
                            if 0 <= new_y < grid.shape[0] and 0 <= new_x < grid.shape[1]:
                                if grid[new_y][new_x] == CELL_FREE:
                                    print(f"[HEURISTIC] Fixed fire position: ({fire_x}, {fire_y}) -> ({new_x}, {new_y})", flush=True)
                                    fire_position = (new_x, new_y)
                                    found = True
                                    break
                    if found:
                        break
                if found:
                    break
            if not found:
                print(f"[HEURISTIC] ERROR: Could not find free cell near fire position", flush=True)
    
    # Initialize fire simulator
    fire_sim = FireSimulator(grid, material_type=material_type)
    # Fire position needs to be (y, x) for fire_sim - input is (x, y)
    fire_start_yx = (fire_position[1], fire_position[0])
    
    # DEBUG: Detailed fire position logging
    print(f"[FIRE DEBUG] Input fire_position (x,y): {fire_position}", flush=True)
    print(f"[FIRE DEBUG] Converted to (y,x) for fire_map: {fire_start_yx}", flush=True)
    print(f"[FIRE DEBUG] Grid shape: {grid.shape} (rows, cols)", flush=True)
    print(f"[FIRE DEBUG] Cell value at fire position: grid[{fire_start_yx[0]}][{fire_start_yx[1]}] = {grid[fire_start_yx[0]][fire_start_yx[1]] if 0 <= fire_start_yx[0] < grid.shape[0] and 0 <= fire_start_yx[1] < grid.shape[1] else 'OUT OF BOUNDS'}", flush=True)
    
    fire_sim.reset(ignition_points=[fire_start_yx])
    print(f"[HEURISTIC] Fire started at (x={fire_position[0]}, y={fire_position[1]}) -> fire_map[{fire_start_yx[0]}][{fire_start_yx[1]}]", flush=True)
    
    # Auto-detect exits if not provided
    if exits is None or len(exits) == 0:
        exits = auto_detect_exits_from_grid(grid)
        print(f"[HEURISTIC] Auto-detected {len(exits)} exits", flush=True)
    
    # Validate and fix exits - ensure they're on free cells and not near agents
    MIN_EXIT_AGENT_DISTANCE = 20  # Exits must be at least 20 cells from any agent
    validated_exits = []
    for ex in exits:
        ex_x, ex_y = int(ex[0]), int(ex[1])
        # Check if exit is on a wall
        if 0 <= ex_y < grid.shape[0] and 0 <= ex_x < grid.shape[1]:
            if grid[ex_y][ex_x] == CELL_WALL:
                print(f"[HEURISTIC] WARNING: Exit ({ex_x}, {ex_y}) is on WALL, searching for nearest free cell...", flush=True)
                # Search for nearest free cell that's not too close to agents
                found = False
                for radius in range(1, 50):  # Search up to 50 cells away
                    for dy in range(-radius, radius + 1):
                        for dx in range(-radius, radius + 1):
                            if abs(dx) == radius or abs(dy) == radius:  # Only check perimeter
                                new_x, new_y = ex_x + dx, ex_y + dy
                                if 0 <= new_y < grid.shape[0] and 0 <= new_x < grid.shape[1]:
                                    if grid[new_y][new_x] == CELL_FREE:
                                        # Check distance to all agents
                                        too_close_to_agent = False
                                        for agent_pos in agent_positions:
                                            agent_dist = np.sqrt((new_x - agent_pos[0])**2 + (new_y - agent_pos[1])**2)
                                            if agent_dist < MIN_EXIT_AGENT_DISTANCE:
                                                too_close_to_agent = True
                                                break
                                        if not too_close_to_agent:
                                            print(f"[HEURISTIC] Fixed exit: ({ex_x}, {ex_y}) -> ({new_x}, {new_y})", flush=True)
                                            validated_exits.append((new_x, new_y))
                                            found = True
                                            break
                        if found:
                            break
                    if found:
                        break
                if not found:
                    print(f"[HEURISTIC] ERROR: Could not find free cell near exit ({ex_x}, {ex_y})", flush=True)
            else:
                validated_exits.append((ex_x, ex_y))
        else:
            print(f"[HEURISTIC] WARNING: Exit ({ex_x}, {ex_y}) is out of bounds", flush=True)
    
    # Use validated exits (or fall back to auto-detection if none valid)
    if len(validated_exits) == 0:
        print("[HEURISTIC] No valid exits! Auto-detecting from grid edges...", flush=True)
        validated_exits = auto_detect_exits_from_grid(grid)
    
    exits = validated_exits
    print(f"[HEURISTIC] Using {len(exits)} validated exits", flush=True)
    
    # Initialize agents
    agents = [Person(position=pos) for pos in agent_positions]
    
    # Log all exits
    print(f"[HEURISTIC] Available exits: {exits}", flush=True)
    
    # Assign each agent to nearest exit (heuristic strategy)
    for i, agent in enumerate(agents):
        min_dist = float('inf')
        best_exit = exits[0] if exits else (0, 0)
        for ex in exits:
            dist = np.sqrt((agent.pos[0] - ex[0])**2 + (agent.pos[1] - ex[1])**2)
            if dist < min_dist:
                min_dist = dist
                best_exit = ex
        agent.assigned_exit = best_exit
        print(f"[HEURISTIC] Agent {i} at ({agent.pos[0]}, {agent.pos[1]}) -> Exit ({best_exit[0]}, {best_exit[1]}) [dist={min_dist:.1f}]", flush=True)
    
    # Run simulation
    history = []
    step_count = 0
    
    while step_count < max_steps:
        step_count += 1
        fire_sim.step()
        
        
        # Unified agent processing loop
        for idx, agent in enumerate(agents):
            prev_status = agent.status
            
            # Phase 1: Evacuation logic
            if agent.status == 'evacuating':
                agent.update_state(fire_sim.fire_map)
                
                # Recompute path periodically or if stuck
                if not agent.path or step_count % 10 == 0:
                    agent.compute_path(grid, agent.assigned_exit, fire_sim.fire_map)
                
                agent.move(grid, fire_sim.fire_map)
                agent.check_status(fire_sim.fire_map, exits, assembly_point=assembly_point)
                
                # Debug: Log when agent escapes
                if prev_status == 'evacuating' and agent.status == 'escaped':
                    print(f"[STEP {step_count}] Agent {idx} just ESCAPED! Now moving to assembly immediately.", flush=True)
            
            # Phase 2: Assembly logic (can run in same step if agent just escaped)
            if agent.status == 'escaped' and assembly_point is not None:
                print(f"[STEP {step_count}] Agent {idx} status=escaped, calling move_to_assembly", flush=True)
                agent.move_to_assembly(grid, assembly_point, fire_sim.fire_map)
                agent.check_status(fire_sim.fire_map, exits, assembly_point=assembly_point)
        
        # Record frame (convert to frontend format [row, col])
        fire_coords = np.argwhere(fire_sim.fire_map == 1).tolist()
        agents_data = []
        for agent in agents:
            agents_data.append({
                "pos": [agent.pos[1], agent.pos[0]],  # Convert to [row, col]
                "status": agent.status,
                "state": agent.state,
                "tripped": agent.tripped_timer > 0
            })
        history.append({
            "fire_map": fire_coords,
            "agents": agents_data
        })
        
        # Check if simulation is done
        # With assembly point: done when all agents are at_assembly or burned
        # Without assembly: done when all agents are escaped or burned
        if assembly_point is not None:
            all_done = all(a.status in ['at_assembly', 'burned'] for a in agents)
        else:
            all_done = all(a.status != 'evacuating' for a in agents)
        
        if all_done:
            print(f"[HEURISTIC] All agents done at step {step_count}", flush=True)
            break
    
    # Extended fire spread demonstration
    if extended_fire_steps != 0:
        if extended_fire_steps == -1:
            # Burn until complete - continue fire until no more cells can burn
            print("[HEURISTIC] Burn until complete mode - spreading fire until fully consumed", flush=True)
            max_burn_steps = 2000  # Safety limit
            burn_step = 0
            while burn_step < max_burn_steps:
                prev_fire_count = np.sum(fire_sim.fire_map)
                fire_sim.step()
                new_fire_count = np.sum(fire_sim.fire_map)
                
                fire_coords = np.argwhere(fire_sim.fire_map == 1).tolist()
                # Keep agents frozen at final position
                agents_data = []
                for agent in agents:
                    agents_data.append({
                        "pos": [agent.pos[1], agent.pos[0]],
                        "status": agent.status,
                        "state": agent.state,
                        "tripped": False
                    })
                history.append({
                    "fire_map": fire_coords,
                    "agents": agents_data
                })
                
                burn_step += 1
                
                # Stop if fire stopped spreading (no new cells burned)
                if new_fire_count == prev_fire_count:
                    print(f"[HEURISTIC] Fire fully spread after {burn_step} extra steps", flush=True)
                    break
        else:
            # Fixed number of extended steps
            print(f"[HEURISTIC] Running {extended_fire_steps} extended fire steps", flush=True)
            for _ in range(extended_fire_steps):
                fire_sim.step()
                fire_coords = np.argwhere(fire_sim.fire_map == 1).tolist()
                # Keep agents frozen
                agents_data = []
                for agent in agents:
                    agents_data.append({
                        "pos": [agent.pos[1], agent.pos[0]],
                        "status": agent.status,
                        "state": agent.state,
                        "tripped": False
                    })
                history.append({
                    "fire_map": fire_coords,
                    "agents": agents_data
                })
    
    # Calculate statistics
    escaped = sum(1 for a in agents if a.status in ['escaped', 'at_assembly'])
    burned = sum(1 for a in agents if a.status == 'burned')
    at_assembly = sum(1 for a in agents if a.status == 'at_assembly')
    
    print(f"[HEURISTIC] Complete: {escaped}/{len(agents)} escaped, {at_assembly} at assembly, {burned} burned", flush=True)
    
    # Prepare result
    agent_results = []
    for i, agent in enumerate(agents):
        agent_results.append({
            "agent_id": i,
            "status": agent.status,
            "exit_time": agent.escape_time,
            "path_length": agent.steps_taken
        })
    
    exits_frontend = [[y, x] for x, y in exits]
    
    # Include assembly point in response (convert to frontend format)
    assembly_point_frontend = [assembly_point[1], assembly_point[0]] if assembly_point else None
    
    return {
        "total_agents": len(agents),
        "escaped_count": escaped,
        "burned_count": burned,
        "at_assembly_count": at_assembly,
        "time_steps": step_count,
        "agent_results": agent_results,
        "exits": exits_frontend,
        "assembly_point": assembly_point_frontend,
        "commander_actions": history[:100],
        "animation_data": {
            "history": history
        },
        "mode": "heuristic"
    }


def auto_detect_exits_from_grid(grid, max_exits=50):
    """Auto-detect exits from grid boundaries (standalone version)."""
    height, width = grid.shape
    exits = []
    
    # Check edges for free spaces
    for x in range(width):
        if grid[0, x] == CELL_FREE:
            exits.append((x, 0))
        if grid[height-1, x] == CELL_FREE:
            exits.append((x, height-1))
    
    for y in range(height):
        if grid[y, 0] == CELL_FREE:
            exits.append((0, y))
        if grid[y, width-1] == CELL_FREE:
            exits.append((width-1, y))
    
    # Remove duplicates and filter to keep exits apart
    exits = list(set(exits))
    if len(exits) <= 1:
        return exits
    
    filtered = [exits[0]]
    for ex in exits[1:]:
        if all(np.sqrt((ex[0]-f[0])**2 + (ex[1]-f[1])**2) > 15 for f in filtered):
            filtered.append(ex)
        if len(filtered) >= max_exits:
            break
    
    return filtered
