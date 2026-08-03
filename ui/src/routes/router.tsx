import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "../pages/Landing";
import { NotFoundPage } from "../pages/NotFound";
import { AccessDeniedPage } from "../pages/AccessDenied";
import { Login } from "../pages/Login";
import { DashboardPage } from "../pages/Dashboard";
import { AuditLogsPage } from "../pages/AuditLogs";
import { InventoryPage } from "../pages/Inventory";
import { ProductionPage } from "../pages/Production";
import { SalesPage } from "../pages/Sales";
import { UsersPage } from "../pages/Users";
import { SettingsPage } from "../pages/Settings";
import { TreasuryPage } from "../pages/Treasury";
import { EmployeesPage } from "../pages/Employees";
import { EmployeeDetailPage } from "../pages/EmployeeDetail";
import { HrPage } from "../pages/Hr";
import { ProtectedRoute } from "./ProtectedRoute";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../store";
import { getDefaultAppPath } from "../constants/roles";
import { getAuthToken } from "../lib/apiClient";

function AppIndex() {
    const user = useAppSelector((state) => state.auth.user);
    if (user?.role) {
        return <Navigate to={getDefaultAppPath(user.role, user.permissions)} replace />;
    }
    let path = "/access-denied";
    try {
        const payload = JSON.parse(atob((getAuthToken() || "").split(".")[1]));
        path = getDefaultAppPath(payload.role, payload.permissions || []);
    } catch {
        // Keep the access-denied fallback for a malformed token.
    }
    return <Navigate to={path} replace />;
}

export const router = createBrowserRouter([
    {
        path: "/",
        element: <LandingPage />,
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/app",
        element: (
            <ProtectedRoute allowedRoles={["admin", "staff"]}>
                <DashboardLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <AppIndex />,
            },
            {
                path: "dashboard",
                element: (
                    <ProtectedRoute requiredPermission="dashboard">
                        <DashboardPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "inventory",
                element: (
                    <ProtectedRoute requiredPermission="inventory">
                        <InventoryPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "production",
                element: (
                    <ProtectedRoute requiredPermission="production">
                        <ProductionPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "sales",
                element: (
                    <ProtectedRoute requiredPermission="sales">
                        <SalesPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "treasury",
                element: (
                    <ProtectedRoute requiredPermission="treasury">
                        <TreasuryPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "users",
                element: (
                    <ProtectedRoute requiredPermission="users">
                        <UsersPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "employees",
                element: (
                    <ProtectedRoute requiredPermission="employees">
                        <EmployeesPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "employees/:employeeId",
                element: (
                    <ProtectedRoute requiredPermission="employees">
                        <EmployeeDetailPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "hr",
                element: (
                    <ProtectedRoute requiredPermission="hr">
                        <HrPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "attendance",
                element: (
                    <ProtectedRoute requiredPermission="hr">
                        <Navigate to="/app/hr?tab=attendance" replace />
                    </ProtectedRoute>
                ),
            },
            {
                path: "leaves",
                element: (
                    <ProtectedRoute requiredPermission="hr">
                        <Navigate to="/app/hr?tab=leaves" replace />
                    </ProtectedRoute>
                ),
            },
            {
                path: "shifts",
                element: (
                    <ProtectedRoute requiredPermission="hr">
                        <Navigate to="/app/hr?tab=shifts" replace />
                    </ProtectedRoute>
                ),
            },
            {
                path: "settings",
                element: (
                    <ProtectedRoute requiredPermission="settings">
                        <SettingsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "audit-logs",
                element: (
                    <ProtectedRoute requiredPermission="audit_logs">
                        <AuditLogsPage />
                    </ProtectedRoute>
                ),
            },
        ],
    },
    {
        path: "/access-denied",
        element: <AccessDeniedPage />,
    },
    {
        path: "*",
        element: <NotFoundPage />,
    },
]);
