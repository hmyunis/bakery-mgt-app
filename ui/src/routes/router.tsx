import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "../pages/Landing";
import { NotFoundPage } from "../pages/NotFound";
import { AccessDeniedPage } from "../pages/AccessDenied";
import { Login } from "../pages/Login";
import { DashboardPage } from "../pages/Dashboard";
import { InventoryPage } from "../pages/Inventory";
import { ProductionPage } from "../pages/Production";
import { SalesPage } from "../pages/Sales";
import { UsersPage } from "../pages/Users";
import { SettingsPage } from "../pages/Settings";
import { ProtectedRoute } from "./ProtectedRoute";
import { DashboardLayout } from "../components/layout/DashboardLayout";

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
        path: "settings",
        element: (
          <ProtectedRoute allowedRoles={["admin", "storekeeper", "chef", "cashier"]}>
            <SettingsPage />
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
