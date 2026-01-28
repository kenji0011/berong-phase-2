import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // username parameter can be either username or email
    const result = await loginUser(username, password)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    // Set secure cookie
    const response = NextResponse.json(
      { success: true, user: result.user },
      { status: 200 }
    )

    response.cookies.set('bfp_user', JSON.stringify(result.user), {
      httpOnly: false, // Allow JS access for client-side routing
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
