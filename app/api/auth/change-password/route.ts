import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import bcrypt from 'bcryptjs'

export async function PUT(request: NextRequest) {
    try {
        // Authenticate
        const cookieStore = await cookies()
        const userCookie = cookieStore.get('bfp_user')
        if (!userCookie) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
        }

        const currentUser = await verifyToken(userCookie.value)
        if (!currentUser) {
            return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
        }

        const body = await request.json()
        const { currentPassword, newPassword, confirmPassword } = body

        // All fields required
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { success: false, error: 'All password fields are required.' },
                { status: 400 }
            )
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { success: false, error: 'New passwords do not match.' },
                { status: 400 }
            )
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { success: false, error: 'New password must be at least 8 characters.' },
                { status: 400 }
            )
        }

        if (currentPassword === newPassword) {
            return NextResponse.json(
                { success: false, error: 'New password must be different from your current password.' },
                { status: 400 }
            )
        }

        // Verify current password
        const user = await prisma.user.findUnique({ where: { id: currentUser.id } })
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { success: false, error: 'Current password is incorrect.' },
                { status: 403 }
            )
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await prisma.user.update({
            where: { id: currentUser.id },
            data: { password: hashedPassword },
        })

        return NextResponse.json({ success: true, message: 'Password changed successfully.' })
    } catch (error: any) {
        console.error('Password change error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to change password' },
            { status: 500 }
        )
    }
}
