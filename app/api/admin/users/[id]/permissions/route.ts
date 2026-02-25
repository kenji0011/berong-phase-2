import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import bcrypt from 'bcryptjs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: idParam } = await params
    const userId = parseInt(idParam)
    const body = await request.json()

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    if (!body.permission) {
      return NextResponse.json(
        { error: 'Permission field is required' },
        { status: 400 }
      )
    }

    // Require admin password verification for role changes
    if (!body.adminPassword) {
      return NextResponse.json(
        { error: 'Admin password is required to change user roles.' },
        { status: 400 }
      )
    }

    // Get admin user from the auth cookie to verify password
    const { cookies } = await import('next/headers')
    const { verifyToken } = await import('@/lib/jwt')
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('bfp_user')
    const adminPayload = await verifyToken(userCookie!.value)

    const adminUser = await prisma.user.findUnique({
      where: { id: adminPayload!.id },
      select: { password: true }
    })

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      )
    }

    const isValidPassword = await bcrypt.compare(body.adminPassword, adminUser.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Incorrect password. Role change denied.' },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user role based on permission changes
    let newRole = user.role

    switch (body.permission) {
      case 'isAdmin':
        newRole = user.role === 'admin' ? 'adult' : 'admin'
        break
      case 'accessProfessional':
        newRole = user.role === 'professional' ? 'adult' : 'professional'
        break
      case 'accessAdult':
        newRole = user.role === 'adult' ? 'kid' : 'adult'
        break
      case 'accessKids':
        newRole = user.role === 'kid' ? 'guest' : 'kid'
        break
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    })

    // Calculate permissions based on new role
    const permissions = {
      accessKids: newRole === 'kid' || newRole === 'professional' || newRole === 'admin',
      accessAdult: newRole === 'adult' || newRole === 'professional' || newRole === 'admin',
      accessProfessional: newRole === 'professional' || newRole === 'admin',
      isAdmin: newRole === 'admin',
    }

    return NextResponse.json({
      ...updatedUser,
      permissions
    })
  } catch (error) {
    console.error('Error updating user permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update user permissions' },
      { status: 500 }
    )
  }
}

