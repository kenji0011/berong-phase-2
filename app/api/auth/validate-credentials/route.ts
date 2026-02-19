import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Pre-validate registration credentials before the pre-test.
 * Checks username availability and password requirements server-side.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { username, password, email } = body

        const errors: Record<string, string> = {}

        // Validate username format
        if (!username || username.trim().length === 0) {
            errors.username = 'Username is required'
        } else if (username.length < 3 || username.length > 20) {
            errors.username = 'Username must be between 3 and 20 characters'
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errors.username = 'Username can only contain letters, numbers, and underscores'
        } else {
            // Check if username already taken
            const existing = await prisma.user.findUnique({
                where: { username },
                select: { id: true },
            })
            if (existing) {
                errors.username = 'Username is already taken. Please choose another one.'
            }
        }

        // Validate email (optional but must be unique if provided)
        if (email && email.trim().length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                errors.email = 'Please enter a valid email address'
            } else {
                const existingEmail = await prisma.user.findUnique({
                    where: { email: email.trim() },
                    select: { id: true },
                })
                if (existingEmail) {
                    errors.email = 'This email is already registered. Please use a different one.'
                }
            }
        }

        // Validate password
        if (!password) {
            errors.password = 'Password is required'
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters'
        }

        if (Object.keys(errors).length > 0) {
            return NextResponse.json({
                success: false,
                valid: false,
                errors,
            })
        }

        return NextResponse.json({
            success: true,
            valid: true,
        })
    } catch (error: any) {
        console.error('Credential validation error:', error)
        return NextResponse.json(
            { success: false, valid: false, error: 'Validation failed' },
            { status: 500 }
        )
    }
}
