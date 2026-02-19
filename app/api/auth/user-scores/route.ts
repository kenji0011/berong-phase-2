import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'

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

        // Count total questions for each test type to calculate max scores
        const preTestCount = await prisma.assessmentQuestion.count({
            where: { type: 'preTest', isActive: true },
        })

        const postTestCount = await prisma.assessmentQuestion.count({
            where: { type: 'postTest', isActive: true },
        })

        return NextResponse.json({
            success: true,
            scores: {
                preTestScore: user.preTestScore,
                preTestMax: preTestCount,
                preTestCompletedAt: user.preTestCompletedAt,
                postTestScore: user.postTestScore,
                postTestMax: postTestCount,
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
