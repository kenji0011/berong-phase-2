"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, User, Key, CheckCircle, AlertCircle } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()
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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth")
      return
    }

    // Initialize profile data
    if (user) {
      setProfile({
        name: user.name || "",
        email: user?.username || "",
        age: user.age ? user.age.toString() : "",
        role: user.role || "",
      })
    }

    setLoading(false)
  }, [isAuthenticated, user, router])

  const handleUpdateProfile = async () => {
    if (!profile.name || !profile.email || !profile.age) {
      setError("Please fill all profile fields")
      return
    }

    try {
      // In a real implementation, you would send a request to update the user's profile
      // For now, we'll simulate the update
      setSuccess("Profile updated successfully")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setError("Network error occurred")
    }
  }

  const handleChangePassword = async () => {
    if (!password.current || !password.new || !password.confirm) {
      setError("Please fill all password fields")
      return
    }

    if (password.new !== password.confirm) {
      setError("New passwords do not match")
      return
    }

    if (password.new.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    try {
      // In a real implementation, you would send a request to change the user's password
      // For now, we'll simulate the password change
      setPassword({ current: "", new: "", confirm: "" })
      setSuccess("Password changed successfully")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error('Error changing password:', error)
      setError("Network error occurred")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
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
          <p className="text-sm sm:text-base text-muted-foreground">Manage your account settings and preferences</p>
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
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email Address</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-age">Age</Label>
                  <Input
                    id="profile-age"
                    type="number"
                    placeholder="Your age"
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-role">Role</Label>
                  <Input
                    id="profile-role"
                    value={profile.role}
                    disabled
                  />
                </div>
              </div>
              <Button onClick={() => handleUpdateProfile()} variant="default" className="w-full">
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
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="Enter your current password"
                    value={password.current}
                    onChange={(e) => setPassword({ ...password, current: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter your new password"
                    value={password.new}
                    onChange={(e) => setPassword({ ...password, new: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your new password"
                    value={password.confirm}
                    onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleChangePassword} variant="secondary" className="w-full">
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Account Permissions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Account Permissions</CardTitle>
            <CardDescription>Your current access levels and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user?.permissions ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <div className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${user.permissions.accessKids ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} mb-2`}>
                      {user.permissions.accessKids ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <AlertCircle className="h-6 w-6" />
                      )}
                    </div>
                    <h3 className="font-semibold">Kids Access</h3>
                    <p className="text-sm text-muted-foreground">
                      {user.permissions.accessKids ? 'Granted' : 'Denied'}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${user.permissions.accessAdult ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} mb-2`}>
                      {user.permissions.accessAdult ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <AlertCircle className="h-6 w-6" />
                      )}
                    </div>
                    <h3 className="font-semibold">Adult Access</h3>
                    <p className="text-sm text-muted-foreground">
                      {user.permissions.accessAdult ? 'Granted' : 'Denied'}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${user.permissions.accessProfessional ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} mb-2`}>
                      {user.permissions.accessProfessional ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <AlertCircle className="h-6 w-6" />
                      )}
                    </div>
                    <h3 className="font-semibold">Professional Access</h3>
                    <p className="text-sm text-muted-foreground">
                      {user.permissions.accessProfessional ? 'Granted' : 'Denied'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No permissions data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
