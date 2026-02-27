import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NotificationService } from '@/lib/notification-service'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * Extracts YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - VIDEO_ID (direct ID)
 */
function extractYouTubeId(input: string): string {
  if (!input) return ''

  // Already just an ID (11 characters, alphanumeric with - and _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input
  }

  // Try to extract from URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  // Return as-is if no pattern matches (might be a custom format)
  return input.trim()
}

export async function GET() {
  try {
    // Verify admin authentication
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    let videos
    videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Transform the response to match the expected format
    const transformedVideos = videos.map(video => ({
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
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()

    if (!body.title || !body.youtubeId || !body.category) {
      return NextResponse.json(
        { error: 'Title, YouTube ID, and category are required' },
        { status: 400 }
      )
    }

    // Extract YouTube ID from URL or use directly
    const youtubeId = extractYouTubeId(body.youtubeId)

    let newVideo
    newVideo = await prisma.video.create({
      data: {
        title: body.title,
        description: body.description || '',
        youtubeId: youtubeId,
        category: body.category,
        duration: body.duration || '',
        isActive: body.isActive ?? true,
      }
    })

    // Transform the response to match the expected format
    const transformedVideo = {
      id: newVideo.id.toString(),
      title: newVideo.title,
      description: newVideo.description,
      youtubeId: newVideo.youtubeId,
      category: newVideo.category,
      duration: newVideo.duration,
      isActive: newVideo.isActive
    }

    // Create notification for users with access to this category
    await NotificationService.createNotification({
      title: `New Video: ${body.title}`,
      message: `A new video "${body.title}" has been published in the ${body.category} section.`,
      type: 'video',
      category: body.category,
      resourceId: newVideo.id
    })

    return NextResponse.json(transformedVideo)
  } catch (error) {
    console.error('Error creating video:', error)
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    )
  }
}
