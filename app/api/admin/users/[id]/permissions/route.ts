import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // For now, we'll implement a simple permission toggle system
    // In a real implementation, you'd have a more sophisticated permissions system

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
