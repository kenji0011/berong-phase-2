import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { ANALYTICS_CACHE_DURATION, BARANGAYS_SANTA_CRUZ, ASSESSMENT_CATEGORIES } from "@/lib/constants"
import { verifyToken } from '@/lib/jwt'

interface AnalyticsSummary {
  totalUsers: number
  profilesCompleted: number
  preTestsTaken: number
  postTestsTaken: number
  averagePreTestScore: number
  averagePostTestScore: number
  averageImprovement: number
  totalEngagementPoints: number
  avgEngagementPerUser: number
  activeUsersToday: number
  activeUsersThisWeek: number
}

interface BarangayAnalytics {
  barangay: string
  userCount: number
  avgPreTestScore: number
  avgPostTestScore: number
  avgImprovement: number
  profilesCompleted: number
}

interface DemographicAnalytics {
  gender: { [key: string]: number }
  ageGroups: { [key: string]: number }
  occupations: { [key: string]: number }
  schools: { [key: string]: number }
}

interface KnowledgeGapAnalytics {
  category: string
  avgScore: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
}

const CACHE_KEY_SUMMARY = "analytics_summary"
const CACHE_KEY_BARANGAY = "analytics_barangay"
const CACHE_KEY_DEMOGRAPHICS = "analytics_demographics"
const CACHE_KEY_KNOWLEDGE = "analytics_knowledge"

export async function GET(request: Request) {
  try {
    // Check admin authentication
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("bfp_user")
    
    if (!userCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userData = await verifyToken(userCookie.value)
    if (!userData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }
    if (userData.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "summary"
    const forceRefresh = searchParams.get("refresh") === "true"

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cacheKey = type === "summary" ? CACHE_KEY_SUMMARY 
        : type === "barangay" ? CACHE_KEY_BARANGAY
        : type === "demographics" ? CACHE_KEY_DEMOGRAPHICS
        : CACHE_KEY_KNOWLEDGE

      const cached = await prisma.analyticsCache.findUnique({
        where: { cacheKey }
      })

      if (cached && new Date().getTime() - cached.updatedAt.getTime() < ANALYTICS_CACHE_DURATION.OVERVIEW_STATS * 1000) {
        return NextResponse.json({
          data: cached.cacheData,
          cached: true,
          cachedAt: cached.updatedAt,
        })
      }
    }

    let data: any
    let cacheKey: string

    switch (type) {
      case "summary":
        data = await getSummaryAnalytics()
        cacheKey = CACHE_KEY_SUMMARY
        break
      case "barangay":
        data = await getBarangayAnalytics()
        cacheKey = CACHE_KEY_BARANGAY
        break
      case "demographics":
        data = await getDemographicAnalytics()
        cacheKey = CACHE_KEY_DEMOGRAPHICS
        break
      case "knowledge":
        data = await getKnowledgeGapAnalytics()
        cacheKey = CACHE_KEY_KNOWLEDGE
        break
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    // Update cache
    await prisma.analyticsCache.upsert({
      where: { cacheKey },
      create: { 
        cacheKey, 
        cacheData: data,
        expiresAt: new Date(Date.now() + ANALYTICS_CACHE_DURATION.OVERVIEW_STATS * 1000),
      },
      update: { 
        cacheData: data,
        expiresAt: new Date(Date.now() + ANALYTICS_CACHE_DURATION.OVERVIEW_STATS * 1000),
      },
    })

    return NextResponse.json({
      data,
      cached: false,
      generatedAt: new Date(),
    })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}

async function getSummaryAnalytics(): Promise<AnalyticsSummary> {
  const now = new Date()
  const todayStart = new Date(now.setHours(0, 0, 0, 0))
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    profilesCompleted,
    preTestsTaken,
    postTestsTaken,
    scoreAggregates,
    engagementAggregates,
    activeToday,
    activeThisWeek,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: "admin" } } }),
    prisma.user.count({ where: { profileCompleted: true, role: { not: "admin" } } }),
    prisma.user.count({ where: { preTestScore: { not: null }, role: { not: "admin" } } }),
    prisma.user.count({ where: { postTestScore: { not: null }, role: { not: "admin" } } }),
    prisma.user.aggregate({
      where: { role: { not: "admin" } },
      _avg: { preTestScore: true, postTestScore: true },
    }),
    prisma.user.aggregate({
      where: { role: { not: "admin" } },
      _sum: { engagementPoints: true },
      _avg: { engagementPoints: true },
    }),
    prisma.engagementLog.groupBy({
      by: ["userId"],
      where: { loggedAt: { gte: todayStart } },
    }),
    prisma.engagementLog.groupBy({
      by: ["userId"],
      where: { loggedAt: { gte: weekAgo } },
    }),
  ])

  // Calculate average improvement for users who have both scores
  const usersWithBothScores = await prisma.user.findMany({
    where: {
      preTestScore: { not: null },
      postTestScore: { not: null },
      role: { not: "admin" },
    },
    select: { preTestScore: true, postTestScore: true },
  })

  const avgImprovement = usersWithBothScores.length > 0
    ? usersWithBothScores.reduce((sum, u) => sum + ((u.postTestScore || 0) - (u.preTestScore || 0)), 0) / usersWithBothScores.length
    : 0

  return {
    totalUsers,
    profilesCompleted,
    preTestsTaken,
    postTestsTaken,
    averagePreTestScore: Math.round((scoreAggregates._avg.preTestScore || 0) * 100) / 100,
    averagePostTestScore: Math.round((scoreAggregates._avg.postTestScore || 0) * 100) / 100,
    averageImprovement: Math.round(avgImprovement * 100) / 100,
    totalEngagementPoints: engagementAggregates._sum.engagementPoints || 0,
    avgEngagementPerUser: Math.round((engagementAggregates._avg.engagementPoints || 0) * 100) / 100,
    activeUsersToday: activeToday.length,
    activeUsersThisWeek: activeThisWeek.length,
  }
}

async function getBarangayAnalytics(): Promise<BarangayAnalytics[]> {
  const barangayData: BarangayAnalytics[] = []

  for (const barangay of BARANGAYS_SANTA_CRUZ) {
    const users = await prisma.user.findMany({
      where: { barangay, role: { not: "admin" } },
      select: {
        preTestScore: true,
        postTestScore: true,
        profileCompleted: true,
      },
    })

    if (users.length === 0) {
      barangayData.push({
        barangay,
        userCount: 0,
        avgPreTestScore: 0,
        avgPostTestScore: 0,
        avgImprovement: 0,
        profilesCompleted: 0,
      })
      continue
    }

    const usersWithPreTest = users.filter(u => u.preTestScore !== null)
    const usersWithPostTest = users.filter(u => u.postTestScore !== null)
    const usersWithBoth = users.filter(u => u.preTestScore !== null && u.postTestScore !== null)

    barangayData.push({
      barangay,
      userCount: users.length,
      avgPreTestScore: usersWithPreTest.length > 0
        ? Math.round(usersWithPreTest.reduce((sum, u) => sum + (u.preTestScore || 0), 0) / usersWithPreTest.length * 100) / 100
        : 0,
      avgPostTestScore: usersWithPostTest.length > 0
        ? Math.round(usersWithPostTest.reduce((sum, u) => sum + (u.postTestScore || 0), 0) / usersWithPostTest.length * 100) / 100
        : 0,
      avgImprovement: usersWithBoth.length > 0
        ? Math.round(usersWithBoth.reduce((sum, u) => sum + ((u.postTestScore || 0) - (u.preTestScore || 0)), 0) / usersWithBoth.length * 100) / 100
        : 0,
      profilesCompleted: users.filter(u => u.profileCompleted).length,
    })
  }

  return barangayData.sort((a, b) => b.userCount - a.userCount)
}

async function getDemographicAnalytics(): Promise<DemographicAnalytics> {
  const users = await prisma.user.findMany({
    where: { role: { not: "admin" }, profileCompleted: true },
    select: {
      gender: true,
      age: true,
      occupation: true,
      school: true,
    },
  })

  const gender: Record<string, number> = {}
  const ageGroups: Record<string, number> = {
    "Under 10": 0,
    "10-14": 0,
    "15-17": 0,
    "18-24": 0,
    "25-34": 0,
    "35-44": 0,
    "45-54": 0,
    "55+": 0,
  }
  const occupations: Record<string, number> = {}
  const schools: Record<string, number> = {}

  for (const user of users) {
    // Gender
    if (user.gender) {
      gender[user.gender] = (gender[user.gender] || 0) + 1
    }

    // Age groups
    if (user.age) {
      if (user.age < 10) ageGroups["Under 10"]++
      else if (user.age < 15) ageGroups["10-14"]++
      else if (user.age < 18) ageGroups["15-17"]++
      else if (user.age < 25) ageGroups["18-24"]++
      else if (user.age < 35) ageGroups["25-34"]++
      else if (user.age < 45) ageGroups["35-44"]++
      else if (user.age < 55) ageGroups["45-54"]++
      else ageGroups["55+"]++
    }

    // Occupations
    if (user.occupation) {
      occupations[user.occupation] = (occupations[user.occupation] || 0) + 1
    }

    // Schools
    if (user.school) {
      schools[user.school] = (schools[user.school] || 0) + 1
    }
  }

  return { gender, ageGroups, occupations, schools }
}

async function getKnowledgeGapAnalytics(): Promise<KnowledgeGapAnalytics[]> {
  const categories = ASSESSMENT_CATEGORIES
  const knowledgeData: KnowledgeGapAnalytics[] = []

  for (const category of categories) {
    // Get all questions in this category
    const questions = await prisma.assessmentQuestion.findMany({
      where: { category, isActive: true },
      select: { id: true },
    })

    if (questions.length === 0) {
      knowledgeData.push({
        category,
        avgScore: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      })
      continue
    }

    const questionIds = questions.map(q => q.id)

    // Get all answers for these questions
    const answers = await prisma.userAnswer.findMany({
      where: { questionId: { in: questionIds } },
      select: { isCorrect: true },
    })

    const correctAnswers = answers.filter(a => a.isCorrect).length
    const totalAnswers = answers.length

    knowledgeData.push({
      category,
      avgScore: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
      totalQuestions: questions.length,
      correctAnswers,
      incorrectAnswers: totalAnswers - correctAnswers,
    })
  }

  return knowledgeData.sort((a, b) => a.avgScore - b.avgScore) // Sort by lowest score first (knowledge gaps)
}
