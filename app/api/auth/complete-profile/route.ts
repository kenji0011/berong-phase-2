import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { ENGAGEMENT_POINTS } from '@/lib/constants'
import { signToken, verifyToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    // Get user from cookie
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('bfp_user')

    if (!userCookie) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const currentUser = await verifyToken(userCookie.value)
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const {
      gender,
      barangay,
      school,
      schoolOther,
      occupation,
      occupationOther,
      gradeLevel,
      dataPrivacyConsent,
      preTestAnswers,
    } = body

    if (!barangay) {
      return NextResponse.json(
        { success: false, error: 'Barangay is required' },
        { status: 400 }
      )
    }

    // Calculate pre-test score if answers provided
    let preTestScore = null
    let maxScore = 0
    
    if (preTestAnswers && Object.keys(preTestAnswers).length > 0) {
      const questionIds = Object.keys(preTestAnswers).map(id => parseInt(id))
      
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

      // Save user answers for knowledge gap analysis
      const answerRecords = questions.map((q: { id: number; correctAnswer: number }) => ({
        userId: currentUser.id,
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
          userId: currentUser.id,
          eventType: "preTest",
          points: ENGAGEMENT_POINTS.PRE_TEST_COMPLETED,
          eventData: { score: preTestScore, maxScore },
        },
      })
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        gender,
        barangay,
        school: school === "Other (Please specify)" ? schoolOther : school,
        schoolOther,
        occupation: occupation === "Other (Please specify)" ? occupationOther : occupation,
        occupationOther,
        gradeLevel,
        dataPrivacyConsent: dataPrivacyConsent || false,
        profileCompleted: true,
        preTestScore,
        preTestCompletedAt: preTestScore !== null ? new Date() : undefined,
        engagementPoints: {
          increment: preTestScore !== null ? ENGAGEMENT_POINTS.PRE_TEST_COMPLETED : 0,
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        age: true,
        isActive: true,
        createdAt: true,
        barangay: true,
        school: true,
        occupation: true,
        gender: true,
        gradeLevel: true,
        preTestScore: true,
        postTestScore: true,
        profileCompleted: true,
        engagementPoints: true,
      },
    })

    // Update cookie with new user data
    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      preTestScore,
      maxScore,
    })

    const newToken = await signToken(updatedUser as Record<string, unknown>)

    response.cookies.set('bfp_user', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Profile completion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to complete profile' },
      { status: 500 }
    )
  }
}
