import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyToken, type UserJWTPayload } from '@/lib/jwt'

/**
 * Verify that the current request is from an authenticated admin user.
 * Returns the user payload if authorized, or a NextResponse error if not.
 *
 * Usage in API route handlers:
 *   const auth = await requireAdmin()
 *   if (auth instanceof NextResponse) return auth
 *   // auth is now UserJWTPayload — proceed with admin logic
 */
export async function requireAdmin(): Promise<UserJWTPayload | NextResponse> {
  const cookieStore = await cookies()
  const userCookie = cookieStore.get('bfp_user')

  if (!userCookie) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  const userData = await verifyToken(userCookie.value)
  if (!userData) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    )
  }

  if (userData.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: admin access required' },
      { status: 403 }
    )
  }

  return userData
}
