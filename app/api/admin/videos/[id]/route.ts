import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      )
    }

    await prisma.video.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Video deleted successfully' })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: idParam } = await params
    const id = parseInt(idParam)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        youtubeId: body.youtubeId,
        category: body.category,
        duration: body.duration,
        isActive: body.isActive,
      }
    })

    // Transform the response to match the expected format
    const transformedVideo = {
      id: updatedVideo.id.toString(),
      title: updatedVideo.title,
      description: updatedVideo.description,
      youtubeId: updatedVideo.youtubeId,
      category: updatedVideo.category,
      duration: updatedVideo.duration,
      isActive: updatedVideo.isActive
    }

    return NextResponse.json(transformedVideo)
  } catch (error) {
    console.error('Error updating video:', error)
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    )
  }
}
