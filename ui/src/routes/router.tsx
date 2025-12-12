import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "../pages/Landing";
import { NotFoundPage } from "../pages/NotFound";
import { AccessDeniedPage } from "../pages/AccessDenied";
import { DashboardPage } from "../pages/Dashboard";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <LandingPage />,
    },
    {
        path: "/app",
        element: <ProtectedRoute allowedRoles={["admin", "manager"]} />,
        children: [
            {
                index: true,
                element: <DashboardPage />,
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
