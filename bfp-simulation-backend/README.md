# Fire Evacuation Simulation Backend

FastAPI server for AI-powered fire evacuation simulation.

## Setup

### 1. Activate Virtual Environment

```powershell
cd bfp-simulation-backend
.\venv\Scripts\Activate
```

### 2. Install Dependencies

```powershell
pip install -r requirements.txt
```

**Note:** This will download ~2GB of dependencies (PyTorch, etc.). Be patient!

### 3. Start Server

```powershell
python main.py
```

Or use uvicorn directly:

```powershell
uvicorn main:app --reload --port 8000
```

The server will start on http://localhost:8000

## API Endpoints

### Health Check
```
GET /health
```

### Process Floor Plan Image
```
POST /api/process-image
Content-Type: multipart/form-data
Body: file (image file)

Response: { grid: number[][] }
```

### Run Simulation
```
POST /api/run-simulation
Content-Type: application/json
Body: {
  grid: number[][],
  exits: [[x, y], ...],
  fire_position: [x, y],
  agent_positions: [[x, y], ...]
}

Response: { job_id: string }
```

### Get Simulation Status
```
GET /api/status/{job_id}

Response: {
  status: 'processing' | 'complete' | 'failed',
  result?: { ... },
  error?: string
}
```

## Files

- **main.py** - FastAPI server with all endpoints
- **unet.py** - U-Net model architecture
- **inference.py** - Image processing and grid extraction
- **simulation.py** - Fire simulation, agents, and environment
- **models/** - Pre-trained AI models

## Testing

Test the API using curl or Postman:

```powershell
# Health check
curl http://localhost:8000/health

# Process image
curl -X POST http://localhost:8000/api/process-image -F 'file=@floorplan.png'
```

