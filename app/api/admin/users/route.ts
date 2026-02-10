import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Verify admin authentication
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    // Add permissions to each user (this would be calculated based on role)
    const usersWithPermissions = users.map(user => ({
      ...user,
      permissions: {
        accessKids: user.role === 'kid' || user.role === 'professional' || user.role === 'admin',
        accessAdult: user.role === 'adult' || user.role === 'professional' || user.role === 'admin',
        accessProfessional: user.role === 'professional' || user.role === 'admin',
        isAdmin: user.role === 'admin',
      }
    }))

    return NextResponse.json(usersWithPermissions)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
