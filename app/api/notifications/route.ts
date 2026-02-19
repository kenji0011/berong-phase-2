import { NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notification-service';
import { prisma } from '@/lib/prisma';
import { ContentCategory } from '@prisma/client';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(request: Request) {
  try {
    // SECURITY: Require authentication
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url);
    // Use authenticated user's ID instead of trusting query param
    const numericUserId = auth.id as number;

    const result = await NotificationService.getUserNotifications(numericUserId);

    if (result.success) {
      return NextResponse.json(result.notifications);
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // SECURITY: Only admins can create notifications
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
    }

    const body = await request.json();
    const { title, message, type, category, userIds } = body;

    if (!title || !message || !type || !category) {
      return NextResponse.json(
        { error: 'Title, message, type, and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['kids', 'adult', 'professional'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be kids, adult, or professional' },
        { status: 400 }
      );
    }

    const result = await NotificationService.createNotification({
      title,
      message,
      type,
      category: category as ContentCategory,
      userIds
    });

    if (result.success) {
      return NextResponse.json(result.notifications);
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
