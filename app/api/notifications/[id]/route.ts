import { NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notification-service';
import { requireAuth } from '@/lib/auth-guard';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require authentication
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const resolvedParams = await params;
    const notificationId = parseInt(resolvedParams.id);
    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    // Use authenticated user's ID instead of trusting request body
    const numericUserId = auth.id as number;

    const result = await NotificationService.markAsRead(notificationId, numericUserId);

    if (result.success) {
      return NextResponse.json(result.notification);
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require authentication
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const resolvedParams = await params;
    const notificationId = parseInt(resolvedParams.id);
    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    // Use authenticated user's ID
    const numericUserId = auth.id as number;

    const result = await NotificationService.deleteNotification(notificationId, numericUserId);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
