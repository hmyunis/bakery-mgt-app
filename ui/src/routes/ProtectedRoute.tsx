import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../store";
import { getAuthToken, getRefreshToken } from "../lib/apiClient";
import { hasPagePermission, type PagePermission, type UserRole } from "../constants/roles";

type Props = {
    allowedRoles?: UserRole[];
    requiredPermission?: PagePermission;
    children?: React.ReactNode;
};

export function ProtectedRoute({ allowedRoles = [], requiredPermission, children }: Props) {
    const location = useLocation();
    const { isAuthenticated, roles, user } = useAppSelector((s) => s.auth);

    // Also check token directly as fallback (in case Redux hasn't rehydrated yet)
    const accessToken = getAuthToken();
    const refreshToken = getRefreshToken();
    const isAuth = isAuthenticated || !!accessToken || !!refreshToken;

    if (!isAuth) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    const hasRole = allowedRoles.length === 0 || allowedRoles.some((role) => roles.includes(role));

    if (!hasRole && allowedRoles.length > 0) {
        return <Navigate to="/access-denied" replace />;
    }

    let permissionRole = user?.role;
    let pagePermissions = user?.permissions;
    if (!permissionRole && accessToken) {
        try {
            const payload = JSON.parse(atob(accessToken.split(".")[1]));
            permissionRole = payload.role;
            pagePermissions = Array.isArray(payload.permissions) ? payload.permissions : [];
        } catch {
            // The auth initializer will handle an invalid token.
        }
    }

    if (
        requiredPermission &&
        !hasPagePermission(permissionRole, pagePermissions, requiredPermission)
    ) {
        return <Navigate to="/access-denied" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
}
