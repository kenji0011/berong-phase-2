import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken, signToken } from '@/lib/jwt'
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
        const { name, email, password } = body

        // Password is required to confirm changes
        if (!password) {
            return NextResponse.json(
                { success: false, error: 'Password is required to update your profile.' },
                { status: 400 }
            )
        }

        // Verify password
        const user = await prisma.user.findUnique({ where: { id: currentUser.id } })
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
        }

        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { success: false, error: 'Incorrect password. Please try again.' },
                { status: 403 }
            )
        }

        // Validate name
        if (!name || !name.trim()) {
            return NextResponse.json(
                { success: false, error: 'Name is required.' },
                { status: 400 }
            )
        }

        // Validate and check email uniqueness
        if (email && email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email.trim())) {
                return NextResponse.json(
                    { success: false, error: 'Please enter a valid email address.' },
                    { status: 400 }
                )
            }

            // Check if email is already used by another user
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: email.trim(),
                    id: { not: currentUser.id },
                },
            })

            if (existingUser) {
                return NextResponse.json(
                    { success: false, error: 'This email address is already used by another account.' },
                    { status: 409 }
                )
            }
        }

        // Update user profile
        const updatedUser = await prisma.user.update({
            where: { id: currentUser.id },
            data: {
                name: name.trim(),
                email: email?.trim() || null,
            },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                role: true,
                age: true,
                isActive: true,
                createdAt: true,
                barangay: true,
                school: true,
                occupation: true,
                gender: true,
                gradeLevel: true,
                preTestScore: true,
                postTestScore: true,
                profileCompleted: true,
                engagementPoints: true,
            },
        })

        // Refresh JWT cookie with updated data
        const newToken = await signToken(updatedUser as Record<string, unknown>)
        const response = NextResponse.json({ success: true, user: updatedUser })

        response.cookies.set('bfp_user', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })

        return response
    } catch (error: any) {
        console.error('Profile update error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update profile' },
            { status: 500 }
        )
    }
}
