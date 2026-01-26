import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Helper to get user from cookies - try both bfp_user and session for compatibility
async function getUserFromSession() {
  const cookieStore = await cookies();

  // Try bfp_user cookie first (main auth cookie)
  const bfpUserCookie = cookieStore.get('bfp_user');
  if (bfpUserCookie?.value) {
    try {
      const userData = JSON.parse(bfpUserCookie.value);
      if (userData?.id) {
        return userData;
      }
    } catch {
      // Fall through to try session cookie
    }
  }

  // Fallback to session cookie for backward compatibility
  const sessionCookie = cookieStore.get('session');
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session?.user?.id) {
        return session.user;
      }
    } catch {
      return null;
    }
  }

  return null;
}

// GET - Fetch user's SafeScape progress
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const moduleNum = searchParams.get('moduleNum');

    // If moduleNum specified, get specific module progress
    if (moduleNum) {
      const progress = await prisma.safeScapeProgress.findUnique({
        where: {
          userId_moduleNum: {
            userId: user.id,
            moduleNum: parseInt(moduleNum),
          },
        },
      });

      return NextResponse.json({
        success: true,
        progress: progress ? {
          ...progress,
          sectionData: JSON.parse(progress.sectionData || '{}'),
        } : null,
      });
    }

    // Otherwise, get all progress for user
    const allProgress = await prisma.safeScapeProgress.findMany({
      where: { userId: user.id },
      orderBy: { moduleNum: 'asc' },
    });

    // Format progress as object keyed by moduleNum
    const progressMap: Record<number, {
      moduleNum: number;
      sectionData: Record<string, boolean>;
      completed: boolean;
      completedAt: Date | null;
    }> = {};

    allProgress.forEach((p) => {
      progressMap[p.moduleNum] = {
        moduleNum: p.moduleNum,
        sectionData: JSON.parse(p.sectionData || '{}'),
        completed: p.completed,
        completedAt: p.completedAt,
      };
    });

    // Calculate overall progress
    const completedCount = allProgress.filter(p => p.completed).length;
    const overallProgress = Math.round((completedCount / 5) * 100);

    return NextResponse.json({
      success: true,
      userId: user.id,
      userName: user.name,
      progress: progressMap,
      overallProgress,
      completedModules: completedCount,
    });
  } catch (error) {
    console.error('Error fetching SafeScape progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// POST - Update user's SafeScape progress
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { moduleNum, sectionData, completed } = body;

    if (!moduleNum || moduleNum < 1 || moduleNum > 5) {
      return NextResponse.json(
        { error: 'Invalid moduleNum. Must be between 1 and 5.' },
        { status: 400 }
      );
    }

    // Check if module was already completed before this update
    const existingProgress = await prisma.safeScapeProgress.findUnique({
      where: {
        userId_moduleNum: {
          userId: user.id,
          moduleNum: parseInt(moduleNum),
        },
      },
    });
    const wasAlreadyCompleted = existingProgress?.completed || false;

    // Upsert progress (create or update)
    const progress = await prisma.safeScapeProgress.upsert({
      where: {
        userId_moduleNum: {
          userId: user.id,
          moduleNum: parseInt(moduleNum),
        },
      },
      update: {
        sectionData: JSON.stringify(sectionData || {}),
        completed: completed || false,
        completedAt: completed ? new Date() : null,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        moduleNum: parseInt(moduleNum),
        sectionData: JSON.stringify(sectionData || {}),
        completed: completed || false,
        completedAt: completed ? new Date() : null,
      },
    });

    // Log engagement if module is newly completed (not previously completed)
    if (completed && !wasAlreadyCompleted) {
      const MODULE_COMPLETION_POINTS = 15;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { engagementPoints: { increment: MODULE_COMPLETION_POINTS } },
        }),
        prisma.engagementLog.create({
          data: {
            userId: user.id,
            eventType: 'module',
            points: MODULE_COMPLETION_POINTS,
            eventData: { moduleNum, moduleName: `SafeScape Module ${moduleNum}` },
          },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      progress: {
        ...progress,
        sectionData: JSON.parse(progress.sectionData || '{}'),
      },
    });
  } catch (error) {
    console.error('Error updating SafeScape progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
