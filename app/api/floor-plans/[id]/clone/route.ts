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

// POST /api/floor-plans/[id]/clone - Clone a floor plan (like git clone)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sourceId = parseInt(id)

    if (isNaN(sourceId)) {
      return NextResponse.json({ error: 'Invalid floor plan ID' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required to clone floor plans' }, { status: 401 })
    }

    // Get source floor plan
    const source = await prisma.floorPlan.findUnique({
      where: { id: sourceId }
    })

    if (!source) {
      return NextResponse.json({ error: 'Source floor plan not found' }, { status: 404 })
    }

    // Check access: must be public or owner
    if (!source.isPublic && source.userId !== user.userId) {
      return NextResponse.json({ error: 'Cannot clone private floor plan' }, { status: 403 })
    }

    // Get user's name for denormalized field
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true, username: true }
    })

    // Parse request body for optional name override
    let newName = `${source.name} (Copy)`
    try {
      const body = await request.json()
      if (body.name) {
        newName = body.name
      }
    } catch {
      // No body provided, use default name
    }

    // Create clone
    const clone = await prisma.floorPlan.create({
      data: {
        name: newName,
        description: source.description ? `Cloned from: ${source.name}\n\n${source.description}` : `Cloned from: ${source.name}`,
        gridData: source.gridData as object,
        thumbnail: source.thumbnail,
        originalImage: source.originalImage,
        userId: user.userId,
        uploaderName: userData?.name || userData?.username || 'Unknown',
        isPublic: false, // Clones are private by default
        clonedFromId: source.id,
        gridWidth: source.gridWidth,
        gridHeight: source.gridHeight,
        exitCount: source.exitCount,
        processingMethod: source.processingMethod,
        threshold: source.threshold,
        invertMask: source.invertMask
      }
    })

    return NextResponse.json({
      success: true,
      message: `Floor plan cloned successfully`,
      floorPlan: {
        id: clone.id,
        name: clone.name,
        clonedFromId: clone.clonedFromId,
        createdAt: clone.createdAt
      },
      sourceInfo: {
        id: source.id,
        name: source.name,
        uploaderName: source.uploaderName
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error cloning floor plan:', error)
    return NextResponse.json({ error: 'Failed to clone floor plan' }, { status: 500 })
  }
}
