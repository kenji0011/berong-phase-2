import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
    try {
        // Verify admin authentication
        const auth = await requireAdmin()
        if (auth instanceof NextResponse) return auth

        const { imageIds } = await request.json()

        if (!Array.isArray(imageIds) || imageIds.length === 0) {
            return NextResponse.json(
                { error: 'Invalid image IDs array' },
                { status: 400 }
            )
        }

        // Update order in transaction - each image gets its index as the order
        await prisma.$transaction(
            imageIds.map((id, index) =>
                prisma.carouselImage.update({
                    where: { id: Number(id) },
                    data: { order: index }
                })
            )
        )

        // Return updated images sorted by order
        const updatedImages = await prisma.carouselImage.findMany({
            orderBy: { order: 'asc' }
        })

        // Transform to match frontend interface
        const transformedImages = updatedImages.map(image => ({
            id: image.id.toString(),
            url: image.imageUrl,
            altText: image.altText,
            title: image.title,
            order: image.order
        }))

        return NextResponse.json(transformedImages)
    } catch (error) {
        console.error('Error reordering carousel images:', error)
        return NextResponse.json(
            { error: 'Failed to reorder carousel images' },
            { status: 500 }
        )
    }
}
