import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

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

    const decoded = JSON.parse(decodeURIComponent(userCookie)) as UserPayload
    // Handle both 'id' and 'userId' for compatibility
    return {
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      role: decoded.role
    }
  } catch {
    return null
  }
}

// GET /api/floor-plans/[id] - Get single floor plan with full data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const floorPlanId = parseInt(id)

    if (isNaN(floorPlanId)) {
      return NextResponse.json({ error: 'Invalid floor plan ID' }, { status: 400 })
    }

    const user = await getCurrentUser()

    const floorPlan = await prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      include: {
        clonedFrom: {
          select: {
            id: true,
            name: true,
            uploaderName: true
          }
        },
        _count: {
          select: { clones: true }
        }
      }
    })

    if (!floorPlan) {
      return NextResponse.json({ error: 'Floor plan not found' }, { status: 404 })
    }

    // Check access: must be owner or public
    if (!floorPlan.isPublic && (!user || floorPlan.userId !== user.userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      ...floorPlan,
      isOwner: user ? floorPlan.userId === user.userId : false,
      canEdit: user ? floorPlan.userId === user.userId : false,
      cloneCount: floorPlan._count.clones
    })
  } catch (error) {
    console.error('Error fetching floor plan:', error)
    return NextResponse.json({ error: 'Failed to fetch floor plan' }, { status: 500 })
  }
}

// PUT /api/floor-plans/[id] - Update floor plan (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const floorPlanId = parseInt(id)

    if (isNaN(floorPlanId)) {
      return NextResponse.json({ error: 'Invalid floor plan ID' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check ownership
    const existing = await prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      select: { userId: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Floor plan not found' }, { status: 404 })
    }

    if (existing.userId !== user.userId) {
      return NextResponse.json({ error: 'You can only edit your own floor plans' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, gridData, thumbnail, originalImage, isPublic, exitCount } = body

    const updated = await prisma.floorPlan.update({
      where: { id: floorPlanId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(gridData !== undefined && { gridData }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(originalImage !== undefined && { originalImage }),
        ...(isPublic !== undefined && { isPublic }),
        ...(exitCount !== undefined && { exitCount })
      }
    })

    return NextResponse.json({ success: true, floorPlan: updated })
  } catch (error) {
    console.error('Error updating floor plan:', error)
    return NextResponse.json({ error: 'Failed to update floor plan' }, { status: 500 })
  }
}

// DELETE /api/floor-plans/[id] - Delete floor plan (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const floorPlanId = parseInt(id)

    if (isNaN(floorPlanId)) {
      return NextResponse.json({ error: 'Invalid floor plan ID' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check ownership
    const existing = await prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      select: { userId: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Floor plan not found' }, { status: 404 })
    }

    if (existing.userId !== user.userId) {
      return NextResponse.json({ error: 'You can only delete your own floor plans' }, { status: 403 })
    }

    await prisma.floorPlan.delete({
      where: { id: floorPlanId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting floor plan:', error)
    return NextResponse.json({ error: 'Failed to delete floor plan' }, { status: 500 })
  }
}
