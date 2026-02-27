import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    let videos
    try {
      videos = await prisma.video.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' }
      })
    } catch (error: any) {
      if (error?.code === 'P2022' && String(error?.meta?.column || '').includes('videos.order')) {
        videos = await prisma.video.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        })
      } else {
        throw error
      }
    }

    return NextResponse.json(videos)
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}
