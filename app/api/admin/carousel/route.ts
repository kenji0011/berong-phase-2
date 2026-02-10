import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Verify admin authentication
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const carouselImages = await prisma.carouselImage.findMany({
      orderBy: { order: 'asc' }
    })

    // Transform the database response to match the component interface
    const transformedImages = carouselImages.map(image => ({
      id: image.id.toString(), // Ensure id is a string
      url: image.imageUrl,     // Map imageUrl to url
      altText: image.altText,
      title: image.title
    }))

    return NextResponse.json(transformedImages)
  } catch (error) {
    console.error('Error fetching carousel images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch carousel images' },
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

    if (!body.title || !body.alt || !body.url) {
      return NextResponse.json(
        { error: 'Title, alt text, and URL are required' },
        { status: 400 }
      )
    }

    // Get the highest order number to assign next order
    const maxOrderImage = await prisma.carouselImage.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true }
    })
    const nextOrder = (maxOrderImage?.order ?? -1) + 1

    const newCarousel = await prisma.carouselImage.create({
      data: {
        title: body.title,
        altText: body.alt,
        imageUrl: body.url, // Map the url from request to imageUrl in DB
        order: body.order ?? nextOrder, // Use provided order or auto-assign next
        isActive: body.isActive ?? true,
      }
    })

    // Transform the response to match the component interface
    const transformedCarousel = {
      id: newCarousel.id.toString(),
      url: newCarousel.imageUrl,
      altText: newCarousel.altText,
      title: newCarousel.title
    }

    return NextResponse.json(transformedCarousel)
  } catch (error) {
    console.error('Error creating carousel image:', error)
    return NextResponse.json(
      { error: 'Failed to create carousel image' },
      { status: 500 }
    )
  }
}
