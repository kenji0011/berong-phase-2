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

    let newBlog: {
      id: number
      title: string
      excerpt: string
      content: string
      imageUrl: string | null
      category: string
      authorId: number
      isPublished: boolean
    }

    try {
      const created = await prisma.blogPost.create({
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
      newBlog = created
    } catch (error: any) {
      if (error?.code === 'P2022' && String(error?.meta?.column || '').includes('blog_posts.order')) {
        const rows = await prisma.$queryRaw<Array<{
          id: number
          title: string
          excerpt: string
          content: string
          imageUrl: string | null
          category: string
          authorId: number
          isPublished: boolean
        }>>`
          INSERT INTO blog_posts (title, excerpt, content, "imageUrl", category, "authorId", "isPublished", "createdAt", "updatedAt")
          VALUES (${body.title}, ${body.excerpt}, ${body.content}, ${body.imageUrl || null}, ${body.category}, ${Number(body.authorId)}, true, NOW(), NOW())
          RETURNING id, title, excerpt, content, "imageUrl", category, "authorId", "isPublished"
        `
        if (!rows.length) {
          throw new Error('Failed to create blog post')
        }
        newBlog = rows[0]
      } else {
        throw error
      }
    }

    // Create notification for users with access to this category
    console.log(`[AdminBlog] Creating notification for blog: ${body.title}, category: ${body.category}, id: ${newBlog.id}`);
    const notificationResult = await NotificationService.createNotification({
      title: `New Blog Post: ${body.title}`,
      message: `A new blog post "${body.title}" has been published in the ${body.category} section.`,
      type: 'blog',
      category: body.category,
      resourceId: newBlog.id
    })
    console.log('[AdminBlog] Notification result:', notificationResult);

    return NextResponse.json(newBlog)
  } catch (error) {
    console.error('Error creating blog post:', error)
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    )
  }
}
