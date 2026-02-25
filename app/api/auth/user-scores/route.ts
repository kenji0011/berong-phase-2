import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { FALLBACK_ASSESSMENT_QUESTIONS } from '@/lib/assessment-fallback-questions'

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const userCookie = cookieStore.get('bfp_user')
        if (!userCookie) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
        }

        const currentUser = await verifyToken(userCookie.value)
        if (!currentUser) {
            return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
        }

        // Fetch fresh scores directly from DB
        const user = await prisma.user.findUnique({
            where: { id: currentUser.id },
            select: {
                preTestScore: true,
                postTestScore: true,
                preTestCompletedAt: true,
                postTestCompletedAt: true,
                engagementPoints: true,
            },
        })

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
        }

        // Determine user's role for filtering questions
        const userRole = currentUser.role || 'adult'
        const effectiveRole = userRole === 'professional' ? 'adult' : userRole === 'admin' ? 'adult' : userRole

        // Fetch all active questions and filter by role (forRoles is a JSON array, not filterable by Prisma)
        const allQuestions = await prisma.assessmentQuestion.findMany({
            where: { isActive: true },
            select: { type: true, forRoles: true },
        })

        // Filter by role (same logic as /api/assessment/questions)
        const roleQuestions = allQuestions.filter(q => {
            const roles = q.forRoles as string[]
            return roles && roles.includes(effectiveRole)
        })

        let preTestMax = roleQuestions.filter(q => q.type === 'preTest').length
        let postTestMax = roleQuestions.filter(q => q.type === 'postTest').length

        // Fallback: if DB has no questions for a test type but user has a score,
        // they took the test using hardcoded fallback questions. Use fallback count as max.
        const fallbackForRole = FALLBACK_ASSESSMENT_QUESTIONS.filter(q =>
            q.forRoles.includes(effectiveRole)
        ).length

        if (preTestMax === 0 && user.preTestScore !== null) {
            preTestMax = fallbackForRole
        }
        if (postTestMax === 0 && user.postTestScore !== null) {
            postTestMax = fallbackForRole
        }

        return NextResponse.json({
            success: true,
            scores: {
                preTestScore: user.preTestScore,
                preTestMax,
                preTestCompletedAt: user.preTestCompletedAt,
                postTestScore: user.postTestScore,
                postTestMax,
                postTestCompletedAt: user.postTestCompletedAt,
                engagementPoints: user.engagementPoints,
            },
        })
    } catch (error: any) {
        console.error('Fetch scores error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch scores' },
            { status: 500 }
        )
    }
}
