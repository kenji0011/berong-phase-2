import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let blogPosts
    try {
      blogPosts = await prisma.blogPost.findMany({
        where: { isPublished: true },
        include: {
          author: {
            select: {
              name: true
            }
          }
        },
        orderBy: { order: 'asc' }
      })
    } catch (error: any) {
      if (error?.code === 'P2022' && String(error?.meta?.column || '').includes('blog_posts.order')) {
        blogPosts = await prisma.blogPost.findMany({
          where: { isPublished: true },
          include: {
            author: {
              select: {
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
      } else {
        throw error
      }
    }

    // Transform the data to return author name as string instead of object
    const transformedBlogs = blogPosts.map(blog => ({
      ...blog,
      author: blog.author.name // Extract just the name as string
    }))

    return NextResponse.json(transformedBlogs)
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    )
  }
}
