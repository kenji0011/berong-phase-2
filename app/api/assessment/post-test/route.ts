import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { POST_TEST_UNLOCK_THRESHOLDS, ENGAGEMENT_POINTS } from "@/lib/constants"
import { verifyToken } from '@/lib/jwt'
import { FALLBACK_ASSESSMENT_QUESTIONS } from '@/lib/assessment-fallback-questions'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("bfp_user")

    if (!userCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userData = await verifyToken(userCookie.value)
    if (!userData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }
    const body = await request.json()
    const { answers } = body // { questionId: answerIndex }

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Answers are required" }, { status: 400 })
    }

    // Verify user exists and check eligibility
    const user = await prisma.user.findUnique({
      where: { id: userData.id },
      select: {
        id: true,
        age: true,
        engagementPoints: true,
        preTestScore: true,
        postTestScore: true,
        postTestCompletedAt: true,
        profileCompleted: true,
      }
    })

    // Determine if user is adult (age >= 18) - adults don't need modules
    const isAdult = (user?.age ?? 18) >= 18

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if profile is complete
    if (!user.profileCompleted) {
      return NextResponse.json({ error: "Please complete your profile first" }, { status: 400 })
    }

    // Check if already completed
    if (user.postTestScore !== null && user.postTestCompletedAt) {
      return NextResponse.json({
        error: "Post-test already completed",
        postTestScore: user.postTestScore
      }, { status: 400 })
    }

    // Calculate engagement stats from logs for eligibility check
    const engagementStats = await prisma.engagementLog.groupBy({
      by: ["eventType"],
      where: { userId: userData.id },
      _count: { eventType: true },
    })

    const statsMap: Record<string, number> = {}
    engagementStats.forEach(stat => {
      statsMap[stat.eventType] = stat._count.eventType
    })

    const modulesCompleted = statsMap["module"] || 0
    const quizzesCompleted = statsMap["quiz"] || 0

    // Verify eligibility - adults only need engagement points
    const eligible = isAdult
      ? (user.engagementPoints || 0) >= POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS
      : (user.engagementPoints || 0) >= POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS &&
      modulesCompleted >= POST_TEST_UNLOCK_THRESHOLDS.MIN_MODULES_COMPLETED &&
      quizzesCompleted >= POST_TEST_UNLOCK_THRESHOLDS.MIN_QUIZZES_PASSED

    if (!eligible) {
      return NextResponse.json({
        error: "You have not met the requirements to take the post-test"
      }, { status: 403 })
    }

    const questionIds = Object.keys(answers).map(id => parseInt(id))

    // Check if we're using fallback questions (negative IDs)
    const usingFallback = questionIds.some(id => id < 0)

    let score = 0
    let maxScore = 0
    const answerRecords: { questionId: number; selectedAnswer: number; isCorrect: boolean }[] = []

    if (usingFallback) {
      // Grade using fallback questions
      for (const qId of questionIds) {
        const fallbackQ = FALLBACK_ASSESSMENT_QUESTIONS.find(q => q.id === qId)
        if (fallbackQ) {
          maxScore++
          const selectedAnswer = answers[qId.toString()]
          const isCorrect = selectedAnswer === fallbackQ.correctAnswer
          if (isCorrect) score++
          answerRecords.push({ questionId: qId, selectedAnswer, isCorrect })
        }
      }
    } else {
      // Grade using database questions
      const questions = await prisma.assessmentQuestion.findMany({
        where: {
          id: { in: questionIds },
          isActive: true,
        }
      })

      maxScore = questions.length

      for (const question of questions) {
        const selectedAnswer = answers[question.id]
        const isCorrect = selectedAnswer === question.correctAnswer
        if (isCorrect) score++
        answerRecords.push({
          questionId: question.id,
          selectedAnswer,
          isCorrect,
        })
      }
    }

    if (maxScore === 0) {
      return NextResponse.json({ error: "No valid questions found" }, { status: 400 })
    }

    // Save answers and update user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactionOps: any[] = [
      // Update user's post-test score
      prisma.user.update({
        where: { id: user.id },
        data: {
          postTestScore: score,
          postTestCompletedAt: new Date(),
          engagementPoints: { increment: ENGAGEMENT_POINTS.POST_TEST_COMPLETED },
        }
      }),
      // Log engagement
      prisma.engagementLog.create({
        data: {
          userId: user.id,
          eventType: "postTest",
          points: ENGAGEMENT_POINTS.POST_TEST_COMPLETED,
          eventData: { score, maxScore },
        }
      })
    ]

    // Only save individual answers for DB questions (fallback IDs are negative)
    if (!usingFallback) {
      transactionOps.unshift(
        prisma.userAnswer.createMany({
          data: answerRecords.map(record => ({
            userId: user.id,
            questionId: record.questionId,
            selectedAnswer: record.selectedAnswer,
            isCorrect: record.isCorrect,
            testType: "postTest",
          }))
        })
      )
    }

    await prisma.$transaction(transactionOps)

    // Calculate improvement
    const preTestScore = user.preTestScore || 0
    const improvement = score - preTestScore
    const improvementPercentage = preTestScore > 0
      ? Math.round(((score - preTestScore) / preTestScore) * 100)
      : score > 0 ? 100 : 0

    return NextResponse.json({
      success: true,
      postTestScore: score,
      maxScore,
      preTestScore,
      improvement,
      improvementPercentage,
      message: improvement > 0
        ? `Great job! You improved by ${improvement} points!`
        : improvement === 0
          ? "You maintained your score. Keep learning!"
          : "Keep practicing to improve your fire safety knowledge!",
    })
  } catch (error) {
    console.error("Post-test submission error:", error)
    return NextResponse.json(
      { error: "Failed to submit post-test" },
      { status: 500 }
    )
  }
}
