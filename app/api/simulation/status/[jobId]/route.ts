import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://python-backend:8000"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID required" },
        { status: 400 }
      )
    }

    // Forward to Python backend with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(`${BACKEND_URL}/api/status/${jobId}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Backend error:", errorText)
        
        // Return proper status for "not found" jobs
        if (response.status === 404) {
          return NextResponse.json(
            { status: "not_found", error: "Job not found", result: null },
            { status: 200 } // Return 200 so frontend can handle gracefully
          )
        }
        
        return NextResponse.json(
          { error: "Failed to fetch job status", details: errorText },
          { status: response.status }
        )
      }

      const result = await response.json()
      return NextResponse.json(result)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      // Handle connection errors
      if (fetchError.name === 'AbortError') {
        console.error("Backend request timeout")
        return NextResponse.json(
          { error: "Backend request timeout - simulation server may be busy", status: "processing" },
          { status: 503 }
        )
      }
      
      // Connection refused or network error
      if (fetchError.cause?.code === 'ECONNREFUSED' || fetchError.message?.includes('fetch failed')) {
        console.error("Cannot connect to simulation backend:", BACKEND_URL)
        return NextResponse.json(
          { error: `Cannot connect to simulation backend at ${BACKEND_URL}. Please ensure the Python server is running.` },
          { status: 503 }
        )
      }
      
      throw fetchError
    }
  } catch (error: any) {
    console.error("Status check error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
