import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { verifyToken } from '@/lib/jwt'

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
    const { minutes } = body

    if (typeof minutes !== "number" || minutes < 0 || minutes > 1440) {
      return NextResponse.json({ error: "Invalid minutes value" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userData.id },
      data: {
        totalTimeSpentMinutes: { increment: Math.round(minutes) },
      }
    })

    return NextResponse.json({
      success: true,
      minutesAdded: minutes,
    })
  } catch (error) {
    console.error("Time tracking error:", error)
    return NextResponse.json(
      { error: "Failed to log time spent" },
      { status: 500 }
    )
  }
}
