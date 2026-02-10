import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

/**
 * Custom hook to check user permissions and show a notification if access is denied
 * @param requiredPermission - The permission required to access the resource
 * @param targetPath - The path the user was trying to access (for notification purposes)
 */
export function usePermissionCheck(requiredPermission: 'accessKids' | 'accessAdult' | 'accessProfessional' | 'isAdmin', targetPath: string) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const permissionGranted = user.role === 'admin' || user.permissions[requiredPermission];
      setHasPermission(permissionGranted);
      
      // If permission is denied, automatically show the dialog
      if (!permissionGranted) {
        setShowPermissionDialog(true);
      }
    } else if (!isLoading && !isAuthenticated) {
      // If not authenticated, redirect to login
      router.push('/auth');
      setHasPermission(false);
    }
  }, [user, isAuthenticated, isLoading, requiredPermission, router]);

  const handleDialogClose = () => {
    setShowPermissionDialog(false);
    // Redirect user back to the homepage or a safe location
    router.push('/');
  };

  return {
    hasPermission,
    showPermissionDialog,
    setShowPermissionDialog,
    handleDialogClose,
    isLoading
  };
}
