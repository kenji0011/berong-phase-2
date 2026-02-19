import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFallbackQuestions, shuffleArray } from '@/lib/assessment-fallback-questions'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role') || 'adult'
    const limit = parseInt(searchParams.get('limit') || '15')

    // Try to fetch questions from the database first
    let dbQuestions: {
      id: number
      question: string
      options: unknown
      category: string
      difficulty: string
      forRoles: unknown
      order: number
    }[] = []

    try {
      dbQuestions = await prisma.assessmentQuestion.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          question: true,
          options: true,
          category: true,
          difficulty: true,
          forRoles: true,
          order: true,
        },
        orderBy: {
          order: 'asc',
        },
      })
    } catch {
      // Database might not be available or table might not exist
      console.warn('Could not fetch assessment questions from database, using fallback')
    }

    // Filter questions by role
    const filteredQuestions = dbQuestions.filter(q => {
      const roles = q.forRoles as string[]
      return roles && roles.includes(role)
    })

    // If no questions from DB, use hardcoded fallback
    if (filteredQuestions.length === 0) {
      const fallbackResult = getFallbackQuestions(role, limit)
      return NextResponse.json({
        success: true,
        questions: fallbackResult.questions,
        count: fallbackResult.questions.length,
        source: 'fallback',
      })
    }

    // Shuffle question order for variety, then take up to limit
    const shuffledQuestions = shuffleArray(filteredQuestions).slice(0, limit)

    // Map to frontend shape (options stay in original order — grading depends on index matching)
    const questions = shuffledQuestions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options as string[],
      category: q.category,
      difficulty: q.difficulty,
    }))

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
      source: 'database',
    })
  } catch (error: any) {
    console.error('Error fetching assessment questions:', error)

    // Even on complete failure, try fallback
    try {
      const role = request.nextUrl.searchParams.get('role') || 'adult'
      const limit = parseInt(request.nextUrl.searchParams.get('limit') || '15')
      const fallbackResult = getFallbackQuestions(role, limit)
      return NextResponse.json({
        success: true,
        questions: fallbackResult.questions,
        count: fallbackResult.questions.length,
        source: 'fallback',
      })
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch questions' },
        { status: 500 }
      )
    }
  }
}
