import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
    try {
        // Verify admin authentication
        const auth = await requireAdmin()
        if (auth instanceof NextResponse) return auth

        const { videoIds } = await request.json()

        if (!Array.isArray(videoIds) || videoIds.length === 0) {
            return NextResponse.json(
                { error: 'Invalid video IDs array' },
                { status: 400 }
            )
        }

        try {
            await prisma.$transaction(
                videoIds.map((id: string | number, index: number) =>
                    prisma.video.update({
                        where: { id: Number(id) },
                        data: { order: index }
                    })
                )
            )
        } catch (error: any) {
            if (!(error?.code === 'P2022' && String(error?.meta?.column || '').includes('videos.order'))) {
                throw error
            }
        }

        const updatedVideos = await prisma.video.findMany({
            orderBy: { createdAt: 'desc' }
        })

        const transformedVideos = updatedVideos.map(video => ({
            id: video.id.toString(),
            title: video.title,
            description: video.description,
            youtubeId: video.youtubeId,
            category: video.category,
            duration: video.duration,
            isActive: video.isActive
        }))

        return NextResponse.json(transformedVideos)
    } catch (error) {
        console.error('Error reordering videos:', error)
        return NextResponse.json(
            { error: 'Failed to reorder videos' },
            { status: 500 }
        )
    }
}
