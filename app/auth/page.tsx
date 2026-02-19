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
import { Shield, AlertCircle, Loader2, KeyRound, Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  const [showPassword, setShowPassword] = useState(false)
  const defaultTab = searchParams.get("tab") || "login"

  // Reset password state
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetUsername, setResetUsername] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [resetStep, setResetStep] = useState(1) // 1 = enter username, 2 = enter code
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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

  const handleResetPassword = async () => {
    if (resetStep === 1) {
      // Step 1: Send verification code
      if (!resetUsername.trim()) {
        setResetMessage({ type: 'error', text: 'Please enter your username.' })
        return
      }

      setResetLoading(true)
      setResetMessage(null)

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: resetUsername.trim(), step: 1 }),
        })
        const result = await response.json()

        if (result.success) {
          setResetStep(2)
          setResetMessage({ type: 'success', text: result.message })
        } else {
          setResetMessage({ type: 'error', text: result.error })
        }
      } catch (err) {
        setResetMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      } finally {
        setResetLoading(false)
      }
    } else if (resetStep === 2) {
      // Step 2: Verify code and reset password
      if (!resetCode.trim()) {
        setResetMessage({ type: 'error', text: 'Please enter the verification code.' })
        return
      }

      setResetLoading(true)
      setResetMessage(null)

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: resetUsername.trim(), step: 2, code: resetCode.trim() }),
        })
        const result = await response.json()

        if (result.success) {
          setResetMessage({ type: 'success', text: result.message })
          setResetStep(3) // Done state
        } else {
          setResetMessage({ type: 'error', text: result.error })
        }
      } catch (err) {
        setResetMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      } finally {
        setResetLoading(false)
      }
    }
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
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
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

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setShowResetDialog(true)
                        setResetMessage(null)
                        setResetUsername("")
                        setResetCode("")
                        setResetStep(1)
                      }}
                    >
                      <KeyRound className="h-3 w-3 mr-1" />
                      Forgot Password?
                    </Button>
                  </div>
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

        {/* Reset Password Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-orange-500" />
                Reset Password
              </DialogTitle>
              <DialogDescription>
                {resetStep === 1 && 'Enter your username. A verification code will be sent to your email.'}
                {resetStep === 2 && 'Enter the 6-digit verification code sent to your email.'}
                {resetStep === 3 && 'Your password has been reset successfully!'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Step 1: Username */}
              {resetStep === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="reset-username">Username</Label>
                  <Input
                    id="reset-username"
                    placeholder="Enter your username"
                    value={resetUsername}
                    onChange={(e) => {
                      setResetUsername(e.target.value)
                      setResetMessage(null)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleResetPassword() }}
                  />
                </div>
              )}

              {/* Step 2: Verification Code */}
              {resetStep === 2 && (
                <div className="space-y-2">
                  <Label htmlFor="reset-code">Verification Code</Label>
                  <Input
                    id="reset-code"
                    placeholder="Enter 6-digit code"
                    value={resetCode}
                    onChange={(e) => {
                      setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      setResetMessage(null)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && resetCode.length === 6) handleResetPassword() }}
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.5em] font-Arial"
                  />
                </div>
              )}

              {resetMessage && (
                <Alert variant={resetMessage.type === 'error' ? 'destructive' : 'default'}
                  className={resetMessage.type === 'success' ? 'border-green-500 bg-green-50 text-green-800' : ''}
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{resetMessage.text}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              {resetStep === 3 ? (
                <Button onClick={() => setShowResetDialog(false)} className="w-full">
                  Back to Sign In
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => {
                    if (resetStep === 2) {
                      setResetStep(1)
                      setResetCode("")
                      setResetMessage(null)
                    } else {
                      setShowResetDialog(false)
                    }
                  }}>
                    {resetStep === 2 ? 'Back' : 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleResetPassword}
                    disabled={resetLoading || (resetStep === 1 ? !resetUsername.trim() : resetCode.length !== 6)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {resetStep === 1 ? 'Sending...' : 'Verifying...'}
                      </>
                    ) : (
                      resetStep === 1 ? 'Send Code' : 'Verify & Reset'
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

