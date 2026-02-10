import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NotificationService } from '@/lib/notification-service'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()

    if (!body.title || !body.excerpt || !body.content || !body.authorId) {
      return NextResponse.json(
        { error: 'Title, excerpt, content, and author ID are required' },
        { status: 400 }
      )
    }

    const newBlog = await prisma.blogPost.create({
      data: {
        title: body.title,
        excerpt: body.excerpt,
        content: body.content,
        imageUrl: body.imageUrl || null,
        category: body.category,
        authorId: body.authorId,
        isPublished: true,
      }
    })

    // Create notification for users with access to this category
    await NotificationService.createNotification({
      title: `New Blog Post: ${body.title}`,
      message: `A new blog post "${body.title}" has been published in the ${body.category} section.`,
      type: 'blog',
      category: body.category
    })

    return NextResponse.json(newBlog)
  } catch (error) {
    console.error('Error creating blog post:', error)
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    )
  }
}
