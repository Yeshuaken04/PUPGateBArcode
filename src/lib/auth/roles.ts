import { UserRole } from '@/types/database';

export const ROLE_PERMISSIONS: Record<UserRole, {
  canManageUsers: boolean;
  canManageGates: boolean;
  canManageStudents: boolean;
  canManualOpenGate: boolean;
  canViewReports: boolean;
  canExportData: boolean;
}> = {
  super_admin: {
    canManageUsers: true,
    canManageGates: true,
    canManageStudents: true,
    canManualOpenGate: true,
    canViewReports: true,
    canExportData: true,
  },
  admin: {
    canManageUsers: false,
    canManageGates: true,
    canManageStudents: true,
    canManualOpenGate: true,
    canViewReports: true,
    canExportData: true,
  },
  guard: {
    canManageUsers: false,
    canManageGates: false,
    canManageStudents: false,
    canManualOpenGate: true,
    canViewReports: false,
    canExportData: false,
  },
  faculty: {
    canManageUsers: false,
    canManageGates: false,
    canManageStudents: true,
    canManualOpenGate: false,
    canViewReports: true,
    canExportData: true,
  },
  viewer: {
    canManageUsers: false,
    canManageGates: false,
    canManageStudents: false,
    canManualOpenGate: false,
    canViewReports: true,
    canExportData: false,
  },
};

export function hasPermission(role: UserRole, permission: keyof typeof ROLE_PERMISSIONS['super_admin']): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}
