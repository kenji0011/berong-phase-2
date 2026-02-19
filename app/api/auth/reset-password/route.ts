import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendVerificationCodeEmail, sendPasswordResetEmail, generateRandomPassword, generateVerificationCode } from '@/lib/email-utils'

// In-memory store for verification codes (cleared on server restart)
// In production, use Redis or a database table
const resetCodes = new Map<string, { code: string; userId: number; email: string; expiresAt: number }>()

// Step 1: Send a verification code to the user's email
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { username, step, code } = body

        if (!username || !username.trim()) {
            return NextResponse.json(
                { success: false, error: 'Username is required' },
                { status: 400 }
            )
        }

        const trimmedUsername = username.trim()

        // STEP 1: Send verification code
        if (step === 1 || !step) {
            const user = await prisma.user.findUnique({
                where: { username: trimmedUsername },
                select: { id: true, email: true, username: true },
            })

            if (!user) {
                return NextResponse.json(
                    { success: false, error: 'No account found with that username.' },
                    { status: 404 }
                )
            }

            if (!user.email) {
                return NextResponse.json({
                    success: false,
                    error: 'This account has no email address attached. Unfortunately, the password cannot be reset without an email.',
                }, { status: 400 })
            }

            // Generate a 6-digit code, valid for 10 minutes
            const verificationCode = generateVerificationCode()
            resetCodes.set(trimmedUsername, {
                code: verificationCode,
                userId: user.id,
                email: user.email,
                expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
            })

            // Mask email for display
            const [localPart, domain] = user.email.split('@')
            const maskedEmail = localPart.length > 2
                ? `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`
                : `${localPart[0]}***@${domain}`

            // Send the code via email
            const emailSent = await sendVerificationCodeEmail(user.email, user.username, verificationCode)

            if (!emailSent) {
                resetCodes.delete(trimmedUsername)
                return NextResponse.json(
                    { success: false, error: 'Failed to send verification email. Please try again later.' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                step: 1,
                message: `A verification code has been sent to ${maskedEmail}. Please check your email.`,
                maskedEmail,
            })
        }

        // STEP 2: Verify code and reset password
        if (step === 2) {
            if (!code || !code.trim()) {
                return NextResponse.json(
                    { success: false, error: 'Verification code is required.' },
                    { status: 400 }
                )
            }

            const stored = resetCodes.get(trimmedUsername)

            if (!stored) {
                return NextResponse.json(
                    { success: false, error: 'No reset request found. Please start over.' },
                    { status: 400 }
                )
            }

            // Check expiry
            if (Date.now() > stored.expiresAt) {
                resetCodes.delete(trimmedUsername)
                return NextResponse.json(
                    { success: false, error: 'Verification code has expired. Please request a new one.' },
                    { status: 400 }
                )
            }

            // Check code
            if (stored.code !== code.trim()) {
                return NextResponse.json(
                    { success: false, error: 'Invalid verification code. Please try again.' },
                    { status: 400 }
                )
            }

            // Code is valid! Generate new password and update
            const newPassword = generateRandomPassword(10)
            const hashedPassword = await bcrypt.hash(newPassword, 10)

            await prisma.user.update({
                where: { id: stored.userId },
                data: { password: hashedPassword },
            })

            // Send the new password via email
            const emailSent = await sendPasswordResetEmail(stored.email, trimmedUsername, newPassword)

            // Clean up the code
            resetCodes.delete(trimmedUsername)

            if (!emailSent) {
                return NextResponse.json(
                    { success: false, error: 'Password was reset but failed to send email. Please contact an administrator.' },
                    { status: 500 }
                )
            }

            // Mask email for display
            const [localPart, domain] = stored.email.split('@')
            const maskedEmail = localPart.length > 2
                ? `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`
                : `${localPart[0]}***@${domain}`

            return NextResponse.json({
                success: true,
                step: 2,
                message: `Your password has been reset! The new password has been sent to ${maskedEmail}.`,
            })
        }

        return NextResponse.json(
            { success: false, error: 'Invalid step.' },
            { status: 400 }
        )
    } catch (error: any) {
        console.error('Password reset error:', error)
        return NextResponse.json(
            { success: false, error: 'Something went wrong. Please try again.' },
            { status: 500 }
        )
    }
}
