import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { verifyToken } from '@/lib/jwt'

export async function GET() {
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

    // Fetch all users with relevant data
    const users = await prisma.user.findMany({
      where: { role: { not: "admin" } },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        age: true,
        gender: true,
        barangay: true,
        school: true,
        occupation: true,
        gradeLevel: true,
        preTestScore: true,
        postTestScore: true,
        engagementPoints: true,
        totalTimeSpentMinutes: true,
        profileCompleted: true,
        createdAt: true,
        postTestCompletedAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Get engagement stats for each user
    const userEngagementStats = await prisma.engagementLog.groupBy({
      by: ["userId", "eventType"],
      _count: { eventType: true },
    })

    // Build stats map per user
    const userStatsMap: Record<number, Record<string, number>> = {}
    userEngagementStats.forEach(stat => {
      if (!userStatsMap[stat.userId]) {
        userStatsMap[stat.userId] = {}
      }
      userStatsMap[stat.userId][stat.eventType] = stat._count.eventType
    })

    // Generate CSV content
    const headers = [
      "ID",
      "Name",
      "Username",
      "Email",
      "Age",
      "Gender",
      "Barangay",
      "School",
      "Occupation",
      "Grade Level",
      "Pre-Test Score",
      "Post-Test Score",
      "Improvement",
      "Engagement Points",
      "Modules Completed",
      "Quizzes Completed",
      "Videos Watched",
      "Games Played",
      "Time Spent (mins)",
      "Profile Completed",
      "Registered At",
      "Post-Test Completed At",
    ]

    const csvRows = [headers.join(",")]

    for (const user of users) {
      const improvement = user.preTestScore !== null && user.postTestScore !== null
        ? user.postTestScore - user.preTestScore
        : ""

      const userStats = userStatsMap[user.id] || {}

      const row = [
        user.id,
        escapeCSV(user.name),
        escapeCSV(user.username),
        escapeCSV(user.email),
        user.age ?? "",
        escapeCSV(user.gender),
        escapeCSV(user.barangay),
        escapeCSV(user.school),
        escapeCSV(user.occupation),
        escapeCSV(user.gradeLevel),
        user.preTestScore ?? "",
        user.postTestScore ?? "",
        improvement,
        user.engagementPoints ?? 0,
        userStats["module"] ?? 0,
        userStats["quiz"] ?? 0,
        userStats["video"] ?? 0,
        userStats["game"] ?? 0,
        user.totalTimeSpentMinutes ?? 0,
        user.profileCompleted ? "Yes" : "No",
        formatDate(user.createdAt),
        user.postTestCompletedAt ? formatDate(user.postTestCompletedAt) : "",
      ]

      csvRows.push(row.join(","))
    }

    const csvContent = csvRows.join("\n")

    // Return as downloadable CSV
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="safescape_analytics_${formatDateForFilename(new Date())}.csv"`,
      },
    })
  } catch (error) {
    console.error("CSV export error:", error)
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    )
  }
}

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split("T")[0].replace(/-/g, "")
}
