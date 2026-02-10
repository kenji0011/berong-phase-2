import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteUploadedFile } from '@/lib/file-utils'
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
        { error: 'Invalid carousel image ID' },
        { status: 400 }
      )
    }

    // Find the image first to get the URL
    const image = await prisma.carouselImage.findUnique({
      where: { id }
    })

    if (image) {
      // Delete the file from filesystem
      await deleteUploadedFile(image.imageUrl)

      // Delete from database
      await prisma.carouselImage.delete({
        where: { id }
      })
    }

    return NextResponse.json({ message: 'Carousel image deleted successfully' })
  } catch (error) {
    console.error('Error deleting carousel image:', error)
    return NextResponse.json(
      { error: 'Failed to delete carousel image' },
      { status: 500 }
    )
  }
}
