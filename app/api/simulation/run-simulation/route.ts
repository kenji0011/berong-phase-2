import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://python-backend:8000"

// Maximum grid dimensions to prevent memory exhaustion attacks
// Backend IMAGE_SIZE=256 produces 256x256 grids from uploaded floor plans
const MAX_GRID_SIZE = 512
const MAX_GRID_CELLS = 262144 // 512x512
const PPO_VERSION: string = "500k_steps" // Options: "v1.5", "v2.0_lite", "500k_steps", "v2.0"

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication to prevent unauthenticated abuse
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    // Health check gate: ensure backend models are loaded before proceeding
    try {
      const healthController = new AbortController()
      const healthTimeout = setTimeout(() => healthController.abort(), 5000)
      const healthRes = await fetch(`${BACKEND_URL}/api/health`, {
        signal: healthController.signal
      })
      clearTimeout(healthTimeout)

      if (healthRes.ok) {
        const health = await healthRes.json()
        if (!health.unet_loaded || !health.ppo_loaded) {
          return NextResponse.json(
            { error: "AI models are still loading. Please wait 10-15 seconds and try again.", retry: true },
            { status: 503 }
          )
        }
      }
    } catch (healthError: any) {
      // Backend not reachable at all
      console.error("Health check failed:", healthError.message)
      return NextResponse.json(
        { error: "Simulation server is not responding. Please ensure the backend is running and try again.", retry: true },
        { status: 503 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.grid || !Array.isArray(body.grid)) {
      return NextResponse.json(
        { error: "Invalid grid data" },
        { status: 400 }
      )
    }

    // SECURITY: Validate grid dimensions to prevent memory exhaustion
    if (body.grid.length > MAX_GRID_SIZE) {
      return NextResponse.json(
        { error: `Grid height exceeds maximum of ${MAX_GRID_SIZE} rows` },
        { status: 400 }
      )
    }
    const totalCells = body.grid.reduce((sum: number, row: unknown[]) => sum + (Array.isArray(row) ? row.length : 0), 0)
    if (totalCells > MAX_GRID_CELLS) {
      return NextResponse.json(
        { error: `Grid exceeds maximum of ${MAX_GRID_CELLS} cells` },
        { status: 400 }
      )
    }

    // Validate constraints based on PPO version
    if (PPO_VERSION === "v1.5") {
      if (body.exits && body.exits.length > 40) {
        return NextResponse.json(
          { error: "Maximum 40 exits allowed (PPO v1.5 constraint)" },
          { status: 400 }
        )
      }

      if (body.agent_positions && body.agent_positions.length > 5) {
        return NextResponse.json(
          { error: "Maximum 5 agents allowed (PPO v1.5 constraint)" },
          { status: 400 }
        )
      }
    } else {
      // v2.0 supports up to 248 exits and 10 agents
      if (body.exits && body.exits.length > 248) {
        return NextResponse.json(
          { error: "Maximum 248 exits allowed (PPO v2.0 constraint)" },
          { status: 400 }
        )
      }

      if (body.agent_positions && body.agent_positions.length > 10) {
        return NextResponse.json(
          { error: "Maximum 10 agents allowed (PPO v2.0 constraint)" },
          { status: 400 }
        )
      }
    }

    // Forward to Python backend with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout for starting simulation

    try {
      const response = await fetch(`${BACKEND_URL}/api/run-simulation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Backend error:", errorText)
        return NextResponse.json(
          { error: "Failed to start simulation", details: errorText },
          { status: response.status }
        )
      }

      const result = await response.json()
      return NextResponse.json(result)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)

      if (fetchError.name === 'AbortError') {
        console.error("Backend request timeout when starting simulation")
        return NextResponse.json(
          { error: "Simulation backend is taking too long to respond. It may be processing another request." },
          { status: 503 }
        )
      }

      if (fetchError.cause?.code === 'ECONNREFUSED' || fetchError.message?.includes('fetch failed')) {
        console.error("Cannot connect to simulation backend:", BACKEND_URL)
        return NextResponse.json(
          { error: `Cannot connect to simulation backend. Please ensure the Python server is running at ${BACKEND_URL}` },
          { status: 503 }
        )
      }

      throw fetchError
    }
  } catch (error: any) {
    console.error("Run simulation error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
