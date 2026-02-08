import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from 'jose'

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) return new TextEncoder().encode('fallback-dev-key')
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const userCookie = request.cookies.get("bfp_user")
  const { pathname } = request.nextUrl

  // Protected routes that require authentication
  const protectedRoutes = ["/professional", "/adult", "/kids", "/admin"]
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // If accessing a protected route without authentication, redirect to auth
  if (isProtectedRoute && !userCookie) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    return NextResponse.redirect(url)
  }

  // If authenticated, verify JWT and check role-based permissions
  if (isProtectedRoute && userCookie) {
    try {
      // Verify JWT signature — prevents cookie tampering / role escalation
      const { payload: user } = await jwtVerify(userCookie.value, getSecret())

      // Admin route - only admins can access
      if (pathname.startsWith("/admin") && user.role !== "admin") {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }

      // Professional route - check permission
      const permissions = user.permissions as Record<string, boolean> | undefined
      if (pathname.startsWith("/professional") && !permissions?.accessProfessional) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }

      // Adult route - check permission
      if (pathname.startsWith("/adult") && !permissions?.accessAdult) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }

      // Kids route - check permission
      if (pathname.startsWith("/kids") && !permissions?.accessKids) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error("Middleware JWT verification error:", error)
      // If JWT is invalid/tampered, redirect to auth
      const url = request.nextUrl.clone()
      url.pathname = "/auth"
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/professional/:path*",
    "/adult/:path*",
    "/kids/:path*",
    "/admin/:path*",
    "/api/admin/:path*"
  ],
}
