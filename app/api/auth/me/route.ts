import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'

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
      // Verify JWT signature and decode user data
      const user = await verifyToken(userCookie.value)
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Invalid session' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { success: true, user },
        { status: 200 }
      )
    } catch (parseError) {
      console.error('Cookie verification error:', parseError)
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
