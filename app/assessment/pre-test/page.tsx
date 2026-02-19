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
    Loader2,
    ClipboardList,
    BookOpen,
    Flame,
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

interface PreTestResult {
    preTestScore: number
    maxScore: number
    message: string
}

export default function PreTestPage() {
    const { user, refreshUser } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<number, number>>({})
    const [result, setResult] = useState<PreTestResult | null>(null)
    const [error, setError] = useState("")
    const [stage, setStage] = useState<"checking" | "already-done" | "ready" | "test" | "result">("checking")

    useEffect(() => {
        checkStatus()
    }, [])

    const checkStatus = async () => {
        try {
            setLoading(true)
            // Check if user already completed pre-test
            if (user?.preTestScore !== null && user?.preTestScore !== undefined) {
                setResult({
                    preTestScore: user.preTestScore,
                    maxScore: 15,
                    message: "You have already completed the pre-test",
                })
                setStage("already-done")
            } else {
                setStage("ready")
            }
        } catch (err) {
            setError("Failed to check status")
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
                if (data.questions && data.questions.length > 0) {
                    setQuestions(data.questions)
                    setStage("test")
                } else {
                    setError("No questions available. Please try again later.")
                }
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

            const response = await fetch("/api/assessment/pre-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers }),
            })

            const data = await response.json()

            if (data.success) {
                setResult(data)
                setStage("result")
                // Refresh user context so preTestScore is updated
                if (refreshUser) {
                    await refreshUser()
                }
            } else {
                setError(data.error || "Failed to submit pre-test")
            }
        } catch (err) {
            setError("Failed to submit pre-test")
        } finally {
            setSubmitting(false)
        }
    }

    // Loading state
    if (loading && stage === "checking") {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
                        <p className="mt-4 text-muted-foreground">Loading...</p>
                    </div>
                </div>
            </ProtectedRoute>
        )
    }

    // Already completed state
    if (stage === "already-done" && result) {
        const rating = getScoreRating(Math.round((result.preTestScore / result.maxScore) * 100))
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
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
                                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <Check className="w-8 h-8 text-blue-600" />
                                </div>
                                <CardTitle>Pre-Test Already Completed</CardTitle>
                                <CardDescription>You have already taken the pre-test assessment</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Your Pre-Test Score</p>
                                    <p className="text-3xl font-bold" style={{ color: rating.color }}>
                                        {result.preTestScore}
                                    </p>
                                    <p className="text-xs text-muted-foreground">/ {result.maxScore}</p>
                                    <Badge className="mt-2" style={{ backgroundColor: rating.color }}>
                                        {rating.label}
                                    </Badge>
                                </div>

                                <p className="text-center text-muted-foreground text-sm">
                                    Continue learning on the platform. Once you&apos;ve gained enough experience, you can take the post-test to measure your improvement!
                                </p>

                                <div className="flex gap-4">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => router.push(user?.age && user.age < 18 ? "/kids" : "/adult")}
                                    >
                                        Continue Learning
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

    // Ready to start state
    if (stage === "ready") {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
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
                                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <ClipboardList className="w-8 h-8 text-blue-600" />
                                </div>
                                <CardTitle>Pre-Test Assessment</CardTitle>
                                <CardDescription>
                                    Test your current fire safety knowledge before you begin learning
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <h4 className="font-medium">About this assessment:</h4>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        <li className="flex items-start gap-2">
                                            <Flame className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                                            15 questions about fire safety knowledge
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <BookOpen className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                                            Covers prevention, emergency response, and safety awareness
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <ClipboardList className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                                            Your score will be compared to the post-test after training
                                        </li>
                                    </ul>
                                </div>

                                <Alert>
                                    <BookOpen className="h-4 w-4" />
                                    <AlertTitle>Baseline Assessment</AlertTitle>
                                    <AlertDescription>
                                        This pre-test measures your current fire safety knowledge. After completing learning modules and activities, you&apos;ll take a post-test to see how much you&apos;ve improved!
                                    </AlertDescription>
                                </Alert>

                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
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
                                            Start Pre-Test
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
                <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
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
                                    <Badge variant="outline" className="border-blue-200 text-blue-700">Pre-Test</Badge>
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
                                    <p className="text-sm text-blue-600 mb-2">{currentQuestion.category}</p>
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
                                            className="bg-blue-600 hover:bg-blue-700"
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
                                                ? "bg-blue-500 text-white"
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
        const rating = getScoreRating(Math.round((result.preTestScore / result.maxScore) * 100))

        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
                    <div className="max-w-2xl mx-auto">
                        <Card>
                            <CardHeader className="text-center">
                                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                                    <ClipboardList className="w-10 h-10 text-white" />
                                </div>
                                <CardTitle className="text-2xl">Pre-Test Complete!</CardTitle>
                                <CardDescription>{result.message}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Score display */}
                                <div className="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                                    <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                                    <p className="text-4xl font-bold" style={{ color: rating.color }}>
                                        {result.preTestScore}
                                    </p>
                                    <p className="text-sm text-muted-foreground">/ {result.maxScore}</p>
                                    <Badge className="mt-2" style={{ backgroundColor: rating.color }}>
                                        {rating.label}
                                    </Badge>
                                </div>

                                {/* Next steps */}
                                <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg">
                                    <h4 className="font-medium text-slate-800 mb-2">🎯 What&apos;s Next?</h4>
                                    <ul className="text-sm text-slate-600 space-y-1">
                                        <li>• Explore the learning modules to improve your knowledge</li>
                                        <li>• Watch safety videos and take quizzes to earn engagement points</li>
                                        <li>• Once you&apos;re ready, take the post-test to measure your improvement</li>
                                    </ul>
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => router.push("/")}
                                    >
                                        Back to Home
                                    </Button>
                                    <Button
                                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                                        onClick={() => router.push(user?.age && user.age < 18 ? "/kids" : "/adult")}
                                    >
                                        Start Learning
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
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        </ProtectedRoute>
    )
}
