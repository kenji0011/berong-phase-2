import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
    try {
        // Verify admin authentication
        const auth = await requireAdmin()
        if (auth instanceof NextResponse) return auth

        const { blogIds } = await request.json()

        if (!Array.isArray(blogIds) || blogIds.length === 0) {
            return NextResponse.json(
                { error: 'Invalid blog IDs array' },
                { status: 400 }
            )
        }

        // Note: order column not available in production DB, reorder is a no-op
        // Just return the blogs sorted by createdAt

        const updatedBlogs = await prisma.blogPost.findMany({
            where: { isPublished: true },
            include: {
                author: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const transformedBlogs = updatedBlogs.map(blog => ({
            ...blog,
            author: blog.author.name
        }))

        return NextResponse.json(transformedBlogs)
    } catch (error) {
        console.error('Error reordering blog posts:', error)
        return NextResponse.json(
            { error: 'Failed to reorder blog posts' },
            { status: 500 }
        )
    }
}
