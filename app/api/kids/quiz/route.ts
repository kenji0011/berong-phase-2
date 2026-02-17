import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';

const prisma = new PrismaClient();

// Helper to get user from cookies
async function getUserFromSession() {
  const cookieStore = await cookies();
  const bfpUserCookie = cookieStore.get('bfp_user');
  if (bfpUserCookie?.value) {
    try {
      const userData = await verifyToken(bfpUserCookie.value);
      if (userData?.id) return userData;
    } catch { }
  }
  const sessionCookie = cookieStore.get('session');
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session?.user?.id) return session.user;
    } catch { }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { quizType, score, maxScore } = body;

    if (!quizType || score === undefined) {
      return NextResponse.json(
        { error: 'Quiz type and score are required' },
        { status: 400 }
      );
    }

    const quizResult = await prisma.quizResult.create({
      data: {
        userId: user.id,
        quizType,
        score,
        maxScore: maxScore || 100,
        completedAt: new Date(),
      },
    });

    // Also Log Engagement
    const POINTS = 10;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { engagementPoints: { increment: POINTS } },
      }),
      prisma.engagementLog.create({
        data: {
          userId: user.id,
          eventType: 'quiz',
          points: POINTS,
          eventData: { quizType, score },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: quizResult
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}
