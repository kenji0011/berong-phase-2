"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Lock, CheckCircle, Star, Trophy, Flame, BookOpen } from "lucide-react"
import Link from "next/link"

interface KidsModule {
  id: number
  title: string
  description: string
  dayNumber: number
  emoji: string
  isLocked: boolean
  isCompleted: boolean
  progress: number
}

export default function ModulesPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [modules, setModules] = useState<KidsModule[]>([])
  const [overallProgress, setOverallProgress] = useState(0)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push("/auth")
      return
    }

    if (!user?.permissions.accessKids && user?.role !== 'admin') {
      router.push("/")
      return
    }

    loadModules()
  }, [isAuthenticated, user, router, isLoading])

  const loadModules = async () => {
    try {
      const response = await fetch('/api/kids/modules')
      if (response.ok) {
        const data = await response.json()
        setModules(data)

        // Calculate overall progress from the data
        const completedCount = data.filter((m: KidsModule) => m.isCompleted).length
        const totalCount = data.length
        if (totalCount > 0) {
          setOverallProgress((completedCount / totalCount) * 100)
        }
      }
    } catch (error) {
      console.error("Failed to load modules", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-semibold">Loading your lessons...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/kids/dashboard">
          <Button variant="ghost" className="mb-6 hover:bg-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header Card */}
        <Card className="mb-8 border-4 border-blue-500 bg-gradient-to-r from-blue-100 to-purple-100">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-5xl">🎓</div>
              <div>
                <CardTitle className="text-3xl text-blue-800">Junior Fire Marshal Training</CardTitle>
                <CardDescription className="text-lg text-blue-600">
                  Complete all modules to earn your certificate!
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span>Your Progress</span>
                <span>{Math.round(overallProgress)}% Complete</span>
              </div>
              <Progress value={overallProgress} className="h-4" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-black text-blue-600">
                  {modules.filter(m => m.isCompleted).length}
                </div>
                <div className="text-sm text-gray-600 font-semibold">Completed</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-black text-orange-600">
                  {modules.filter(m => !m.isLocked && !m.isCompleted).length}
                </div>
                <div className="text-sm text-gray-600 font-semibold">In Progress</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-black text-gray-400">
                  {modules.filter(m => m.isLocked).length}
                </div>
                <div className="text-sm text-gray-600 font-semibold">Locked</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-gray-800 mb-4">📚 Learning Modules</h2>

          {modules.map((module) => (
            <Card
              key={module.id}
              className={`overflow-hidden transition-all hover:shadow-xl ${module.isCompleted
                ? 'border-4 border-green-500 bg-green-50'
                : module.isLocked
                  ? 'border-4 border-gray-300 bg-gray-50 opacity-70'
                  : 'border-4 border-blue-400 bg-white hover:border-blue-600'
                }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Module Icon */}
                  <div className={`text-6xl flex-shrink-0 ${module.isLocked ? 'grayscale' : ''}`}>
                    {module.isLocked ? '🔒' : module.emoji}
                  </div>

                  {/* Module Info */}
                  <div className="flex-grow">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-2xl font-black text-gray-800 mb-1">
                          {module.title}
                        </h3>
                        <p className="text-gray-600">{module.description}</p>
                      </div>

                      {/* Status Badge */}
                      {module.isCompleted && (
                        <Badge className="bg-green-500 text-white font-bold px-4 py-2 text-sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Completed!
                        </Badge>
                      )}
                      {!module.isCompleted && !module.isLocked && (
                        <Badge className="bg-blue-500 text-white font-bold px-4 py-2 text-sm animate-pulse">
                          <Star className="h-4 w-4 mr-1" />
                          Available!
                        </Badge>
                      )}
                      {module.isLocked && (
                        <Badge className="bg-gray-400 text-white font-bold px-4 py-2 text-sm">
                          <Lock className="h-4 w-4 mr-1" />
                          Locked
                        </Badge>
                      )}
                    </div>

                    {/* Progress Bar for in-progress modules */}
                    {!module.isCompleted && !module.isLocked && module.progress > 0 && (
                      <div className="mb-3">
                        <Progress value={module.progress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">{module.progress}% complete</p>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="mt-4">
                      {module.isCompleted ? (
                        <Link href={`/kids/safescape/${module.dayNumber}`}>
                          <Button variant="outline" className="font-bold">
                            Review Module
                          </Button>
                        </Link>
                      ) : module.isLocked ? (
                        <Button disabled className="font-bold bg-gray-300">
                          <Lock className="h-4 w-4 mr-2" />
                          Complete Previous Modules
                        </Button>
                      ) : (
                        <Link href={`/kids/safescape/${module.dayNumber}`}>
                          <Button className="bg-blue-600 hover:bg-blue-700 font-bold text-lg px-8">
                            {module.progress > 0 ? 'Continue Learning' : 'Start Module'}
                            <BookOpen className="h-5 w-5 ml-2" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Motivational Footer */}
        <Card className="mt-8 bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-orange-400">
          <CardContent className="p-6 text-center">
            <div className="text-5xl mb-3">🔥</div>
            <h3 className="text-2xl font-black text-orange-800 mb-2">Keep Up the Great Work!</h3>
            <p className="text-orange-700 font-semibold">
              Every lesson you complete makes you a better fire safety hero! 🦸‍♂️
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
