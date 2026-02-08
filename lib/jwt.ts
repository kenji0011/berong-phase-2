import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

/**
 * JWT utility for signing and verifying auth cookies.
 * Uses `jose` (Edge-compatible) so it works in both:
 *   - Next.js middleware (Edge Runtime)
 *   - API routes (Node.js Runtime)
 *
 * The JWT_SECRET from .env is used to sign cookies, preventing
 * cookie tampering / role escalation attacks.
 */

// User payload stored inside the JWT
export interface UserJWTPayload extends JWTPayload {
  id: number
  userId?: number // backwards compatibility
  username: string
  name: string
  role: string
  permissions?: Record<string, boolean>
  [key: string]: unknown // allow extra user fields (age, barangay, etc.)
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Sign a user object into a JWT token string.
 * Used when setting the bfp_user cookie (login, register, complete-profile).
 */
export async function signToken(user: Record<string, unknown>): Promise<string> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())

  return token
}

/**
 * Verify and decode a JWT token string back into user data.
 * Used when reading the bfp_user cookie (middleware, /api/auth/me, etc.).
 * Returns null if the token is invalid, expired, or tampered with.
 */
export async function verifyToken(token: string): Promise<UserJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as UserJWTPayload
  } catch {
    return null
  }
}
