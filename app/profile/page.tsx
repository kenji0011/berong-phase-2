"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  User, Key, CheckCircle, AlertCircle, Eye, EyeOff, Loader2,
  Trophy, BookOpen, ArrowUpRight, Minus
} from "lucide-react"

interface UserScores {
  preTestScore: number | null
  preTestMax: number
  preTestCompletedAt: string | null
  postTestScore: number | null
  postTestMax: number
  postTestCompletedAt: string | null
  engagementPoints: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  // Profile Management
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    age: "",
    role: "",
  })

  // Password Management
  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  })

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Confirm dialog for profile update
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showConfirmPasswordField, setShowConfirmPasswordField] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState("")

  // Password change loading
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Scores
  const [scores, setScores] = useState<UserScores | null>(null)
  const [scoresLoading, setScoresLoading] = useState(true)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push("/auth")
      return
    }

    if (user) {
      setProfile({
        name: user.name || "",
        email: user.email || "",
        age: user.age ? user.age.toString() : "",
        role: user.role || "",
      })
    }

    setLoading(false)
    fetchScores()
  }, [isAuthenticated, user, router, isLoading])

  const fetchScores = async () => {
    try {
      setScoresLoading(true)
      const response = await fetch('/api/auth/user-scores')
      const result = await response.json()
      if (result.success) {
        setScores(result.scores)
      }
    } catch (err) {
      console.error('Failed to fetch scores:', err)
    } finally {
      setScoresLoading(false)
    }
  }

  const handleUpdateProfile = () => {
    setError("")
    if (!profile.name.trim()) {
      setError("Name is required")
      return
    }

    // Email validation
    if (profile.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(profile.email.trim())) {
        setError("Please enter a valid email address")
        return
      }
    }

    // Show password confirmation dialog
    setConfirmPassword("")
    setConfirmError("")
    setShowConfirmPasswordField(false)
    setShowConfirmDialog(true)
  }

  const handleConfirmUpdate = async () => {
    if (!confirmPassword) {
      setConfirmError("Please enter your password to confirm changes")
      return
    }

    setConfirmLoading(true)
    setConfirmError("")

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name.trim(),
          email: profile.email.trim() || null,
          password: confirmPassword,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setShowConfirmDialog(false)
        setConfirmPassword("")
        setSuccess("Profile updated successfully!")
        // Refresh user data in auth context
        if (refreshUser) await refreshUser()
        setTimeout(() => setSuccess(""), 4000)
      } else {
        setConfirmError(result.error || "Failed to update profile")
      }
    } catch (err) {
      setConfirmError("Network error. Please try again.")
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setError("")

    if (!password.current || !password.new || !password.confirm) {
      setError("Please fill all password fields")
      return
    }

    if (password.new !== password.confirm) {
      setError("New passwords do not match")
      return
    }

    if (password.new.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }

    if (password.current === password.new) {
      setError("New password must be different from your current password")
      return
    }

    setPasswordLoading(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: password.current,
          newPassword: password.new,
          confirmPassword: password.confirm,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setPassword({ current: "", new: "", confirm: "" })
        setShowCurrentPassword(false)
        setShowNewPassword(false)
        setShowConfirmPassword(false)
        setSuccess("Password changed successfully!")
        setTimeout(() => setSuccess(""), 4000)
      } else {
        setError(result.error || "Failed to change password")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setPasswordLoading(false)
    }
  }

  const getScorePercentage = (score: number | null, max: number) => {
    if (score === null || max === 0) return 0
    return Math.round((score / max) * 100)
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    if (percentage >= 40) return "text-orange-500"
    return "text-red-500"
  }

  const getScoreBg = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100"
    if (percentage >= 60) return "bg-yellow-100"
    if (percentage >= 40) return "bg-orange-100"
    return "bg-red-100"
  }

  const getScoreLabel = (percentage: number) => {
    if (percentage >= 90) return "Outstanding!"
    if (percentage >= 80) return "Excellent"
    if (percentage >= 70) return "Very Good"
    if (percentage >= 60) return "Good"
    if (percentage >= 50) return "Fair"
    if (percentage >= 40) return "Needs Improvement"
    return "Keep Studying"
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">User Profile</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your account settings and view your assessment scores</p>
        </div>

        {/* Alerts */}
        {success && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-8">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input
                    id="profile-name"
                    placeholder="Your full name"
                    value={profile.name}
                    onChange={(e) => {
                      setError("")
                      setProfile({ ...profile, name: e.target.value })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email Address</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    placeholder="your.email@example.com (optional)"
                    value={profile.email}
                    onChange={(e) => {
                      setError("")
                      setProfile({ ...profile, email: e.target.value })
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for password reset. Must be unique per account.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-age">Age</Label>
                  <Input
                    id="profile-age"
                    type="number"
                    value={profile.age}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-role">Role</Label>
                  <Input
                    id="profile-role"
                    value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <Button onClick={handleUpdateProfile} variant="default" className="w-full">
                <User className="h-4 w-4 mr-2" />
                Update Profile
              </Button>
            </CardContent>
          </Card>

          {/* Password Management */}
          <Card>
            <CardHeader>
              <CardTitle>Password Management</CardTitle>
              <CardDescription>Change your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={password.current}
                      onChange={(e) => {
                        setError("")
                        setPassword({ ...password, current: e.target.value })
                      }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={password.new}
                      onChange={(e) => {
                        setError("")
                        setPassword({ ...password, new: e.target.value })
                      }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      value={password.confirm}
                      onChange={(e) => {
                        setError("")
                        setPassword({ ...password, confirm: e.target.value })
                      }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                variant="secondary"
                className="w-full"
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Assessment Scores */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              Assessment Scores
            </CardTitle>
            <CardDescription>Your pre-test and post-test performance</CardDescription>
          </CardHeader>
          <CardContent>
            {scoresLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : scores ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pre-Test Card */}
                <div className="border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-lg">Pre-Test</h3>
                  </div>
                  {scores.preTestScore !== null ? (
                    <>
                      <div className={`text-center p-6 rounded-lg ${getScoreBg(getScorePercentage(scores.preTestScore, 15))}`}>
                        <div className={`text-4xl font-bold ${getScoreColor(getScorePercentage(scores.preTestScore, 15))}`}>
                          {scores.preTestScore} / 15
                        </div>
                        <div className={`text-lg font-medium mt-1 ${getScoreColor(getScorePercentage(scores.preTestScore, 15))}`}>
                          {getScorePercentage(scores.preTestScore, 15)}%
                        </div>
                        <p className={`text-sm mt-2 font-medium ${getScoreColor(getScorePercentage(scores.preTestScore, 15))}`}>
                          {getScoreLabel(getScorePercentage(scores.preTestScore, 15))}
                        </p>
                      </div>
                      {scores.preTestCompletedAt && (
                        <p className="text-xs text-muted-foreground mt-3 text-center">
                          Completed on {formatDate(scores.preTestCompletedAt)}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Minus className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Not yet taken</p>
                    </div>
                  )}
                </div>

                {/* Post-Test Card */}
                <div className="border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold text-lg">Post-Test</h3>
                  </div>
                  {scores.postTestScore !== null ? (
                    <>
                      <div className={`text-center p-6 rounded-lg ${getScoreBg(getScorePercentage(scores.postTestScore, 15))}`}>
                        <div className={`text-4xl font-bold ${getScoreColor(getScorePercentage(scores.postTestScore, 15))}`}>
                          {scores.postTestScore} / 15
                        </div>
                        <div className={`text-lg font-medium mt-1 ${getScoreColor(getScorePercentage(scores.postTestScore, 15))}`}>
                          {getScorePercentage(scores.postTestScore, 15)}%
                        </div>
                        <p className={`text-sm mt-2 font-medium ${getScoreColor(getScorePercentage(scores.postTestScore, 15))}`}>
                          {getScoreLabel(getScorePercentage(scores.postTestScore, 15))}
                        </p>
                      </div>
                      {scores.postTestCompletedAt && (
                        <p className="text-xs text-muted-foreground mt-3 text-center">
                          Completed on {formatDate(scores.postTestCompletedAt)}
                        </p>
                      )}

                      {/* Improvement indicator */}
                      {scores.preTestScore !== null && scores.postTestScore !== null && (
                        <div className="mt-4 text-center">
                          {scores.postTestScore > scores.preTestScore ? (
                            <div className="inline-flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-full">
                              <ArrowUpRight className="h-4 w-4" />
                              +{scores.postTestScore - scores.preTestScore} points improvement!
                            </div>
                          ) : scores.postTestScore === scores.preTestScore ? (
                            <div className="text-sm text-muted-foreground">
                              Same score as pre-test
                            </div>
                          ) : (
                            <div className="text-sm text-orange-500">
                              Score decreased by {scores.preTestScore - scores.postTestScore} points
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Minus className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Not yet taken</p>
                      <p className="text-xs mt-1">Complete all modules to unlock</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Unable to load scores</p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Password Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-orange-500" />
              Confirm Changes
            </DialogTitle>
            <DialogDescription>
              Enter your password to save profile changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="confirm-edit-password">Password</Label>
              <div className="relative">
                <Input
                  id="confirm-edit-password"
                  type={showConfirmPasswordField ? "text" : "password"}
                  placeholder="Enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmError("")
                    setConfirmPassword(e.target.value)
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && confirmPassword) handleConfirmUpdate() }}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPasswordField(!showConfirmPasswordField)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPasswordField ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {confirmError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{confirmError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setConfirmPassword("")
                setConfirmError("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpdate}
              disabled={confirmLoading || !confirmPassword}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {confirmLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Confirm & Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
