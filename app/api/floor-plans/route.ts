import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'

// User payload from bfp_user cookie
interface UserPayload {
  id: number
  userId?: number // For backwards compatibility
  username: string
  role: string
}

// Type for floor plan list items
interface FloorPlanListItem {
  id: number
  name: string
  description: string | null
  thumbnail: string | null
  userId: number
  uploaderName: string
  isPublic: boolean
  clonedFromId: number | null
  gridWidth: number
  gridHeight: number
  exitCount: number
  processingMethod: string
  createdAt: Date
  updatedAt: Date
}

// Get current user from bfp_user cookie (matches main auth system)
async function getCurrentUser(): Promise<{ userId: number; username: string; role: string } | null> {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('bfp_user')?.value
    if (!userCookie) return null

    const decoded = await verifyToken(userCookie)
    if (!decoded) return null
    // Handle both 'id' and 'userId' for compatibility
    return {
      userId: (decoded.userId || decoded.id) as number,
      username: decoded.username,
      role: decoded.role
    }
  } catch {
    return null
  }
}

// GET /api/floor-plans - List floor plans
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)

    const filter = searchParams.get('filter') || 'all' // 'all', 'mine', 'public'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Build where clause based on filter
    let where: any = {}

    if (filter === 'mine') {
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      where.userId = user.userId
    } else if (filter === 'public') {
      where.isPublic = true
    } else {
      // 'all' - show public + user's own
      if (user) {
        where.OR = [
          { isPublic: true },
          { userId: user.userId }
        ]
      } else {
        where.isPublic = true
      }
    }

    // Add search if provided
    if (search) {
      where.AND = [
        where.AND || {},
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { uploaderName: { contains: search, mode: 'insensitive' } }
          ]
        }
      ]
    }

    const [floorPlans, total] = await Promise.all([
      prisma.floorPlan.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          thumbnail: true,
          uploaderName: true,
          isPublic: true,
          userId: true,
          clonedFromId: true,
          gridWidth: true,
          gridHeight: true,
          exitCount: true,
          processingMethod: true,
          createdAt: true,
          updatedAt: true,
          // Don't include gridData in list view (too large)
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.floorPlan.count({ where })
    ])

    // Add ownership flag for current user
    const floorPlansWithOwnership = (floorPlans as FloorPlanListItem[]).map((fp: FloorPlanListItem) => ({
      ...fp,
      isOwner: user ? fp.userId === user.userId : false,
      canEdit: user ? fp.userId === user.userId : false
    }))

    return NextResponse.json({
      floorPlans: floorPlansWithOwnership,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching floor plans:', error)
    return NextResponse.json({ error: 'Failed to fetch floor plans' }, { status: 500 })
  }
}

// POST /api/floor-plans - Create new floor plan
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      gridData,
      thumbnail,
      originalImage,
      isPublic = false,
      exitCount = 0,
      processingMethod = 'unet',
      threshold,
      invertMask
    } = body

    if (!name || !gridData) {
      return NextResponse.json({ error: 'Name and gridData are required' }, { status: 400 })
    }

    // Get user's name for denormalized field
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true, username: true }
    })

    const floorPlan = await prisma.floorPlan.create({
      data: {
        name,
        description,
        gridData,
        thumbnail,
        originalImage,
        userId: user.userId,
        uploaderName: userData?.name || userData?.username || 'Unknown',
        isPublic,
        exitCount,
        processingMethod,
        threshold,
        invertMask
      }
    })

    return NextResponse.json({
      success: true,
      floorPlan: {
        id: floorPlan.id,
        name: floorPlan.name,
        createdAt: floorPlan.createdAt
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating floor plan:', error)
    return NextResponse.json({ error: 'Failed to create floor plan' }, { status: 500 })
  }
}
