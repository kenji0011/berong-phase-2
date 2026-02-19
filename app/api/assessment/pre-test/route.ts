import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { ENGAGEMENT_POINTS } from "@/lib/constants"
import { verifyToken, signToken } from '@/lib/jwt'
import { FALLBACK_ASSESSMENT_QUESTIONS, shuffleQuestionOptions } from '@/lib/assessment-fallback-questions'

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

        if (!answers || typeof answers !== "object" || Object.keys(answers).length === 0) {
            return NextResponse.json({ error: "Answers are required" }, { status: 400 })
        }

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userData.id },
            select: {
                id: true,
                preTestScore: true,
                preTestCompletedAt: true,
                profileCompleted: true,
            }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Check if already completed
        if (user.preTestScore !== null && user.preTestCompletedAt) {
            return NextResponse.json({
                error: "Pre-test already completed",
                preTestScore: user.preTestScore
            }, { status: 400 })
        }

        const questionIds = Object.keys(answers).map(id => parseInt(id))
        let score = 0
        let maxScore = 0
        const answerRecords: { questionId: number; selectedAnswer: number; isCorrect: boolean }[] = []

        // Check if we're using fallback questions (negative IDs)
        const usingFallback = questionIds.some(id => id < 0)

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
                const selectedAnswer = answers[question.id.toString()]
                const isCorrect = selectedAnswer === question.correctAnswer
                if (isCorrect) score++
                answerRecords.push({ questionId: question.id, selectedAnswer, isCorrect })
            }
        }

        if (maxScore === 0) {
            return NextResponse.json({ error: "No valid questions found" }, { status: 400 })
        }

        // Update user's pre-test score and save answers (only for DB questions)
        const updateData: any = {
            preTestScore: score,
            preTestCompletedAt: new Date(),
            engagementPoints: { increment: ENGAGEMENT_POINTS.PRE_TEST_COMPLETED },
        }

        await prisma.user.update({
            where: { id: user.id },
            data: updateData,
        })

        // Save individual answers if using DB questions
        if (!usingFallback) {
            await prisma.userAnswer.createMany({
                data: answerRecords.map(record => ({
                    userId: user.id,
                    questionId: record.questionId,
                    selectedAnswer: record.selectedAnswer,
                    isCorrect: record.isCorrect,
                    testType: "preTest",
                }))
            })
        }

        // Log engagement
        await prisma.engagementLog.create({
            data: {
                userId: user.id,
                eventType: "preTest",
                points: ENGAGEMENT_POINTS.PRE_TEST_COMPLETED,
                eventData: { score, maxScore },
            }
        })

        // Update the cookie with new user data
        const updatedUser = await prisma.user.findUnique({
            where: { id: user.id },
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

        const response = NextResponse.json({
            success: true,
            preTestScore: score,
            maxScore,
            message: `Pre-test completed! You scored ${score} out of ${maxScore}.`,
        })

        if (updatedUser) {
            const newToken = await signToken(updatedUser as Record<string, unknown>)
            response.cookies.set('bfp_user', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            })
        }

        return response
    } catch (error) {
        console.error("Pre-test submission error:", error)
        return NextResponse.json(
            { error: "Failed to submit pre-test" },
            { status: 500 }
        )
    }
}
