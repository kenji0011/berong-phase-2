import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get all quick questions ordered by category and order
    const quickQuestions = await prisma.quickQuestion.findMany({
      orderBy: [
        { category: 'asc' },
        { order: 'asc' },
      ],
    })

    return NextResponse.json(quickQuestions)
  } catch (error) {
    console.error('Error fetching quick questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quick questions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.questionText || !body.responseText || !body.category) {
      return NextResponse.json(
        { error: 'Question text, response text, and category are required' },
        { status: 400 }
      )
    }

    // Determine the next order number for this category
    const maxOrder = await prisma.quickQuestion.aggregate({
      _max: {
        order: true,
      },
      where: {
        category: body.category,
      },
    })

    const newQuickQuestion = await prisma.quickQuestion.create({
      data: {
        questionText: body.questionText,
        responseText: body.responseText,
        category: body.category,
        order: (maxOrder._max.order || 0) + 1,
        isActive: body.isActive !== undefined ? body.isActive : true,
      }
    })

    return NextResponse.json(newQuickQuestion)
  } catch (error) {
    console.error('Error creating quick question:', error)
    return NextResponse.json(
      { error: 'Failed to create quick question' },
      { status: 500 }
    )
  }
}
