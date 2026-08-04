import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useThemeInit } from "../../hooks/useThemeInit";
import { useThemeColor } from "../../hooks/useThemeColor";
import { useBakerySettings } from "../../hooks/useBakery";

export function DashboardLayout() {
    useThemeInit(); // Initialize theme from persisted state
    const { data: bakerySettings } = useBakerySettings();
    useThemeColor(bakerySettings?.themeColor); // Apply dynamic theme color
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed((collapsed) => !collapsed);
    };

    return (
        <div className="flex min-h-screen min-h-dvh bg-[var(--bg)]">
            <Sidebar isCollapsed={isCollapsed} />
            <div className="flex min-w-0 flex-1 flex-col">
                <Header isCollapsed={isCollapsed} onToggleSidebar={toggleSidebar} />
                {/* Main Content */}
                <main className="flex-1 p-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
