"use client"

import type React from "react"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { RegistrationWizard } from "@/components/registration-wizard"

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, register, isAuthenticating, getRedirectPath } = useAuth()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false)
  const defaultTab = searchParams.get("tab") || "login"

  const [loginData, setLoginData] = useState({ username: "", password: "" })
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    age: "",
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!loginData.username) {
      errors.username = "Username is required"
    } else if (loginData.username.length < 3) {
      errors.username = "Username must be at least 3 characters"
    }

    if (!loginData.password) {
      errors.password = "Password is required"
    } else if (loginData.password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }

    if (!isLogin) {
      if (!registerData.name) {
        errors.name = "Name is required"
      }
      if (!registerData.username) {
        errors.username = "Username is required"
      } else if (registerData.username.length < 3 || registerData.username.length > 20) {
        errors.username = "Username must be 3-20 characters"
      } else if (!/^[a-zA-Z0-9_]+$/.test(registerData.username)) {
        errors.username = "Username can only contain letters, numbers, and underscores"
      }
      if (!registerData.age) {
        errors.age = "Age is required"
      } else if (Number.parseInt(registerData.age) < 1 || Number.parseInt(registerData.age) > 120) {
        errors.age = "Please enter a valid age"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!validateForm()) {
      setLoading(false)
      return
    }

    const result = await login(loginData.username, loginData.password)

    if (result.success) {
      // Determine redirect from the returned user (not stale React state)
      let redirectPath = '/'
      if (result.user) {
        if (result.user.role === 'admin') redirectPath = '/admin'
        else if (result.user.role === 'professional') redirectPath = '/professional'
        else if (result.user.role === 'adult') redirectPath = '/adult'
        else if (result.user.role === 'kid') redirectPath = '/kids'
      }
      // Small delay to ensure cookie is fully set before middleware checks it
      await new Promise(resolve => setTimeout(resolve, 100))
      // Use full page navigation to clear Next.js router cache
      window.location.href = redirectPath
    } else {
      setError(result.error || "Invalid username or password")
    }

    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!registerData.age || Number.parseInt(registerData.age) < 1) {
      setError("Please enter a valid age")
      return
    }

    setLoading(true)

    const result = await register(
      registerData.username,
      registerData.password,
      registerData.name,
      Number.parseInt(registerData.age),
    )

    if (result.success) {
      // Redirect based on user role
      const redirectPath = getRedirectPath()
      // Use full page navigation to clear Next.js router cache
      window.location.href = redirectPath
    } else {
      setError(result.error || "Registration failed. Username may already be taken.")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center p-4">
      {/* Registration Wizard Modal - Full screen overlay */}
      {showRegistrationWizard && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8">
          <div className="w-full max-w-2xl mx-4">
            <RegistrationWizard />
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-4 mb-4">
            <Image src="/bfp-logo-red.jpg" alt="BFP Logo" width={60} height={60} className="h-16 w-16 object-contain" />
            <Image
              src="/philippine-flag-seal.jpg"
              alt="Philippine Seal"
              width={60}
              height={60}
              className="h-16 w-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Berong E-Learning</h1>
          <p className="text-muted-foreground">BFP Sta Cruz Fire Safety Education</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle>Access Your Account</CardTitle>
            </div>
            <CardDescription>Sign in or create an account to access learning materials</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="Enter your username"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      required
                      autoComplete="username"
                    />
                    {validationErrors.username && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.username}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      autoComplete="current-password"
                    />
                    {validationErrors.password && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                    )}
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <div className="space-y-4 py-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Create Your Account</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Join our fire safety community and help protect Santa Cruz, Laguna
                    </p>
                  </div>

                  <Button
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    onClick={() => setShowRegistrationWizard(true)}
                    size="lg"
                  >
                    Start Registration
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Registration includes a quick fire safety assessment to personalize your learning experience.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <Link href="/">
                <Button variant="link" className="text-accent">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AuthLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthContent />
    </Suspense>
  )
}

