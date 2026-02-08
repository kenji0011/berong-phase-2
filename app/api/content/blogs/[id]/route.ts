import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid blog post ID' },
        { status: 400 }
      )
    }

    const blogPost = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            name: true
          }
        }
      }
    })

    if (!blogPost || !blogPost.isPublished) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Transform the data to return author name as string
    const transformedBlog = {
      ...blogPost,
      author: blogPost.author.name
    }

    return NextResponse.json(transformedBlog)
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    )
  }
}
