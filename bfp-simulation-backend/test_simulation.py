"""
Direct backend simulation test — bypasses Next.js entirely.
Tests the full pipeline: submit job -> poll status -> get results.
"""
import requests
import time
import json
import sys

BACKEND = "http://localhost:8000"

# ---- Test 1: Tiny 10x10 grid, 1 agent, NO extended fire ----
def make_small_grid(size=10):
    """Create a simple grid: walls on edges, free space inside."""
    grid = []
    for r in range(size):
        row = []
        for c in range(size):
            if r == 0 or r == size-1 or c == 0 or c == size-1:
                row.append(1)  # wall
            else:
                row.append(0)  # free
        grid.append(row)
    # Open an exit on the edge
    grid[0][5] = 0  # top edge exit
    grid[9][5] = 0  # bottom edge exit
    return grid

def test_simulation(label, config):
    print(f"\n{'='*60}")
    print(f"TEST: {label}")
    print(f"{'='*60}")
    
    # Step 1: Submit
    print("[1] Submitting simulation...")
    start = time.time()
    try:
        resp = requests.post(f"{BACKEND}/api/run-simulation", json=config, timeout=30)
    except Exception as e:
        print(f"  FAILED to submit: {e}")
        return False
    
    if resp.status_code != 200:
        print(f"  FAILED: status={resp.status_code}, body={resp.text}")
        return False
    
    job_id = resp.json()["job_id"]
    print(f"  Job ID: {job_id}")
    submit_time = time.time() - start
    print(f"  Submit time: {submit_time:.2f}s")
    
    # Step 2: Poll for status
    print("[2] Polling for results...")
    poll_start = time.time()
    max_wait = 120  # 2 min max for test
    
    while time.time() - poll_start < max_wait:
        try:
            status_resp = requests.get(f"{BACKEND}/api/status/{job_id}", timeout=10)
        except Exception as e:
            elapsed = time.time() - poll_start
            print(f"  [{elapsed:.0f}s] Poll error: {e}")
            time.sleep(2)
            continue
        
        if status_resp.status_code != 200:
            elapsed = time.time() - poll_start
            print(f"  [{elapsed:.0f}s] Poll HTTP {status_resp.status_code}: {status_resp.text[:100]}")
            time.sleep(2)
            continue
        
        data = status_resp.json()
        elapsed = time.time() - poll_start
        status = data.get("status", "unknown")
        
        if status == "complete":
            result = data.get("result", {})
            total = result.get("total_agents", "?")
            escaped = result.get("escaped_count", "?")
            burned = result.get("burned_count", "?")
            steps = result.get("time_steps", "?")
            mode = result.get("mode", "?")
            history_len = len(result.get("animation_data", {}).get("history", []))
            result_size = len(json.dumps(result))
            
            print(f"  SUCCESS after {elapsed:.1f}s!")
            print(f"  Mode: {mode}")
            print(f"  Steps: {steps}")
            print(f"  Agents: {total} total, {escaped} escaped, {burned} burned")
            print(f"  History frames: {history_len}")
            print(f"  Result JSON size: {result_size:,} bytes ({result_size/1024:.1f} KB)")
            return True
        
        elif status == "failed":
            error = data.get("error", "unknown error")
            print(f"  FAILED after {elapsed:.1f}s: {error}")
            return False
        
        else:
            if int(elapsed) % 10 == 0:
                print(f"  [{elapsed:.0f}s] Status: {status}")
            time.sleep(2)
    
    print(f"  TIMEOUT after {max_wait}s - simulation never completed")
    return False


# ---- Run tests ----
if __name__ == "__main__":
    print("Backend Simulation Direct Test")
    print(f"Backend URL: {BACKEND}")
    
    # Test 1: Tiny grid, no extended fire
    small_grid = make_small_grid(10)
    ok1 = test_simulation("Tiny 10x10, 1 agent, NO extended fire", {
        "grid": small_grid,
        "exits": [[0, 5]],  # row, col format
        "fire_position": [5, 5],  # row, col
        "agent_positions": [[3, 3]],  # row, col
        "extended_fire_steps": 0,
        "material_type": "concrete"
    })
    
    if not ok1:
        print("\n*** TEST 1 FAILED - basic simulation is broken! ***")
        sys.exit(1)
    
    # Test 2: Tiny grid WITH extended fire steps  
    ok2 = test_simulation("Tiny 10x10, 1 agent, 50 extended fire steps", {
        "grid": small_grid,
        "exits": [[0, 5]],
        "fire_position": [5, 5],
        "agent_positions": [[3, 3]],
        "extended_fire_steps": 50,
        "material_type": "concrete"
    })
    
    # Test 3: Medium 50x50 grid, 3 agents, 100 extended fire
    def make_medium_grid(size=50):
        grid = []
        for r in range(size):
            row = []
            for c in range(size):
                if r == 0 or r == size-1 or c == 0 or c == size-1:
                    row.append(1)
                else:
                    row.append(0)
            grid.append(row)
        grid[0][25] = 0  # exit top middle
        grid[49][25] = 0  # exit bottom middle
        return grid
    
    med_grid = make_medium_grid(50)
    ok3 = test_simulation("Medium 50x50, 3 agents, 100 extended fire steps", {
        "grid": med_grid,
        "exits": [[0, 25], [49, 25]],
        "fire_position": [25, 25],
        "agent_positions": [[10, 10], [10, 40], [40, 10]],
        "extended_fire_steps": 100,
        "material_type": "concrete"
    })
    
    # Test 4: Full 256x256 grid (like real usage), 5 agents, 200 extended fire
    def make_large_grid(size=256):
        grid = []
        for r in range(size):
            row = []
            for c in range(size):
                if r == 0 or r == size-1 or c == 0 or c == size-1:
                    row.append(1)
                else:
                    row.append(0)
            grid.append(row)
        # Open exits
        grid[0][128] = 0
        grid[255][128] = 0
        grid[128][0] = 0
        grid[128][255] = 0
        return grid
    
    large_grid = make_large_grid(256)
    ok4 = test_simulation("FULL 256x256, 5 agents, 200 extended fire steps", {
        "grid": large_grid,
        "exits": [[0, 128], [255, 128], [128, 0], [128, 255]],
        "fire_position": [128, 128],
        "agent_positions": [[50, 50], [50, 200], [200, 50], [200, 200], [128, 64]],
        "extended_fire_steps": 200,
        "material_type": "concrete"
    })
    
    print(f"\n{'='*60}")
    print("RESULTS SUMMARY")
    print(f"{'='*60}")
    print(f"  Test 1 (tiny, no fire ext):    {'PASS' if ok1 else 'FAIL'}")
    print(f"  Test 2 (tiny, 50 fire ext):    {'PASS' if ok2 else 'FAIL'}")
    print(f"  Test 3 (medium, 100 fire ext): {'PASS' if ok3 else 'FAIL'}")
    print(f"  Test 4 (full 256, 200 fire):   {'PASS' if ok4 else 'FAIL'}")
