"use client"

import Link from "next/link"
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Bell, LogOut, User, Menu, X, Home, Users, Briefcase, Baby, Shield, Info } from "lucide-react"
import Image from "next/image"
import { NotificationPopover } from "@/components/ui/notification-popover"
import GooeyNav, { GooeyNavItem } from "@/components/ui/gooey-nav"

export function Navigation() {
  const { user, logout, isAuthenticated } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>("")

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <nav className="bg-red-700 sticky top-0 z-50 shadow-xl relative">
      {/* Background Image Layer - 10% opacity */}
      <div
        className="absolute inset-0 opacity-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/web-background-image.jpg')" }}
      />

      {/* Content Layer - Full opacity */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 relative">

            {/* LEFT SECTION: Logo + Branding */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0 hover:opacity-90 transition-opacity cursor-pointer">
              {/* Logos */}
              <div className="flex items-center gap-1 sm:gap-2">
                <Image
                  src="/bfp logo.png"
                  alt="Bureau of Fire Protection Logo"
                  width={48}
                  height={48}
                  className="rounded-full bg-white p-0.5 object-contain shadow-md w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12"
                />
                <Image
                  src="/berong-official-logo.jpg"
                  alt="Berong E-Learning Logo"
                  width={48}
                  height={48}
                  className="rounded-full object-cover shadow-md w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 border-2 border-yellow-400/50"
                />
              </div>

              {/* Branding - Compact on mobile */}
              <div className="min-w-0">
                {/* Full branding on desktop, abbreviated on mobile */}
                <p className="text-white font-bold text-[10px] xl:text-xs">Berong E-Learning</p>
                <h1 className="text-yellow-400 font-semibold leading-tight text-[10px] xl:text-xs hidden sm:block">
                  Fire Safety Education Platform
                </h1>
                <p className="text-gray-300 text-[9px] xl:text-xs hidden sm:block">
                  <span className="hidden xl:inline">BUREAU OF FIRE PROTECTION STA CRUZ LAGUNA</span>
                  <span className="xl:hidden">BFP Sta. Cruz</span>
                </p>
              </div>
            </Link>

            {/* CENTER SECTION: GooeyNav Links - Desktop - Absolutely positioned for true center */}
            <div className="hidden lg:flex items-center absolute left-1/2 transform -translate-x-1/2">
              <GooeyNav
                items={[
                  { label: 'DASHBOARD', href: '/' },
                  ...(isAuthenticated && user?.permissions.accessProfessional
                    ? [{ label: 'PROFESSIONAL', href: '/professional' }]
                    : []),
                  ...(isAuthenticated && user?.permissions.accessAdult
                    ? [{ label: 'ADULTS', href: '/adult' }]
                    : []),
                  ...(isAuthenticated && user?.permissions.accessKids
                    ? [{ label: 'KIDS', href: '/kids' }]
                    : []),
                  ...(isAuthenticated && user?.role === 'admin'
                    ? [{ label: 'ADMIN', href: '/admin' }]
                    : []),
                ]}
                particleCount={12}
              />
            </div>

            {/* RIGHT SECTION: Time + User Info + Icon Buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Time + User Info Column */}
              <div className="text-right hidden md:block">
                <p className="text-gray-300 text-xs whitespace-nowrap mb-1">
                  {currentTime}
                </p>
                {isAuthenticated && (
                  <>
                    <p className="text-white font-semibold text-sm">{user?.name}</p>
                    <p className="text-yellow-400 text-xs capitalize">{user?.role}</p>
                  </>
                )}
              </div>

              {/* Icon Buttons with hover animations */}
              {isAuthenticated ? (
                <div className="flex gap-2">
                  <div className="relative group">
                    <Link href="/about">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-white/50 text-white bg-transparent hover:bg-white hover:text-red-700 hover:border-white transition-all hover:scale-110"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </Link>
                    <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[9999] pointer-events-none">
                      About
                    </span>
                  </div>
                  <div className="relative group">
                    <NotificationPopover />
                    <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[9999] pointer-events-none">
                      Notifications
                    </span>
                  </div>
                  <div className="relative group">
                    <Link href="/profile">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-white/50 text-white bg-transparent hover:bg-white hover:text-red-700 hover:border-white transition-all hover:scale-110"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    </Link>
                    <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[9999] pointer-events-none">
                      Profile
                    </span>
                  </div>
                  <div className="relative group">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={logout}
                      className="h-9 w-9 border-white text-white hover:bg-red-600 hover:border-white bg-transparent transition-transform hover:scale-110"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                    <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[9999] pointer-events-none">
                      Logout
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative group">
                    <Link href="/about">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-white/50 text-white bg-transparent hover:bg-white hover:text-red-700 hover:border-white transition-all hover:scale-110"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </Link>
                    <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[9999] pointer-events-none">
                      About
                    </span>
                  </div>
                  <Link href="/auth">
                    <Button className="bg-yellow-500 hover:bg-yellow-400 text-red-900 font-bold px-6 shadow-md">
                      Sign In
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button - More prominent */}
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden text-white border-white/50 hover:bg-white hover:text-red-700 h-10 w-10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-red-600 bg-red-800">
            <div className="px-4 py-3 space-y-1">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-3 rounded-md text-white font-semibold hover:bg-red-700 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5" />
                Dashboard
              </Link>

              <Link
                href="/about"
                className="flex items-center gap-3 px-3 py-3 rounded-md text-white font-semibold hover:bg-red-700 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Info className="h-5 w-5" />
                About
              </Link>

              {isAuthenticated && user?.permissions.accessProfessional && (
                <Link
                  href="/professional"
                  className="flex items-center gap-3 px-3 py-3 rounded-md text-white font-semibold hover:bg-red-700 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Briefcase className="h-5 w-5" />
                  Professional
                </Link>
              )}

              {isAuthenticated && user?.permissions.accessAdult && (
                <Link
                  href="/adult"
                  className="flex items-center gap-3 px-3 py-3 rounded-md text-white font-semibold hover:bg-red-700 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users className="h-5 w-5" />
                  Adults
                </Link>
              )}

              {isAuthenticated && user?.permissions.accessKids && (
                <Link
                  href="/kids"
                  className="flex items-center gap-3 px-3 py-3 rounded-md text-white font-semibold hover:bg-red-700 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Baby className="h-5 w-5" />
                  Kids
                </Link>
              )}

              {isAuthenticated && user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-3 rounded-md text-white font-semibold hover:bg-red-700 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Shield className="h-5 w-5" />
                  Admin
                </Link>
              )}

              {/* Mobile User Info */}
              {isAuthenticated && (
                <div className="px-3 py-3 border-t border-red-600 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{user?.name}</p>
                      <p className="text-yellow-400 text-sm capitalize">{user?.role}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={logout}
                      className="border-white text-white hover:bg-red-600 bg-transparent"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
