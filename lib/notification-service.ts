import { prisma } from './prisma';
import type { UserRole, ContentCategory } from '@prisma/client';

interface CreateNotificationData {
  title: string;
  message: string;
  type: string;
  category: ContentCategory;
  userIds?: number[]; // Optional: if specific users, otherwise will be sent to all users with matching permissions
  resourceId?: number; // Kept for API compatibility but not stored (column doesn't exist in production DB)
}

export class NotificationService {
  static async createNotification(data: CreateNotificationData) {
    try {
      const { title, message, type, category, userIds, resourceId } = data;

      // If specific user IDs are provided, send to those users
      if (userIds && userIds.length > 0) {
        const notifications = await Promise.all(
          userIds.map(async (userId) => {
            return await prisma.notification.create({
              data: {
                title,
                message,
                type,
                category,
                userId,
              }
            })
          })
        );
        return { success: true, notifications };
      }

      // Otherwise, find all users with matching permissions based on category
      let matchingUsers: { id: number }[] = [];

      switch (category) {
        case 'kids':
          matchingUsers = await prisma.user.findMany({
            where: {
              isActive: true,
              OR: [
                { role: 'admin' },
                { role: 'professional' },
                { role: 'kid' },
              ]
            },
            select: { id: true }
          });
          break;
        case 'adult':
          matchingUsers = await prisma.user.findMany({
            where: {
              isActive: true,
              OR: [
                { role: 'admin' },
                { role: 'professional' },
                { role: 'adult' },
              ]
            },
            select: { id: true }
          });
          break;
        case 'professional':
          matchingUsers = await prisma.user.findMany({
            where: {
              isActive: true,
              OR: [
                { role: 'admin' },
                { role: 'professional' },
              ]
            },
            select: { id: true }
          });
          break;
        default:
          // For any other category, send to all users
          matchingUsers = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true }
          });
      }

      console.log(`[NotificationService] Found ${matchingUsers.length} matching users for category ${category}`);

      // Create notifications for all matching users
      const notifications = await Promise.all(
        matchingUsers.map(async (user) => {
          return await prisma.notification.create({
            data: {
              title,
              message,
              type,
              category,
              userId: user.id,
            }
          })
        })
      );

      return { success: true, notifications };
    } catch (error) {
      console.error('Error creating notifications:', error);
      return { success: false, error: 'Failed to create notifications' };
    }
  }

  static async getUserNotifications(userId: number) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, notifications };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return { success: false, error: 'Failed to fetch notifications' };
    }
  }

  static async updateReadStatus(notificationId: number, userId: number, isRead: boolean) {
    try {
      const updateResult = await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead },
      });

      if (updateResult.count === 0) {
        return { success: false, error: 'Notification not found' };
      }

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      })
      return { success: true, notification };
    } catch (error) {
      console.error('Error updating notification read status:', error);
      return { success: false, error: 'Failed to update read status' };
    }
  }

  static async markAllAsRead(userId: number) {
    try {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: 'Failed to mark all as read' };
    }
  }

  static async deleteNotification(notificationId: number, userId: number) {
    try {
      const deleteResult = await prisma.notification.deleteMany({
        where: { id: notificationId, userId },
      });
      if (deleteResult.count === 0) {
        return { success: false, error: 'Notification not found' };
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: 'Failed to delete notification' };
    }
  }
}
