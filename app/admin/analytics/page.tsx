"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  ClipboardCheck,
  TrendingUp,
  Award,
  MapPin,
  BarChart3,
  Download,
  RefreshCw,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Target,
  BookOpen,
  Gamepad2,
  Video,
  Flame
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { BARANGAYS_SANTA_CRUZ, ASSESSMENT_CATEGORIES } from "@/lib/constants"

interface SummaryData {
  totalUsers: number
  profilesCompleted: number
  preTestsTaken: number
  postTestsTaken: number
  averagePreTestScore: number
  averagePostTestScore: number
  averageImprovement: number
  totalEngagementPoints: number
  avgEngagementPerUser: number
  activeUsersToday: number
  activeUsersThisWeek: number
}

interface BarangayData {
  barangay: string
  userCount: number
  avgPreTestScore: number
  avgPostTestScore: number
  avgImprovement: number
  profilesCompleted: number
}

interface DemographicData {
  gender: Record<string, number>
  ageGroups: Record<string, number>
  occupations: Record<string, number>
  schools: Record<string, number>
}

interface KnowledgeData {
  category: string
  avgScore: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
}

export default function AnalyticsDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [barangayData, setBarangayData] = useState<BarangayData[]>([])
  const [demographicData, setDemographicData] = useState<DemographicData | null>(null)
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeData[]>([])
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (authLoading) return

    if (user?.role !== "admin") {
      router.push("/")
      return
    }
    fetchAllData()
  }, [user, router, authLoading])

  const fetchAllData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)
      setError("")

      const refreshParam = refresh ? "&refresh=true" : ""

      const [summaryRes, barangayRes, demographicsRes, knowledgeRes] = await Promise.all([
        fetch(`/api/admin/analytics?type=summary${refreshParam}`),
        fetch(`/api/admin/analytics?type=barangay${refreshParam}`),
        fetch(`/api/admin/analytics?type=demographics${refreshParam}`),
        fetch(`/api/admin/analytics?type=knowledge${refreshParam}`),
      ])

      if (!summaryRes.ok || !barangayRes.ok || !demographicsRes.ok || !knowledgeRes.ok) {
        throw new Error("Failed to fetch analytics")
      }

      const [summaryData, barangayResult, demographicsResult, knowledgeResult] = await Promise.all([
        summaryRes.json(),
        barangayRes.json(),
        demographicsRes.json(),
        knowledgeRes.json(),
      ])

      setSummary(summaryData.data)
      setBarangayData(barangayResult.data)
      setDemographicData(demographicsResult.data)
      setKnowledgeData(knowledgeResult.data)
    } catch (err) {
      setError("Failed to load analytics data")
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/analytics/export")
      if (!response.ok) throw new Error("Export failed")
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `safescape_analytics_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError("Failed to export data")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (user?.role !== "admin") {
    return null
  }

  // Find max values for bar chart scaling
  const maxBarangayUsers = Math.max(...barangayData.map(b => b.userCount), 1)
  const maxKnowledgeScore = 100

  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} className="mt-1 sm:mt-0 flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 flex-shrink-0" />
                  <span>Community Analytics Dashboard</span>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate sm:whitespace-normal">
                  Fire Safety Risk Assessment Data - Santa Cruz, Laguna
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 ml-10 sm:ml-0">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => fetchAllData(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={handleExport} className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <TabsList className="flex overflow-x-auto overflow-y-hidden justify-start sm:justify-center w-full max-w-full bg-slate-100 p-1">
            <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="barangay" className="whitespace-nowrap">By Barangay</TabsTrigger>
            <TabsTrigger value="demographics" className="whitespace-nowrap">Demographics</TabsTrigger>
            <TabsTrigger value="knowledge" className="whitespace-nowrap">Knowledge Gaps</TabsTrigger>
          </TabsList>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Overview Tab */}
          <TabsContent value="overview">
            {summary && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold">{summary.totalUsers}</span>
                        <Users className="h-8 w-8 text-blue-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {summary.profilesCompleted} profiles completed
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Pre-Tests Taken
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold">{summary.preTestsTaken}</span>
                        <ClipboardCheck className="h-8 w-8 text-orange-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Avg score: {summary.averagePreTestScore}/15
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Post-Tests Taken
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold">{summary.postTestsTaken}</span>
                        <Award className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Avg score: {summary.averagePostTestScore}/15
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Avg Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className={`text-3xl font-bold ${summary.averageImprovement >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {summary.averageImprovement >= 0 ? "+" : ""}{summary.averageImprovement}
                        </span>
                        <TrendingUp className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        points from pre to post-test
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Engagement Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Total Engagement Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <span className="text-2xl font-bold">{summary.totalEngagementPoints.toLocaleString()}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Avg {summary.avgEngagementPerUser} per user
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Active Users Today
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <span className="text-2xl font-bold">{summary.activeUsersToday}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        logged activities today
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Active This Week
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <span className="text-2xl font-bold">{summary.activeUsersThisWeek}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        unique users with activity
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Completion Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Journey Funnel</CardTitle>
                    <CardDescription>Tracking user progression through the platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Registered Users</span>
                          <span>{summary.totalUsers}</span>
                        </div>
                        <Progress value={100} className="h-4 bg-blue-100" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Completed Profile & Pre-Test</span>
                          <span>{summary.profilesCompleted} ({summary.totalUsers > 0 ? Math.round((summary.profilesCompleted / summary.totalUsers) * 100) : 0}%)</span>
                        </div>
                        <Progress 
                          value={summary.totalUsers > 0 ? (summary.profilesCompleted / summary.totalUsers) * 100 : 0} 
                          className="h-4 bg-orange-100" 
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Completed Post-Test</span>
                          <span>{summary.postTestsTaken} ({summary.totalUsers > 0 ? Math.round((summary.postTestsTaken / summary.totalUsers) * 100) : 0}%)</span>
                        </div>
                        <Progress 
                          value={summary.totalUsers > 0 ? (summary.postTestsTaken / summary.totalUsers) * 100 : 0} 
                          className="h-4 bg-green-100" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Barangay Tab */}
          <TabsContent value="barangay">
            <div className="space-y-6">
              <Card className="w-full overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    Users by Barangay
                  </CardTitle>
                  <CardDescription>
                    Distribution of users across Santa Cruz, Laguna barangays
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {barangayData.filter(b => b.userCount > 0).map((b) => (
                      <div key={b.barangay} className="flex items-center gap-4">
                        <div className="w-40 text-sm font-medium truncate">{b.barangay}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-6 bg-gradient-to-r from-orange-400 to-orange-600 rounded"
                              style={{ width: `${(b.userCount / maxBarangayUsers) * 100}%`, minWidth: "20px" }}
                            />
                            <span className="text-sm font-medium">{b.userCount}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {barangayData.filter(b => b.userCount > 0).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No barangay data available yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="w-full overflow-hidden">
                <CardHeader>
                  <CardTitle>Pre-Test vs Post-Test Scores by Barangay</CardTitle>
                  <CardDescription>
                    Average assessment scores comparison
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 sm:px-6">
                  <div className="overflow-x-auto w-full px-4 sm:px-0 pb-4">
                    <table className="w-full text-sm min-w-[550px]">
                      <thead>
                        <tr className="border-b">
                          <th className="whitespace-nowrap text-left py-2 px-2">Barangay</th>
                          <th className="whitespace-nowrap text-center py-2 px-2">Users</th>
                          <th className="whitespace-nowrap text-center py-2 px-2">Avg Pre-Test</th>
                          <th className="whitespace-nowrap text-center py-2 px-2">Avg Post-Test</th>
                          <th className="whitespace-nowrap text-center py-2 px-2">Improvement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {barangayData.filter(b => b.userCount > 0).map((b) => (
                          <tr key={b.barangay} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2 font-medium">{b.barangay}</td>
                            <td className="py-2 px-2 text-center">{b.userCount}</td>
                            <td className="py-2 px-2 text-center">
                              <Badge variant="outline">{b.avgPreTestScore}/15</Badge>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <Badge variant="outline" className="bg-green-50">{b.avgPostTestScore}/15</Badge>
                            </td>
                            <td className={`py-2 px-2 text-center font-medium ${b.avgImprovement >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {b.avgImprovement >= 0 ? "+" : ""}{b.avgImprovement}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {barangayData.filter(b => b.userCount > 0).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics">
            {demographicData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gender */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gender Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(demographicData.gender).map(([gender, count]) => {
                        const total = Object.values(demographicData.gender).reduce((a, b) => a + b, 0)
                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                        return (
                          <div key={gender} className="flex items-center gap-4">
                            <div className="w-24 text-sm font-medium">{gender}</div>
                            <div className="flex-1">
                              <Progress value={percentage} className="h-4" />
                            </div>
                            <div className="w-16 text-right text-sm">
                              {count} ({percentage}%)
                            </div>
                          </div>
                        )
                      })}
                      {Object.keys(demographicData.gender).length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No data</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Age Groups */}
                <Card>
                  <CardHeader>
                    <CardTitle>Age Groups</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(demographicData.ageGroups)
                        .filter(([_, count]) => count > 0)
                        .map(([age, count]) => {
                          const total = Object.values(demographicData.ageGroups).reduce((a, b) => a + b, 0)
                          const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                          return (
                            <div key={age} className="flex items-center gap-4">
                              <div className="w-24 text-sm font-medium">{age}</div>
                              <div className="flex-1">
                                <Progress value={percentage} className="h-4" />
                              </div>
                              <div className="w-16 text-right text-sm">
                                {count} ({percentage}%)
                              </div>
                            </div>
                          )
                        })}
                      {Object.values(demographicData.ageGroups).every(v => v === 0) && (
                        <p className="text-center text-muted-foreground py-4">No data</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Occupations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Occupations (Adults)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(demographicData.occupations)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([occupation, count]) => {
                          const total = Object.values(demographicData.occupations).reduce((a, b) => a + b, 0)
                          const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                          return (
                            <div key={occupation} className="flex items-center gap-4">
                              <div className="w-32 text-sm font-medium truncate">{occupation}</div>
                              <div className="flex-1">
                                <Progress value={percentage} className="h-4" />
                              </div>
                              <div className="w-16 text-right text-sm">
                                {count}
                              </div>
                            </div>
                          )
                        })}
                      {Object.keys(demographicData.occupations).length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No data</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Schools */}
                <Card>
                  <CardHeader>
                    <CardTitle>Schools (Kids)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(demographicData.schools)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([school, count]) => {
                          const total = Object.values(demographicData.schools).reduce((a, b) => a + b, 0)
                          const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                          return (
                            <div key={school} className="flex items-center gap-4">
                              <div className="w-32 text-sm font-medium truncate" title={school}>{school}</div>
                              <div className="flex-1">
                                <Progress value={percentage} className="h-4" />
                              </div>
                              <div className="w-16 text-right text-sm">
                                {count}
                              </div>
                            </div>
                          )
                        })}
                      {Object.keys(demographicData.schools).length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No data</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Knowledge Gaps Tab */}
          <TabsContent value="knowledge">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Knowledge Gap Analysis
                </CardTitle>
                <CardDescription>
                  Areas where users struggle most (sorted by lowest scores first)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {knowledgeData.map((k) => (
                    <div key={k.category} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{k.category}</span>
                        <Badge 
                          variant={k.avgScore >= 70 ? "default" : k.avgScore >= 50 ? "secondary" : "destructive"}
                        >
                          {k.avgScore}% correct
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div 
                            className={`h-4 rounded ${
                              k.avgScore >= 70 ? "bg-green-500" : k.avgScore >= 50 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${k.avgScore}%`, minWidth: "4px" }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Questions: {k.totalQuestions}</span>
                        <span>Correct: {k.correctAnswers}</span>
                        <span>Incorrect: {k.incorrectAnswers}</span>
                      </div>
                    </div>
                  ))}
                  {knowledgeData.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No assessment data available yet</p>
                  )}
                </div>

                {knowledgeData.length > 0 && (
                  <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-2">📊 Insights</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      {knowledgeData.filter(k => k.avgScore < 50).length > 0 && (
                        <li>
                          • <strong>Priority Focus Areas:</strong> {knowledgeData.filter(k => k.avgScore < 50).map(k => k.category).join(", ")}
                        </li>
                      )}
                      {knowledgeData.filter(k => k.avgScore >= 70).length > 0 && (
                        <li>
                          • <strong>Strong Knowledge Areas:</strong> {knowledgeData.filter(k => k.avgScore >= 70).map(k => k.category).join(", ")}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
      </div>
      </Tabs>
    </div>
  )
}
