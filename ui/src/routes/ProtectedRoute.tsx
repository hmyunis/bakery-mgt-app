import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../store";

type Props = {
  allowedRoles?: string[];
  children?: React.ReactNode;
};

export function ProtectedRoute({ allowedRoles = [], children }: Props) {
  const location = useLocation();
  const { isAuthenticated, roles } = useAppSelector((s) => s.auth);

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  const hasRole =
    allowedRoles.length === 0 || allowedRoles.some((role) => roles.includes(role));

  if (!hasRole) {
    return <Navigate to="/access-denied" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

