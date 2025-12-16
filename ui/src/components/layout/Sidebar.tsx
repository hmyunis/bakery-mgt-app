import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Package,
    ChefHat,
    ShoppingCart,
    Users,
    Settings,
    ScrollText,
    X,
} from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import type { UserRole } from "../../constants/roles";
import { useBakerySettings } from "../../hooks/useBakery";

interface NavItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    roles: UserRole[];
}

const navItems: NavItem[] = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/app/dashboard",
        roles: ["admin"],
    },
    {
        label: "Sales",
        icon: ShoppingCart,
        path: "/app/sales",
        roles: ["admin", "cashier"],
    },
    {
        label: "Production",
        icon: ChefHat,
        path: "/app/production",
        roles: ["admin", "chef"],
    },
    {
        label: "Inventory",
        icon: Package,
        path: "/app/inventory",
        roles: ["admin", "storekeeper"],
    },
    {
        label: "Users",
        icon: Users,
        path: "/app/users",
        roles: ["admin"],
    },
    {
        label: "Audit Logs",
        icon: ScrollText,
        path: "/app/audit-logs",
        roles: ["admin"],
    },
    {
        label: "Settings",
        icon: Settings,
        path: "/app/settings",
        roles: ["admin", "storekeeper", "chef", "cashier"],
    },
];

interface SidebarProps {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    onCloseMobile: () => void;
}

export function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile }: SidebarProps) {
    const location = useLocation();
    const { roles } = useAppSelector((state) => state.auth);
    const { data: bakerySettings } = useBakerySettings();

    const visibleItems = navItems.filter((item) =>
        roles.some((role: UserRole) => item.roles.includes(role))
    );

    const NavLink = ({ item }: { item: NavItem }) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        const linkContent = (
            <Link
                to={item.path}
                onClick={onCloseMobile}
                className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isCollapsed ? "justify-center" : "",
                    isActive
                        ? "bg-slate-200 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-r-[3px] border-slate-500"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                )}
            >
                <span className="h-5 w-5 flex-shrink-0">
                    <Icon className="h-5 w-5" />
                </span>
                {!isCollapsed && <span>{item.label}</span>}
            </Link>
        );

        if (isCollapsed) {
            return (
                <Tooltip
                    content={item.label}
                    placement="right"
                    delay={0}
                    closeDelay={0}
                    classNames={{
                        content:
                            "bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm",
                    }}
                >
                    {linkContent}
                </Tooltip>
            );
        }

        return linkContent;
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onCloseMobile}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col",
                    "bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700",
                    "transition-all duration-300 ease-in-out overflow-hidden",
                    isCollapsed ? "w-16" : "w-64",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header */}
                <div
                    className={cn(
                        "flex items-center justify-center p-4 border-b border-gray-400 dark:border-gray-500",
                        isCollapsed ? "px-0" : "px-4",
                        !isCollapsed && "justify-between"
                    )}
                >
                    {!isCollapsed && (
                        <Link
                            to="/app/dashboard"
                            className="flex items-center space-x-2 hover:opacity-80"
                        >
                            <div className="min-w-16 px-1.5">
                                {bakerySettings?.logoUrl ? (
                                    <img
                                        src={bakerySettings.logoUrl}
                                        alt={bakerySettings.name || "Bakery"}
                                        className="size-14 rounded-lg object-contain"
                                    />
                                ) : (
                                    <div className="size-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center">
                                        <span className="text-lg">🍞</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-800 dark:text-gray-200 text-nowrap">
                                    {bakerySettings?.name || "Bakery"}
                                </p>
                                <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Management
                                </p>
                            </div>
                        </Link>
                    )}

                    {/* Mobile close button */}
                    {!isCollapsed && (
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={onCloseMobile}
                            className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <X className="size-4 text-gray-600 dark:text-gray-400" />
                        </Button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3">
                    <ul className="space-y-2">
                        {visibleItems.map((item) => (
                            <li key={item.path}>
                                <NavLink item={item} />
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
        </>
    );
}
