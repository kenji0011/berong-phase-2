"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Trophy, Star, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { logEngagement } from "@/lib/engagement-tracker"

interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "What should you do if your clothes catch on fire?",
    options: ["Run fast", "Stop, Drop, and Roll", "Jump up and down", "Hide under a bed"],
    correctAnswer: 1,
    explanation: "Stop, Drop, and Roll helps put out the flames on your clothes!",
  },
  {
    id: 2,
    question: "What number should you call in a fire emergency?",
    options: ["123", "911", "555", "999"],
    correctAnswer: 1,
    explanation: "Call 911 for fire emergencies in the Philippines!",
  },
  {
    id: 3,
    question: "Where should you go if there's a fire in your house?",
    options: ["Hide in closet", "Go under bed", "Get out quickly", "Look for toys"],
    correctAnswer: 2,
    explanation: "Always get out of the house quickly and stay out!",
  },
  {
    id: 4,
    question: "How should you move through smoke?",
    options: ["Stand tall", "Crawl low", "Jump high", "Walk normally"],
    correctAnswer: 1,
    explanation: "Crawl low under smoke because cleaner air is near the floor!",
  },
  {
    id: 5,
    question: "What should you do if you find matches or lighters?",
    options: ["Play with them", "Hide them", "Tell an adult", "Light them"],
    correctAnswer: 2,
    explanation: "Always tell an adult if you find matches or lighters!",
  },
]

export default function QuizPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [quizComplete, setQuizComplete] = useState(false)

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

    setLoading(false)
  }, [isAuthenticated, user, router, isLoading])

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return
    setSelectedAnswer(answerIndex)
  }

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return

    setShowResult(true)
    if (selectedAnswer === quizQuestions[currentQuestion].correctAnswer) {
      setScore(score + 1)
    }
  }

  const hasTrackedQuiz = useRef(false)

  const handleNextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      setQuizComplete(true)
      // Log quiz completion for engagement points
      if (!hasTrackedQuiz.current) {
        hasTrackedQuiz.current = true
        logEngagement({
          activityType: "QUIZ_COMPLETION",
          metadata: {
            quizId: "kids-fire-safety-quiz",
            quizName: "Fire Safety Quiz",
            score: score + (selectedAnswer === quizQuestions[currentQuestion].correctAnswer ? 1 : 0),
            maxScore: quizQuestions.length
          }
        })
      }
    }
  }

  const handleRestartQuiz = () => {
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setScore(0)
    setQuizComplete(false)
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

  if (quizComplete) {
    const percentage = (score / quizQuestions.length) * 100
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-4 border-secondary">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Trophy className="h-20 w-20 text-yellow-400 fill-yellow-400" />
              </div>
              <CardTitle className="text-3xl text-secondary mb-2">Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-2xl font-bold text-foreground mb-4">
                You scored {score} out of {quizQuestions.length}!
              </p>
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-8 w-8 ${percentage >= (i + 1) * 20 ? "text-chart-4 fill-chart-4" : "text-muted"}`}
                  />
                ))}
              </div>
              <p className="text-lg text-foreground mb-6">
                {percentage >= 80
                  ? "Amazing! You're a fire safety hero!"
                  : percentage >= 60
                    ? "Great job! Keep learning!"
                    : "Good try! Practice makes perfect!"}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleRestartQuiz}
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  Try Again
                </Button>
                <Link href="/kids">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Activities
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const question = quizQuestions[currentQuestion]

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/kids">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Activities
          </Button>
        </Link>

        <Card className="border-4 border-secondary">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-muted-foreground">
                Question {currentQuestion + 1} of {quizQuestions.length}
              </span>
              <span className="text-sm font-semibold text-secondary">Score: {score}</span>
            </div>
            <CardTitle className="text-2xl text-foreground">{question.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${selectedAnswer === index
                    ? showResult
                      ? index === question.correctAnswer
                        ? "border-chart-4 bg-chart-4/10"
                        : "border-destructive bg-destructive/10"
                      : "border-secondary bg-secondary/10"
                    : showResult && index === question.correctAnswer
                      ? "border-chart-4 bg-chart-4/10"
                      : "border-border hover:border-secondary hover:bg-secondary/5"
                    } ${showResult ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{option}</span>
                    {showResult && (
                      <>
                        {index === question.correctAnswer && <CheckCircle className="h-5 w-5 text-chart-4" />}
                        {selectedAnswer === index && index !== question.correctAnswer && (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {showResult && (
              <Alert className="mb-6 border-accent bg-accent/10">
                <AlertDescription className="text-foreground">
                  <strong>{selectedAnswer === question.correctAnswer ? "Correct!" : "Not quite right."}</strong>{" "}
                  {question.explanation}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              {!showResult ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNextQuestion} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {currentQuestion < quizQuestions.length - 1 ? "Next Question" : "See Results"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
