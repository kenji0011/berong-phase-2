"use client"

import { useEffect, useState } from "react"
import DOMPurify from "dompurify"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle, Play, BookOpen, Star, Award } from "lucide-react"
import Link from "next/link"

interface ModuleSection {
  id: number
  title: string
  completed: boolean
  content?: string
  quiz?: {
    q: string
    options: string[]
    a: number
  }[]
}

interface KidsModule {
  id: number
  title: string
  description: string
  dayNumber: number
  content: string
  isActive: boolean
  progress: number
  isLocked: boolean
  isCompleted: boolean
  sections: ModuleSection[]
}

export default function ModulePage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [module, setModule] = useState<KidsModule | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number }>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)

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

    loadModule()
    setLoading(false)
  }, [isAuthenticated, user, router, params.id, isLoading])

  const loadModule = async () => {
    try {
      const response = await fetch('/api/kids/modules')
      if (response.ok) {
        const modules = await response.json()
        const foundModule = modules.find((m: KidsModule) => m.id === parseInt(params.id as string))
        if (foundModule) {
          setModule(foundModule)
        }
      }
    } catch (error) {
      console.error('Error loading module:', error)
    }
  }

  const markSectionCompleted = async (sectionId: number) => {
    if (!module || !user) return

    try {
      await fetch('/api/kids/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          moduleId: module.id,
          completed: true,
          score: 100
        }),
      })
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    setQuizAnswers({
      ...quizAnswers,
      [questionIndex]: answerIndex
    })
  }

  const submitQuiz = async () => {
    if (!module || !user) return

    try {
      const response = await fetch('/api/kids/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          moduleId: module.id,
          sectionId: currentSection + 1,
          answers: quizAnswers
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setQuizScore(result.result.score)
        setQuizSubmitted(true)

        // Mark section as completed
        await markSectionCompleted(currentSection + 1)
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading module...</p>
        </div>
      </div>
    )
  }

  if (!module) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">Module not found.</p>
              <Link href="/kids/dashboard">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const currentSectionData = module.sections[currentSection]

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/kids/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Module Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-blue-600">{module.title}</CardTitle>
                <CardDescription className="text-lg">{module.description}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Day {module.dayNumber}</div>
                <div className="text-xs text-gray-500">{module.progress}% Complete</div>
              </div>
            </div>
            <Progress value={module.progress} className="mt-4" />
          </CardHeader>
        </Card>

        {/* Section Navigation */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Module Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {module.sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(index)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${index === currentSection
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : section.completed
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {section.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-current" />
                  )}
                  <span className="text-sm font-medium">{section.title}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {currentSectionData.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSectionData.content ? (
              <div className="prose prose-blue max-w-none">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentSectionData.content) }} />
              </div>
            ) : currentSectionData.quiz ? (
              <div>
                {quizSubmitted ? (
                  <div className="text-center py-8">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                      <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-green-800 mb-2">Quiz Completed!</h3>
                      <p className="text-green-700">Your score: <strong>{quizScore}%</strong></p>
                    </div>
                    <Button onClick={() => router.push('/kids/dashboard')} className="bg-blue-600 hover:bg-blue-700">
                      Back to Dashboard
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-xl font-bold mb-4">Quiz Time!</h3>
                      <p className="text-gray-600 mb-6">Answer all questions to complete this section.</p>
                    </div>

                    <div className="space-y-6">
                      {currentSectionData.quiz.map((question, qIndex) => (
                        <div key={qIndex} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold mb-3">{qIndex + 1}. {question.q}</h4>
                          <div className="space-y-2">
                            {question.options.map((option, oIndex) => (
                              <button
                                key={oIndex}
                                onClick={() => handleQuizAnswer(qIndex, oIndex)}
                                className={`w-full text-left p-3 rounded border-2 transition-all ${quizAnswers[qIndex] === oIndex
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'
                                  }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 text-center">
                      <Button
                        onClick={submitQuiz}
                        disabled={Object.keys(quizAnswers).length !== currentSectionData.quiz.length}
                        className="bg-green-600 hover:bg-green-700 px-8"
                      >
                        Submit Quiz
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Content for this section is coming soon!</p>
              </div>
            )}

            {/* Section Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                Previous Section
              </Button>

              <Button
                onClick={() => setCurrentSection(Math.min(module.sections.length - 1, currentSection + 1))}
                disabled={currentSection === module.sections.length - 1}
              >
                Next Section
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
