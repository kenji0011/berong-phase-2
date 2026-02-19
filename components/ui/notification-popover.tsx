"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, MoreHorizontal, Trash2, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  category: string;
  isRead: boolean;
  createdAt: string;
  resourceId?: number | null;
}

export function NotificationPopover() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Load notifications from the database
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/notifications?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        } else {
          setError('Failed to load notifications');
        }
      } catch (err) {
        setError('Error loading notifications');
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Set up polling to refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const router = useRouter();

  const toggleReadStatus = async (id: number, isRead: boolean) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id, isRead }),
      });

      if (response.ok) {
        setNotifications(notifications.map(n =>
          n.id === id ? { ...n, isRead } : n
        ));
      } else {
        console.error('Failed to update notification status');
      }
    } catch (err) {
      console.error('Error updating notification status:', err);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/notifications/${id}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== id));
      } else {
        console.error('Failed to delete notification');
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      // Mark all unread notifications as read in the UI first
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));

      // Then update in the database
      const unreadNotificationIds = notifications.filter(n => !n.isRead).map(n => n.id);
      await Promise.all(unreadNotificationIds.map(id => toggleReadStatus(id, true)));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revert the UI changes if there was an error
      setNotifications(notifications.map(n => ({ ...n, isRead: false })));
    }
  };

  const handleGo = (notification: Notification) => {
    // Mark as read first
    if (!notification.isRead) {
      toggleReadStatus(notification.id, true);
    }

    if (notification.resourceId) {
      if (notification.type === 'blog') {
        router.push(`/adult/blog/${notification.resourceId}`);
      } else if (notification.type === 'video') {
        // Assuming video page or section, might need adjustment based on route structure
        // For now, redirecting to generic video page if specific ID route doesn't exist
        // or if query params are used. Let's assume /adult/videos matches the resource type
        router.push(`/adult/videos`);
      } else {
        // Fallback based on category
        router.push(`/${notification.category}`);
      }
    } else {
      // Fallback for notifications without resourceId
      if (notification.type === 'blog') router.push('/adult/blog');
      else if (notification.type === 'video') router.push('/adult/videos');
      else router.push(`/${notification.category}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <Bell className="h-4 w-4 text-destructive" />;
      case "warning":
        return <Bell className="h-4 w-4 text-yellow-500" />;
      case "success":
        return <Bell className="h-4 w-4 text-green-500" />;
      case "blog":
        return <Bell className="h-4 w-4 text-primary" />;
      case "video":
        return <Bell className="h-4 w-4 text-secondary" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-destructive";
      case "warning":
        return "bg-yellow-500";
      case "success":
        return "bg-green-500";
      case "blog":
        return "bg-primary";
      case "video":
        return "bg-secondary";
      default:
        return "bg-primary";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-white/50 text-white bg-transparent hover:bg-white hover:text-red-700 hover:border-white transition-all hover:scale-110 relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[450px]">
          <div className="p-2">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : error ? (
              <div className="p-6 text-center text-sm text-destructive">
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-md transition-colors group relative ${!notification.isRead
                      ? "bg-accent/50 hover:bg-accent/70"
                      : "hover:bg-muted/50"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${getNotificationBadge(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium line-clamp-2">
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                              NEW
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 text-foreground bg-background/50 hover:bg-background border border-transparent hover:border-border shadow-sm transition-all"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleGo(notification)}>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          <span>Go</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleReadStatus(notification.id, !notification.isRead)}>
                          {!notification.isRead ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              <span>Mark as Read</span>
                            </>
                          ) : (
                            <>
                              <Bell className="mr-2 h-4 w-4" />
                              <span>Mark as Unread</span>
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteNotification(notification.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover >
  );
}
