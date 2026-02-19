import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyToken, type UserJWTPayload } from '@/lib/jwt'

/**
 * Verify that the current request is from an authenticated user (any role).
 * Returns the user payload if authorized, or a NextResponse error if not.
 *
 * Usage in API route handlers:
 *   const auth = await requireAuth()
 *   if (auth instanceof NextResponse) return auth
 *   // auth is now UserJWTPayload — proceed with logic
 */
export async function requireAuth(): Promise<UserJWTPayload | NextResponse> {
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

  return userData
}

/**
 * Verify that the current request is from an authenticated user with a specific role.
 * Returns the user payload if authorized, or a NextResponse error if not.
 */
export async function requireRole(allowedRoles: string[]): Promise<UserJWTPayload | NextResponse> {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  // Admins always pass role checks
  if (auth.role === 'admin') return auth

  if (!allowedRoles.includes(auth.role)) {
    return NextResponse.json(
      { error: 'Forbidden: insufficient permissions' },
      { status: 403 }
    )
  }

  return auth
}
