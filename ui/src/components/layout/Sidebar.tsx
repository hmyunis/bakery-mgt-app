import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Package,
    ChefHat,
    ShoppingCart,
    Users,
    UsersRound,
    UserRound,
    Settings,
    ScrollText,
    Landmark,
    MoreHorizontal,
    X,
} from "lucide-react";
import { Tooltip } from "@heroui/react";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { hasPagePermission, type PagePermission } from "../../constants/roles";
import { useBakerySettings } from "../../hooks/useBakery";
import { useTranslation, tr } from "../../locales";

interface NavItem {
    localeKey: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    permission: PagePermission;
}

const navItems: NavItem[] = [
    {
        localeKey: "Dashboard",
        icon: LayoutDashboard,
        path: "/app/dashboard",
        permission: "dashboard",
    },
    {
        localeKey: "Sales",
        icon: ShoppingCart,
        path: "/app/sales",
        permission: "sales",
    },
    {
        localeKey: "Treasury",
        icon: Landmark,
        path: "/app/treasury",
        permission: "treasury",
    },
    {
        localeKey: "Production",
        icon: ChefHat,
        path: "/app/production",
        permission: "production",
    },
    {
        localeKey: "Inventory",
        icon: Package,
        path: "/app/inventory",
        permission: "inventory",
    },
    {
        localeKey: "Users",
        icon: Users,
        path: "/app/users",
        permission: "users",
    },
    {
        localeKey: "Employees",
        icon: UserRound,
        path: "/app/employees",
        permission: "employees",
    },
    {
        localeKey: "HR",
        icon: UsersRound,
        path: "/app/hr",
        permission: "hr",
    },
    {
        localeKey: "Audit Logs",
        icon: ScrollText,
        path: "/app/audit-logs",
        permission: "audit_logs",
    },
    {
        localeKey: "Settings",
        icon: Settings,
        path: "/app/settings",
        permission: "settings",
    },
];

interface SidebarProps {
    isCollapsed: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) {
    const { t } = useTranslation();
    const location = useLocation();
    const { user } = useAppSelector((state) => state.auth);
    const { data: bakerySettings } = useBakerySettings();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const translatedItems = navItems.map((item) => ({ ...item, label: t(item.localeKey) }));
    const visibleItems = translatedItems.filter((item) =>
        hasPagePermission(user?.role, user?.permissions, item.permission)
    );
    const hasOverflow = visibleItems.length > 5;
    const primaryItems = hasOverflow ? visibleItems.slice(0, 4) : visibleItems.slice(0, 5);
    const overflowItems = hasOverflow ? visibleItems.slice(4) : [];
    const isItemActive = (item: NavItem) =>
        location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    const isMoreActive = overflowItems.some(isItemActive);

    useEffect(() => {
        if (!isMoreOpen) return;

        const previousOverflow = document.body.style.overflow;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsMoreOpen(false);
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [isMoreOpen]);

    const DesktopNavLink = ({ item }: { item: NavItem }) => {
        const Icon = item.icon;
        const isActive = isItemActive(item);

        const linkContent = (
            <Link
                to={item.path}
                className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isCollapsed && "justify-center",
                    isActive
                        ? "border-r-[3px] border-slate-500 bg-slate-200 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                )}
            >
                <span className="h-5 w-5 flex-shrink-0">
                    <Icon className="h-5 w-5" />
                </span>
                {!isCollapsed && <span>{item.label}</span>}
            </Link>
        );

        if (!isCollapsed) return linkContent;

        return (
            <Tooltip
                content={item.label}
                placement="right"
                delay={0}
                closeDelay={0}
                classNames={{
                    content:
                        "border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200",
                }}
            >
                {linkContent}
            </Tooltip>
        );
    };

    const MobileNavLink = ({ item, inSheet = false }: { item: NavItem; inSheet?: boolean }) => {
        const Icon = item.icon;
        const isActive = isItemActive(item);

        return (
            <Link
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                    "group flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-center font-medium transition-all duration-150 active:scale-95",
                    inSheet ? "min-h-20 p-2 text-xs" : "min-h-12 px-1 py-1 text-[9px]",
                    isActive
                        ? "bg-slate-200 text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                )}
            >
                <Icon
                    className={cn(
                        "shrink-0 transition-transform duration-150 group-active:scale-90",
                        inSheet ? "size-6" : "size-[22px]"
                    )}
                />
                <span className="w-full truncate px-0.5">{item.label}</span>
            </Link>
        );
    };

    return (
        <>
            <aside
                className={cn(
                    "sticky top-0 hidden h-screen flex-col overflow-hidden border-r border-gray-200 bg-gray-50 transition-[width] duration-200 ease-out dark:border-gray-700 dark:bg-gray-900 lg:flex",
                    isCollapsed ? "w-16" : "w-64"
                )}
            >
                <div
                    className={cn(
                        "flex items-center justify-center border-b border-gray-400 p-4 dark:border-gray-500",
                        isCollapsed ? "px-0" : "px-4"
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
                                        alt={bakerySettings.name || tr("Bakery")}
                                        className="size-14 rounded-lg object-contain"
                                    />
                                ) : (
                                    <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-purple-500">
                                        <span className="text-lg">🍞</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-nowrap text-lg font-bold text-gray-800 dark:text-gray-200">
                                    {bakerySettings?.name || tr("Bakery")}
                                </p>
                                <p className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                    {t("management")}
                                </p>
                            </div>
                        </Link>
                    )}
                </div>

                <nav className="flex-1 p-3" aria-label={tr("Desktop navigation")}>
                    <ul className="space-y-2">
                        {visibleItems.map((item) => (
                            <li key={item.path}>
                                <DesktopNavLink item={item} />
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            {visibleItems.length > 0 && (
                <nav
                    aria-label={tr("Mobile navigation")}
                    className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-700/90 dark:bg-slate-950/95 lg:hidden"
                >
                    <div
                        className="mx-auto grid max-w-lg gap-1 px-2 py-1.5"
                        style={{
                            gridTemplateColumns: `repeat(${primaryItems.length + (hasOverflow ? 1 : 0)}, minmax(0, 1fr))`,
                        }}
                    >
                        {primaryItems.map((item) => (
                            <MobileNavLink key={item.path} item={item} />
                        ))}

                        {hasOverflow && (
                            <button
                                type="button"
                                aria-label={tr("Show more navigation items")}
                                aria-expanded={isMoreOpen}
                                onClick={() => setIsMoreOpen(true)}
                                className={cn(
                                    "flex !min-h-12 !w-full !min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[9px] font-medium transition-all duration-150 active:scale-95",
                                    isMoreActive
                                        ? "bg-slate-200 text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                                )}
                            >
                                <MoreHorizontal className="size-[22px] shrink-0" />
                                <span>{tr("More")}</span>
                            </button>
                        )}
                    </div>
                </nav>
            )}

            {isMoreOpen && (
                <div className="fixed inset-0 z-[60] lg:hidden">
                    <button
                        type="button"
                        aria-label={tr("Close more navigation")}
                        onClick={() => setIsMoreOpen(false)}
                        className="absolute inset-0 !h-full !w-full !min-w-0 bg-slate-950/50 backdrop-blur-[2px]"
                    />
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="more-navigation-title"
                        className="animate-slide-up absolute inset-x-0 bottom-0 rounded-t-[1.75rem] border border-b-0 border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl dark:border-slate-700 dark:bg-slate-950"
                    >
                        <div className="mx-auto mb-2 h-1.5 w-11 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h2
                                    id="more-navigation-title"
                                    className="text-base font-semibold text-slate-950 dark:text-white"
                                >
                                    {tr("More")}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {tr("All remaining sections")}
                                </p>
                            </div>
                            <button
                                type="button"
                                aria-label={tr("Close more navigation")}
                                onClick={() => setIsMoreOpen(false)}
                                className="flex !size-11 !min-w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {overflowItems.map((item) => (
                                <MobileNavLink key={item.path} item={item} inSheet />
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}
