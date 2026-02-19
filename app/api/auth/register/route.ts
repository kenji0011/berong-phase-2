import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { ENGAGEMENT_POINTS } from '@/lib/constants'
import { signToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      username,
      password,
      firstName,
      lastName,
      middleName,
      email,
      age,
      // New enhanced fields
      gender,
      barangay,
      school,
      schoolOther,
      occupation,
      occupationOther,
      gradeLevel,
      dataPrivacyConsent,
      preTestAnswers, // Record<questionId, selectedAnswerIndex>
    } = body

    if (!username || !password || !firstName || !lastName || !age) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    const ageNumber = parseInt(age, 10)
    if (isNaN(ageNumber) || ageNumber < 1 || ageNumber > 120) {
      return NextResponse.json(
        { success: false, error: 'Invalid age provided' },
        { status: 400 }
      )
    }

    // Calculate pre-test score if answers provided
    let preTestScore = null
    let maxScore = 0

    if (preTestAnswers && Object.keys(preTestAnswers).length > 0) {
      const questionIds = Object.keys(preTestAnswers).map(id => parseInt(id))

      // Fetch correct answers from database
      const questions = await prisma.assessmentQuestion.findMany({
        where: {
          id: { in: questionIds },
        },
        select: {
          id: true,
          correctAnswer: true,
        },
      })

      maxScore = questions.length
      let correctCount = 0

      for (const question of questions) {
        const userAnswer = preTestAnswers[question.id.toString()]
        if (userAnswer === question.correctAnswer) {
          correctCount++
        }
      }

      preTestScore = correctCount
    }

    // Register user with enhanced fields
    const result = await registerUser(username, password, firstName, lastName, ageNumber, {
      middleName,
      email,
      gender,
      barangay,
      school: school === "Other (Please specify)" ? schoolOther : school,
      schoolOther,
      occupation: occupation === "Other (Please specify)" ? occupationOther : occupation,
      occupationOther,
      gradeLevel,
      dataPrivacyConsent: dataPrivacyConsent || false,
      profileCompleted: barangay ? true : false,
      preTestScore,
      preTestCompletedAt: preTestScore !== null ? new Date() : null,
      engagementPoints: preTestScore !== null ? ENGAGEMENT_POINTS.PRE_TEST_COMPLETED : 0,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Save user answers for knowledge gap analysis
    if (preTestAnswers && result.user?.id) {
      const questionIds = Object.keys(preTestAnswers).map(id => parseInt(id))
      const questions = await prisma.assessmentQuestion.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, correctAnswer: true },
      })

      const answerRecords = questions.map(q => ({
        userId: result.user!.id,
        questionId: q.id,
        selectedAnswer: preTestAnswers[q.id.toString()],
        isCorrect: preTestAnswers[q.id.toString()] === q.correctAnswer,
        testType: "preTest",
      }))

      await prisma.userAnswer.createMany({
        data: answerRecords,
      })

      // Log engagement
      await prisma.engagementLog.create({
        data: {
          userId: result.user!.id,
          eventType: "preTest",
          points: ENGAGEMENT_POINTS.PRE_TEST_COMPLETED,
          eventData: { score: preTestScore, maxScore },
        },
      })
    }

    // Set secure cookie
    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
        preTestScore,
        maxScore,
      },
      { status: 201 }
    )

    const token = await signToken(result.user as Record<string, unknown>)

    response.cookies.set('bfp_user', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
