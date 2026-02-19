import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from 'jose'

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // SECURITY: Never fall back to a predictable key — fail closed in all environments
    throw new Error('[Middleware] FATAL: JWT_SECRET is not set! Refusing to start with insecure fallback.')
  }
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const userCookie = request.cookies.get("bfp_user")
  const { pathname } = request.nextUrl

  // Protected routes that require authentication
  const protectedRoutes = ["/professional", "/adult", "/kids", "/admin"]
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Skip auth redirect for RSC prefetch requests — let client-side handle auth
  // This prevents Next.js router from caching 307 redirects for prefetched routes
  const isPrefetch = request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("rsc") === "1"

  // If accessing a protected route without authentication
  if (isProtectedRoute && !userCookie) {
    // For prefetch/RSC requests, return empty response instead of redirect
    // to prevent the router from caching a redirect to /auth
    if (isPrefetch) {
      return new NextResponse(null, { status: 200 })
    }
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    return NextResponse.redirect(url)
  }

  // If authenticated, verify JWT and check role-based permissions
  if (isProtectedRoute && userCookie) {
    try {
      // Verify JWT signature — prevents cookie tampering / role escalation
      const { payload: user } = await jwtVerify(userCookie.value, getSecret())
      const role = user.role as string

      // ── Admin bypass: admins have superuser access to ALL sections ──
      if (role === "admin") {
        return NextResponse.next()
      }

      // Admin route - only admins can access (non-admins blocked here)
      if (pathname.startsWith("/admin")) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }

      // For non-admin users, check role-based permissions from JWT
      const permissions = user.permissions as Record<string, boolean> | undefined

      // Professional route - check permission
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
      console.error("[Middleware] JWT verification failed for", pathname, ":", error)
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
