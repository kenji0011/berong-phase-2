import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';

const prisma = new PrismaClient();

// Helper to get user from cookies - consistent with other kids APIs
async function getUserFromSession() {
  const cookieStore = await cookies();
  const bfpUserCookie = cookieStore.get('bfp_user');

  if (bfpUserCookie?.value) {
    try {
      const userData = await verifyToken(bfpUserCookie.value);
      if (userData?.id) {
        return userData;
      }
    } catch {
      // Token invalid
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 1. Fetch all active modules from DB
    const kidsModules = await prisma.kidsModule.findMany({
      where: { isActive: true },
      orderBy: { dayNumber: 'asc' },
    });

    // 2. Fetch user's progress
    const progressRecords = await prisma.safeScapeProgress.findMany({
      where: { userId: user.id },
    });

    // 3. Map to dashboard format
    // Logic: Module 1 is unlocked. Subsequent modules unlocked if prev is completed.

    // Create a map for quick progress lookup
    const progressMap = new Map();
    progressRecords.forEach(p => {
      progressMap.set(p.moduleNum, p);
    });

    const modules = kidsModules.map((mod, index) => {
      const userProgress = progressMap.get(mod.dayNumber);
      const isCompleted = userProgress?.completed || false;

      // Calculate active progress % (rough estimate based on sectionData if active but not complete)
      let progressPercent = 0;
      if (isCompleted) {
        progressPercent = 100;
      } else if (userProgress?.sectionData) {
        try {
          const sections = JSON.parse(userProgress.sectionData as string);
          const total = Object.keys(sections).length;
          // Simple heuristic: count true values. 
          // Note: total sections might vary per module, but this gives *some* feedback
          const completedCount = Object.values(sections).filter(v => v === true).length;
          if (total > 0) {
            progressPercent = Math.round((completedCount / Math.max(total, 4)) * 100); // Assume ~4 sections avg
          }
        } catch { }
      }

      // Locking logic
      let isLocked = true;
      if (mod.dayNumber === 1) {
        isLocked = false;
      } else {
        // Check if previous module (index-1) is completed
        const prevModuleNum = kidsModules[index - 1].dayNumber;
        const prevProgress = progressMap.get(prevModuleNum);
        if (prevProgress?.completed) {
          isLocked = false;
        }
      }

      // Add emojis based on title keywords (fallback since DB doesn't have emoji field yet)
      let emoji = "📚";
      if (mod.title.toLowerCase().includes("welcome")) emoji = "🚒";
      if (mod.title.toLowerCase().includes("kitchen")) emoji = "🍳";
      if (mod.title.toLowerCase().includes("escape")) emoji = "🚪";
      if (mod.title.toLowerCase().includes("community")) emoji = "🧯";
      if (mod.title.toLowerCase().includes("hero")) emoji = "🎖️";

      return {
        id: mod.id,
        title: mod.title,
        description: mod.description || "",
        dayNumber: mod.dayNumber,
        emoji: emoji,
        isLocked: isLocked,
        isCompleted: isCompleted,
        progress: progressPercent,
        // Helper link for frontend
        href: `/kids/safescape/${mod.dayNumber}`
      };
    });

    return NextResponse.json(modules);

  } catch (error) {
    console.error('Error fetching kids modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modules' },
      { status: 500 }
    );
  }
}
