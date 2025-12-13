import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useThemeInit } from "../../hooks/useThemeInit";

export function DashboardLayout() {
    useThemeInit(); // Initialize theme from persisted state
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const toggleMobile = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    const closeMobile = () => {
        setIsMobileOpen(false);
    };

    return (
        <div className="min-h-screen flex bg-[var(--bg)]">
            <Sidebar
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onCloseMobile={closeMobile}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <Header
                    isCollapsed={isCollapsed}
                    onToggleSidebar={toggleSidebar}
                    onToggleMobile={toggleMobile}
                />
                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
