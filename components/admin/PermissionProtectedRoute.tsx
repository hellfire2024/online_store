import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
  fallbackPath?: string;
}

const PermissionProtectedRoute: React.FC<PermissionProtectedRouteProps> = ({
  children,
  requiredPermission,
  fallbackPath = '/admin',
}) => {
  const { can } = usePermissions();

  if (!can(requiredPermission)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default PermissionProtectedRoute;
