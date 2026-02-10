import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://python-backend:8000"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG and PNG are supported" },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Forward to Python backend
    const backendFormData = new FormData()
    backendFormData.append("file", file)

    const response = await fetch(`${BACKEND_URL}/api/process-image`, {
      method: "POST",
      body: backendFormData
    })

    if (!response.ok) {
      // Try to extract detailed error message from backend
      let errorMessage = "Failed to process image"
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.error || errorMessage
      } catch {
        // If JSON parsing fails, try to get text
        try {
          const errorText = await response.text()
          if (errorText) errorMessage = errorText
        } catch {
          // Keep default message
        }
      }
      console.error("Backend error:", errorMessage)
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Process image error:", error)

    // Check if it's a network error (backend offline)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: `Cannot connect to AI backend at ${BACKEND_URL}. Please ensure the Python server is running and models are loaded.` },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
