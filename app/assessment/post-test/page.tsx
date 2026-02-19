"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  ClipboardList,
  Target,
  Award
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getScoreRating } from "@/lib/constants"
import { ProtectedRoute } from "@/components/protected-route"

interface AssessmentQuestion {
  id: number
  question: string
  options: string[]
  category: string
}

interface EligibilityData {
  eligible: boolean
  alreadyCompleted?: boolean
  reason: string
  requirements?: {
    minEngagementPoints: number
    minModulesCompleted: number
    minQuizzesCompleted: number
  }
  current?: {
    engagementPoints: number
    modulesCompleted: number
    quizzesCompleted: number
  }
  progress?: {
    engagementPoints: number
    modulesCompleted: number
    quizzesCompleted: number
  }
  preTestScore?: number
  postTestScore?: number
  completedAt?: string
  isAdult?: boolean
}

interface PostTestResult {
  postTestScore: number
  maxScore: number
  preTestScore: number
  improvement: number
  improvementPercentage: number
  message: string
}

export default function PostTestPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<PostTestResult | null>(null)
  const [error, setError] = useState("")
  const [stage, setStage] = useState<"checking" | "not-eligible" | "ready" | "test" | "result">("checking")

  useEffect(() => {
    checkEligibility()
  }, [])

  const checkEligibility = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/assessment/post-test-eligibility")
      const data = await response.json()
      setEligibility(data)

      if (data.alreadyCompleted) {
        setResult({
          postTestScore: data.postTestScore,
          maxScore: 15,
          preTestScore: data.preTestScore || 0,
          improvement: data.postTestScore - (data.preTestScore || 0),
          improvementPercentage: data.preTestScore
            ? Math.round(((data.postTestScore - data.preTestScore) / data.preTestScore) * 100)
            : 100,
          message: "You have already completed the post-test"
        })
        setStage("result")
      } else if (data.eligible) {
        setStage("ready")
      } else {
        setStage("not-eligible")
      }
    } catch (err) {
      setError("Failed to check eligibility")
      setStage("not-eligible")
    } finally {
      setLoading(false)
    }
  }

  const startTest = async () => {
    try {
      setLoading(true)
      const role = user?.age && user.age < 18 ? "kid" : "adult"
      const response = await fetch(`/api/assessment/questions?role=${role}&limit=15`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
        setStage("test")
      } else {
        setError("Failed to load questions")
      }
    } catch (err) {
      setError("Failed to load questions")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (questionId: number, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }))
  }

  const submitTest = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError("Please answer all questions")
      return
    }

    try {
      setSubmitting(true)
      setError("")

      const response = await fetch("/api/assessment/post-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        setStage("result")
      } else {
        setError(data.error || "Failed to submit post-test")
      }
    } catch (err) {
      setError("Failed to submit post-test")
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading && stage === "checking") {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
            <p className="mt-4 text-muted-foreground">Checking eligibility...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Not eligible state
  if (stage === "not-eligible" && eligibility) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>

            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <CardTitle>Post-Test Locked</CardTitle>
                <CardDescription>{eligibility.reason}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-center text-muted-foreground">
                  Complete more learning activities to unlock the post-test assessment.
                </p>

                {eligibility.requirements && eligibility.progress && eligibility.current && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Requirements Progress</h4>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Engagement Points</span>
                          <span>{eligibility.current.engagementPoints} / {eligibility.requirements.minEngagementPoints}</span>
                        </div>
                        <Progress value={eligibility.progress.engagementPoints} className="h-2" />
                      </div>

                      {/* Only show modules requirement for kids */}
                      {!eligibility.isAdult && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Modules Completed</span>
                            <span>{eligibility.current.modulesCompleted} / {eligibility.requirements.minModulesCompleted}</span>
                          </div>
                          <Progress value={eligibility.progress.modulesCompleted} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(user?.age && user.age < 18 ? "/kids" : "/adult")}
                  >
                    Continue Learning
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Ready to start state
  if (stage === "ready") {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>

            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>Ready for Post-Test!</CardTitle>
                <CardDescription>
                  Congratulations! You&apos;ve completed enough activities to unlock the post-test.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {eligibility?.preTestScore !== undefined && (
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Your Pre-Test Score</p>
                    <p className="text-3xl font-bold text-orange-600">{eligibility.preTestScore} / 15</p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">About this assessment:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 15 questions about fire safety</li>
                    <li>• Same topics as the pre-test</li>
                    <li>• Compare your improvement after learning</li>
                    <li>• Can only be taken once</li>
                  </ul>
                </div>

                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertTitle>Goal</AlertTitle>
                  <AlertDescription>
                    Show how much your fire safety knowledge has improved!
                  </AlertDescription>
                </Alert>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={startTest}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Start Post-Test
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Test in progress
  if (stage === "test" && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex]

    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-8 px-4">
          <div className="max-w-2xl mx-auto">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline">Post-Test</Badge>
                  <span className="text-sm text-muted-foreground">
                    {Object.keys(answers).length} / {questions.length} answered
                  </span>
                </div>
                <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-orange-600 mb-2">{currentQuestion.category}</p>
                  <h3 className="text-lg font-medium">{currentQuestion.question}</h3>
                </div>

                <RadioGroup
                  value={answers[currentQuestion.id]?.toString() || ""}
                  onValueChange={(value) => handleAnswer(currentQuestion.id, parseInt(value))}
                >
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 border">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      disabled={answers[currentQuestion.id] === undefined}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={submitTest}
                      disabled={submitting || Object.keys(answers).length < questions.length}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit
                          <Check className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Question dots */}
                <div className="flex justify-center gap-2 flex-wrap">
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${currentQuestionIndex === idx
                        ? "bg-orange-500 text-white"
                        : answers[q.id] !== undefined
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Results state
  if (stage === "result" && result) {
    const postRating = getScoreRating(Math.round((result.postTestScore / result.maxScore) * 100))
    const preRating = getScoreRating(Math.round((result.preTestScore / result.maxScore) * 100))

    const ImprovementIcon = result.improvement > 0
      ? TrendingUp
      : result.improvement < 0
        ? TrendingDown
        : Minus

    const improvementColor = result.improvement > 0
      ? "text-green-600"
      : result.improvement < 0
        ? "text-red-600"
        : "text-gray-600"

    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
                <CardDescription>{result.message}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Score comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Pre-Test Score</p>
                    <p className="text-3xl font-bold" style={{ color: preRating.color }}>
                      {result.preTestScore}
                    </p>
                    <p className="text-xs text-muted-foreground">/ {result.maxScore}</p>
                    <Badge variant="outline" className="mt-2" style={{ color: preRating.color, borderColor: preRating.color }}>
                      {preRating.label}
                    </Badge>
                  </div>

                  <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <p className="text-sm text-muted-foreground mb-1">Post-Test Score</p>
                    <p className="text-3xl font-bold" style={{ color: postRating.color }}>
                      {result.postTestScore}
                    </p>
                    <p className="text-xs text-muted-foreground">/ {result.maxScore}</p>
                    <Badge className="mt-2" style={{ backgroundColor: postRating.color }}>
                      {postRating.label}
                    </Badge>
                  </div>
                </div>

                {/* Improvement indicator */}
                <div className="text-center p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg">
                  <ImprovementIcon className={`w-12 h-12 mx-auto mb-2 ${improvementColor}`} />
                  <p className="text-sm text-muted-foreground">Improvement</p>
                  <p className={`text-4xl font-bold ${improvementColor}`}>
                    {result.improvement > 0 ? "+" : ""}{result.improvement} points
                  </p>
                  {result.preTestScore > 0 && (
                    <p className={`text-sm ${improvementColor}`}>
                      ({result.improvement >= 0 ? "+" : ""}{result.improvementPercentage}%)
                    </p>
                  )}
                </div>

                {/* Certificate or recognition */}
                {result.postTestScore >= Math.round(result.maxScore * 0.8) && (
                  <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <Award className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <p className="font-medium text-green-800">Fire Safety Champion!</p>
                    <p className="text-sm text-green-600">
                      You&apos;ve demonstrated excellent fire safety knowledge.
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(user?.age && user.age < 18 ? "/kids" : "/adult")}
                  >
                    Back to Home
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => router.push("/profile")}
                  >
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Fallback
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    </ProtectedRoute>
  )
}
