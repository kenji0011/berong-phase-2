"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export type UserRole = "guest" | "kid" | "adult" | "professional" | "admin"

export interface User {
  id: number
  username: string
  email?: string
  name: string
  age: number
  role: UserRole
  permissions: {
    accessKids: boolean
    accessAdult: boolean
    accessProfessional: boolean
    isAdmin: boolean
  }
  isActive: boolean
  createdAt: string
  // Enhanced profile fields
  profileCompleted?: boolean
  barangay?: string
  school?: string
  occupation?: string
  gender?: string
  preTestScore?: number
  postTestScore?: number
  engagementPoints?: number
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>
  register: (username: string, password: string, name: string, age: number) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
  isLoading: boolean
  isLoggingOut: boolean
  isAuthenticated: boolean
  isAuthenticating: boolean
  getRedirectPath: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper function to determine redirect path based on user role
function determineRedirectPath(user: User | null): string {
  if (!user) return '/'

  if (user.role === 'admin') return '/admin'
  if (user.role === 'professional') return '/professional'
  if (user.role === 'adult') return '/adult'
  if (user.role === 'kid') return '/kids'

  return '/'
}

// Helper function to determine permissions
function determinePermissions(role: UserRole) {
  if (role === 'admin') {
    return {
      accessKids: true,
      accessAdult: true,
      accessProfessional: true,
      isAdmin: true,
    }
  }

  switch (role) {
    case "professional":
      return {
        accessKids: true,
        accessAdult: true,
        accessProfessional: true,
        isAdmin: false,
      }
    case "adult":
      return {
        accessKids: false,
        accessAdult: true,
        accessProfessional: false,
        isAdmin: false,
      }
    case "kid":
      return {
        accessKids: true,
        accessAdult: false,
        accessProfessional: false,
        isAdmin: false,
      }
    default:
      return {
        accessKids: false,
        accessAdult: false,
        accessProfessional: false,
        isAdmin: false,
      }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check for stored user session from both localStorage and cookie
    const checkAuth = async () => {
      // First, try localStorage
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          // Always re-compute permissions from role to ensure they're correct
          // (handles stale localStorage from older code versions)
          parsedUser.permissions = determinePermissions(parsedUser.role)
          setUser(parsedUser)
          setIsLoading(false)
          return
        } catch (error) {
          console.error('Failed to parse stored user:', error)
          localStorage.removeItem('user')
        }
      }

      // If no localStorage, check if there's a cookie by making a request
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            const userWithPermissions = {
              ...data.user,
              permissions: determinePermissions(data.user.role)
            }
            setUser(userWithPermissions)
            localStorage.setItem('user', JSON.stringify(userWithPermissions))
          }
        }
      } catch (error) {
        console.error('Failed to check auth status:', error)
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const register = async (username: string, password: string, name: string, age: number): Promise<{ success: boolean; error?: string }> => {
    setIsAuthenticating(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for CORS cookie handling
        body: JSON.stringify({ username, password, name, age }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed' }
      }

      const userWithPermissions = {
        ...data.user,
        permissions: determinePermissions(data.user.role)
      }

      setUser(userWithPermissions)
      localStorage.setItem('user', JSON.stringify(userWithPermissions))

      return { success: true }
    } catch (error: any) {
      console.error('Registration error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    } finally {
      setIsAuthenticating(false)
    }
  }

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsAuthenticating(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for CORS cookie handling
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Login failed' }
      }

      const userWithPermissions = {
        ...data.user,
        permissions: determinePermissions(data.user.role)
      }

      setUser(userWithPermissions)
      localStorage.setItem('user', JSON.stringify(userWithPermissions))

      return { success: true, user: userWithPermissions }
    } catch (error: any) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    } finally {
      setIsAuthenticating(false)
    }
  }

  const logout = () => {
    setIsLoggingOut(true)

    // Show loading screen for 1.5 seconds before clearing session
    setTimeout(async () => {
      // Clear httpOnly cookie via server-side API
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
      } catch (error) {
        console.error('Logout API error:', error)
      }

      setUser(null)
      localStorage.removeItem('user')
      setIsLoggingOut(false)
      router.push('/')
    }, 1500)
  }

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          const userWithPermissions = {
            ...data.user,
            permissions: determinePermissions(data.user.role)
          }
          setUser(userWithPermissions)
          localStorage.setItem('user', JSON.stringify(userWithPermissions))
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  const getRedirectPath = () => {
    return determineRedirectPath(user)
  }

  const isAuthenticated = user !== null

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, isLoading, isLoggingOut, isAuthenticated, isAuthenticating, getRedirectPath }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
