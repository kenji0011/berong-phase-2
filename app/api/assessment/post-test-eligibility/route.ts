import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { POST_TEST_UNLOCK_THRESHOLDS } from "@/lib/constants"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("bfp_user")

    if (!userCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userData = JSON.parse(userCookie.value)

    const user = await prisma.user.findUnique({
      where: { id: userData.id },
      select: {
        id: true,
        age: true,
        engagementPoints: true,
        totalTimeSpentMinutes: true,
        preTestScore: true,
        postTestScore: true,
        postTestCompletedAt: true,
        profileCompleted: true,
      }
    })

    // Determine if user is adult (age >= 18) - adults don't need modules
    const isAdult = (user?.age ?? 18) >= 18

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate engagement stats from logs
    const engagementStats = await prisma.engagementLog.groupBy({
      by: ["eventType"],
      where: { userId: userData.id },
      _count: { eventType: true },
    })

    const statsMap: Record<string, number> = {}
    engagementStats.forEach(stat => {
      statsMap[stat.eventType] = stat._count.eventType
    })

    // Count actual SafeScape module completions (not just engagement logs)
    // This accounts for modules completed before engagement tracking was added
    // Note: SafeScape progress may have been saved with a different session cookie
    let actualModulesCompleted = await prisma.safeScapeProgress.count({
      where: { userId: userData.id, completed: true }
    })

    // Also try the 'session' cookie in case progress was saved under that user ID
    const sessionCookie = cookieStore.get('session')
    if (sessionCookie?.value && actualModulesCompleted === 0) {
      try {
        const sessionData = JSON.parse(sessionCookie.value)
        if (sessionData?.user?.id && sessionData.user.id !== userData.id) {
          const sessionModulesCompleted = await prisma.safeScapeProgress.count({
            where: { userId: sessionData.user.id, completed: true }
          })
          actualModulesCompleted = sessionModulesCompleted
        }
      } catch {
        // Ignore session parse errors
      }
    }

    const modulesCompleted = actualModulesCompleted
    const quizzesCompleted = statsMap["quiz"] || 0
    const videosWatched = statsMap["video"] || 0
    const gamesPlayed = statsMap["game"] || 0

    // Check if user has completed profile
    if (!user.profileCompleted) {
      return NextResponse.json({
        eligible: false,
        reason: "Please complete your profile first",
        requirements: POST_TEST_UNLOCK_THRESHOLDS,
        current: {
          engagementPoints: 0,
          modulesCompleted: 0,
          quizzesCompleted: 0,
        },
        progress: {
          engagementPoints: 0,
          modulesCompleted: 0,
          quizzesCompleted: 0,
        }
      })
    }

    // Check if user already completed post-test
    if (user.postTestScore !== null && user.postTestCompletedAt) {
      return NextResponse.json({
        eligible: false,
        alreadyCompleted: true,
        postTestScore: user.postTestScore,
        preTestScore: user.preTestScore,
        completedAt: user.postTestCompletedAt,
        reason: "You have already completed the post-test"
      })
    }

    // Check eligibility criteria
    const current = {
      engagementPoints: user.engagementPoints || 0,
      modulesCompleted,
      quizzesCompleted,
      videosWatched,
      gamesPlayed,
      totalTimeSpentMinutes: user.totalTimeSpentMinutes || 0,
    }

    // Calculate progress percentage for each requirement
    const progress = {
      engagementPoints: Math.min(100, Math.round((current.engagementPoints / POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS) * 100)),
      modulesCompleted: Math.min(100, Math.round((current.modulesCompleted / POST_TEST_UNLOCK_THRESHOLDS.MIN_MODULES_COMPLETED) * 100)),
      quizzesCompleted: Math.min(100, Math.round((current.quizzesCompleted / POST_TEST_UNLOCK_THRESHOLDS.MIN_QUIZZES_PASSED) * 100)),
    }

    // Check if all requirements are met
    // Adults only need engagement points (modules are for kids only)
    const eligible = isAdult
      ? current.engagementPoints >= POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS
      : current.engagementPoints >= POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS &&
      current.modulesCompleted >= POST_TEST_UNLOCK_THRESHOLDS.MIN_MODULES_COMPLETED &&
      current.quizzesCompleted >= POST_TEST_UNLOCK_THRESHOLDS.MIN_QUIZZES_PASSED

    // Build reason message if not eligible
    let reason = ""
    if (!eligible) {
      const missing = []
      if (current.engagementPoints < POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS) {
        missing.push(`${POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS - current.engagementPoints} more engagement points`)
      }
      // Only show module requirement for kids
      if (!isAdult && current.modulesCompleted < POST_TEST_UNLOCK_THRESHOLDS.MIN_MODULES_COMPLETED) {
        missing.push(`${POST_TEST_UNLOCK_THRESHOLDS.MIN_MODULES_COMPLETED - current.modulesCompleted} more modules`)
      }
      if (!isAdult && current.quizzesCompleted < POST_TEST_UNLOCK_THRESHOLDS.MIN_QUIZZES_PASSED) {
        missing.push(`${POST_TEST_UNLOCK_THRESHOLDS.MIN_QUIZZES_PASSED - current.quizzesCompleted} more quizzes`)
      }
      reason = `You need: ${missing.join(", ")}`
    }

    // Create a simplified requirements object for the frontend
    const requirements = {
      minEngagementPoints: POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS,
      minModulesCompleted: POST_TEST_UNLOCK_THRESHOLDS.MIN_MODULES_COMPLETED,
      minQuizzesCompleted: POST_TEST_UNLOCK_THRESHOLDS.MIN_QUIZZES_PASSED,
    }

    return NextResponse.json({
      eligible,
      reason: eligible ? "You are eligible to take the post-test!" : reason,
      requirements,
      current,
      progress,
      preTestScore: user.preTestScore,
      isAdult,
    })
  } catch (error) {
    console.error("Post-test eligibility check error:", error)
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 }
    )
  }
}
