import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify admin authentication
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: idParam } = await params
    const id = parseInt(idParam)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.questionText || !body.responseText || !body.category) {
      return NextResponse.json(
        { error: 'Question text, response text, and category are required' },
        { status: 400 }
      )
    }

    const updatedQuickQuestion = await prisma.quickQuestion.update({
      where: { id },
      data: {
        questionText: body.questionText,
        responseText: body.responseText,
        category: body.category,
        order: body.order !== undefined ? body.order : undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
      }
    })

    return NextResponse.json(updatedQuickQuestion)
  } catch (error: any) {
    console.error('Error updating quick question:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Quick question not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update quick question' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify admin authentication
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: idParam } = await params
    const id = parseInt(idParam)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      )
    }

    await prisma.quickQuestion.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Quick question deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting quick question:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Quick question not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete quick question' },
      { status: 500 }
    )
  }
}
