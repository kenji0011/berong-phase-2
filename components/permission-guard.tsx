'use client';

import { useAuth } from '@/lib/auth-context';
import { PermissionDialog } from '@/components/ui/permission-dialog';
import { useState, ReactNode } from 'react';

interface PermissionGuardProps {
  requiredPermission: 'accessKids' | 'accessAdult' | 'accessProfessional' | 'isAdmin';
  children: ReactNode;
  targetPath?: string;
  fallbackPath?: string;
}

export function PermissionGuard({
  requiredPermission,
  children,
  targetPath = '',
  fallbackPath = '/'
}: PermissionGuardProps) {
  const { user, isAuthenticated } = useAuth();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  // Function to check if user has permission (admin has all permissions)
  const hasRequiredPermission = (): boolean => {
    if (!isAuthenticated || !user) {
      return false;
    }

    return user.role === 'admin' || user.permissions[requiredPermission];
  };

  // Handler for clicks on guarded elements
  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!hasRequiredPermission()) {
      e.preventDefault();
      e.stopPropagation();
      setShowPermissionDialog(true);
    }
  };

  const handleDialogClose = () => {
    setShowPermissionDialog(false);
  };

  // Wrap the children with a div that has the click handler
  return (
    <>
      <div className="w-full" onClick={handleClick} onKeyDown={handleClick}>
        {children}
      </div>
      <PermissionDialog
        isOpen={showPermissionDialog}
        onClose={handleDialogClose}
        message={`You don't have permission to access this section. Please contact an administrator to request ${requiredPermission.replace('access', '').toLowerCase()} access.`}
      />
    </>
  );
}
