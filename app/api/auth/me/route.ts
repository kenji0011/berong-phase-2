import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Get user from cookie
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('bfp_user')

    if (!userCookie) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    try {
      // Cookie value might be URL-encoded from client-side setting
      const decodedValue = decodeURIComponent(userCookie.value)
      const user = JSON.parse(decodedValue)
      return NextResponse.json(
        { success: true, user },
        { status: 200 }
      )
    } catch (parseError) {
      console.error('Cookie parse error:', parseError)
      // Invalid cookie format
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Auth check API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
