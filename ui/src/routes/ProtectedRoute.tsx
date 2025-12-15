import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../store";
import { getAuthToken } from "../lib/apiClient";
import type { UserRole } from "../constants/roles";

type Props = {
    allowedRoles?: UserRole[];
    children?: React.ReactNode;
};

export function ProtectedRoute({ allowedRoles = [], children }: Props) {
    const location = useLocation();
    const { isAuthenticated, roles } = useAppSelector((s) => s.auth);

    // Also check token directly as fallback (in case Redux hasn't rehydrated yet)
    const token = getAuthToken();
    const isAuth = isAuthenticated || !!token;

    if (!isAuth) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    const hasRole = allowedRoles.length === 0 || allowedRoles.some((role) => roles.includes(role));

    if (!hasRole && allowedRoles.length > 0) {
        return <Navigate to="/access-denied" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
}
