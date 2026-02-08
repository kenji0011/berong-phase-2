'use client';

import { useAuth } from '@/lib/auth-context';
import { PermissionDialog } from '@/components/ui/permission-dialog';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: 'accessKids' | 'accessAdult' | 'accessProfessional' | 'isAdmin';
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requiredPermission = 'accessAdult', // Default to adult access as a general permission
  fallbackPath = '/'
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Check if user has the required permission
      const permissionGranted = user.permissions[requiredPermission];
      setHasPermission(permissionGranted);

      if (!permissionGranted) {
        setShowPermissionDialog(true);
      }
    } else if (!isLoading && !isAuthenticated) {
      // If not authenticated, redirect to auth page
      router.push('/auth');
    }
  }, [user, isAuthenticated, isLoading, requiredPermission, router]);

  if (isLoading) {
    // Show loading state while checking authentication
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-br from-red-700 via-red-600 to-orange-600">
        <div className="flex flex-col items-center">
          <div className="relative">
            {/* Spinning ring */}
            <div className="absolute -inset-4 border-4 border-yellow-400/30 rounded-full"></div>
            <div className="absolute -inset-4 border-4 border-transparent border-t-yellow-400 border-r-orange-500 rounded-full animate-spin"></div>
            {/* Glow */}
            <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-xl animate-pulse"></div>
            {/* Logo */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-yellow-400/50">
              <img
                src="/berong-official-logo.jpg"
                alt="Loading"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <p className="text-white font-semibold text-lg mt-8">Loading...</p>
          <div className="flex gap-1 justify-center mt-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    );
  }

  // If user doesn't have permission, show the dialog but still render the content
  // This allows the user to see the page but be notified about the permission issue
  return (
    <>
      {children}
      <PermissionDialog
        isOpen={showPermissionDialog}
        onClose={() => {
          setShowPermissionDialog(false);
          // Optionally redirect after closing the dialog
          if (fallbackPath) {
            router.push(fallbackPath);
          }
        }}
        message={`You don't have permission to access this section. Please contact an administrator to request ${requiredPermission.replace('access', '').toLowerCase()} access.`}
      />
    </>
  );
}
