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
import { EmployeesPage } from "../pages/Employees";
import { EmployeeDetailPage } from "../pages/EmployeeDetail";
import { HrPage } from "../pages/Hr";
import { ProtectedRoute } from "./ProtectedRoute";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Navigate } from "react-router-dom";

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
            <ProtectedRoute allowedRoles={["admin", "storekeeper", "chef", "cashier"]}>
                <DashboardLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <DashboardPage />,
            },
            {
                path: "dashboard",
                element: <DashboardPage />,
            },
            {
                path: "inventory",
                element: (
                    <ProtectedRoute allowedRoles={["admin", "storekeeper"]}>
                        <InventoryPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "production",
                element: (
                    <ProtectedRoute allowedRoles={["admin", "chef"]}>
                        <ProductionPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "sales",
                element: (
                    <ProtectedRoute allowedRoles={["admin", "cashier"]}>
                        <SalesPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "users",
                element: (
                    <ProtectedRoute allowedRoles={["admin"]}>
                        <UsersPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "employees",
                element: (
                    <ProtectedRoute allowedRoles={["admin"]}>
                        <EmployeesPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "employees/:employeeId",
                element: (
                    <ProtectedRoute allowedRoles={["admin"]}>
                        <EmployeeDetailPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "hr",
                element: (
                    <ProtectedRoute allowedRoles={["admin"]}>
                        <HrPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "attendance",
                element: (
                    <ProtectedRoute allowedRoles={["admin"]}>
                        <Navigate to="/app/hr?tab=attendance" replace />
                    </ProtectedRoute>
                ),
            },
            {
                path: "leaves",
                element: (
                    <ProtectedRoute allowedRoles={["admin"]}>
                        <Navigate to="/app/hr?tab=leaves" replace />
                    </ProtectedRoute>
                ),
            },
            {
                path: "shifts",
                element: (
                    <ProtectedRoute allowedRoles={["admin"]}>
                        <Navigate to="/app/hr?tab=shifts" replace />
                    </ProtectedRoute>
                ),
            },
            {
                path: "settings",
                element: (
                    <ProtectedRoute allowedRoles={["admin", "storekeeper", "chef", "cashier"]}>
                        <SettingsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "audit-logs",
                element: (
                    <ProtectedRoute allowedRoles={["admin"]}>
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
