import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { ENGAGEMENT_POINTS } from "@/lib/constants"
import { verifyToken } from '@/lib/jwt'

type ActivityType = 
  | "MODULE_COMPLETION"
  | "QUIZ_COMPLETION"
  | "VIDEO_WATCHED"
  | "GAME_PLAYED"
  | "SIMULATION_RUN"
  | "DAILY_LOGIN"
  | "CHAT_INTERACTION"
  | "POST_TEST_COMPLETION"
  | "READING_MATERIAL"

// Map activity types to eventType values stored in database
const EVENT_TYPE_MAP: Record<ActivityType, string> = {
  MODULE_COMPLETION: "module",
  QUIZ_COMPLETION: "quiz",
  VIDEO_WATCHED: "video",
  GAME_PLAYED: "game",
  SIMULATION_RUN: "simulation",
  DAILY_LOGIN: "login",
  CHAT_INTERACTION: "chat",
  POST_TEST_COMPLETION: "postTest",
  READING_MATERIAL: "reading",
}

const POINTS_MAP: Record<ActivityType, number> = {
  MODULE_COMPLETION: ENGAGEMENT_POINTS.MODULE_COMPLETED,
  QUIZ_COMPLETION: ENGAGEMENT_POINTS.QUIZ_COMPLETED,
  VIDEO_WATCHED: ENGAGEMENT_POINTS.VIDEO_WATCHED,
  GAME_PLAYED: ENGAGEMENT_POINTS.GAME_PLAYED,
  SIMULATION_RUN: ENGAGEMENT_POINTS.GAME_PLAYED, // Use game points
  DAILY_LOGIN: ENGAGEMENT_POINTS.DAILY_LOGIN,
  CHAT_INTERACTION: 1, // Small bonus
  POST_TEST_COMPLETION: ENGAGEMENT_POINTS.POST_TEST_COMPLETED,
  READING_MATERIAL: 2, // Reading bonus
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("bfp_user")
    
    if (!userCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userData = await verifyToken(userCookie.value)
    if (!userData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }
    const body = await request.json()
    const { activityType, metadata } = body

    if (!activityType || !POINTS_MAP[activityType as ActivityType]) {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 })
    }

    const points = POINTS_MAP[activityType as ActivityType]
    const eventType = EVENT_TYPE_MAP[activityType as ActivityType]

    // Check for daily login duplicate (only one per day)
    if (activityType === "DAILY_LOGIN") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const existingLogin = await prisma.engagementLog.findFirst({
        where: {
          userId: userData.id,
          eventType: "login",
          loggedAt: { gte: today },
        }
      })

      if (existingLogin) {
        return NextResponse.json({ 
          success: true, 
          duplicate: true,
          message: "Daily login already recorded" 
        })
      }
    }

    // Update user engagement points and create log
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userData.id },
        data: {
          engagementPoints: { increment: points },
        },
      }),
      prisma.engagementLog.create({
        data: {
          userId: userData.id,
          eventType,
          points,
          eventData: metadata || null,
        }
      })
    ])

    return NextResponse.json({
      success: true,
      activityType,
      pointsAwarded: points,
    })
  } catch (error) {
    console.error("Engagement log error:", error)
    return NextResponse.json(
      { error: "Failed to log engagement" },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve user's engagement stats
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("bfp_user")
    
    if (!userCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userData = await verifyToken(userCookie.value)
    if (!userData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userData.id },
      select: {
        engagementPoints: true,
        totalTimeSpentMinutes: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate stats from engagement logs
    const engagementStats = await prisma.engagementLog.groupBy({
      by: ["eventType"],
      where: { userId: userData.id },
      _count: { eventType: true },
    })

    const statsMap: Record<string, number> = {}
    engagementStats.forEach(stat => {
      statsMap[stat.eventType] = stat._count.eventType
    })

    // Get recent activities
    const recentActivities = await prisma.engagementLog.findMany({
      where: { userId: userData.id },
      orderBy: { loggedAt: "desc" },
      take: 10,
      select: {
        eventType: true,
        points: true,
        loggedAt: true,
        eventData: true,
      }
    })

    return NextResponse.json({
      stats: {
        engagementPoints: user.engagementPoints,
        modulesCompleted: statsMap["module"] || 0,
        quizzesCompleted: statsMap["quiz"] || 0,
        videosWatched: statsMap["video"] || 0,
        gamesPlayed: statsMap["game"] || 0,
        totalTimeSpentMinutes: user.totalTimeSpentMinutes,
      },
      recentActivities: recentActivities.map(a => ({
        activityType: a.eventType,
        points: a.points,
        createdAt: a.loggedAt,
        metadata: a.eventData,
      })),
    })
  } catch (error) {
    console.error("Engagement stats error:", error)
    return NextResponse.json(
      { error: "Failed to get engagement stats" },
      { status: 500 }
    )
  }
}
