import { useState } from "react";
import {
    Button,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Switch,
    Avatar,
} from "@heroui/react";
import { Moon, Sun, User, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { toggleMode } from "../../store/settingsSlice";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LanguageToggle } from "../ui/LanguageToggle";
import { useTranslation, tr } from "../../locales";

interface HeaderProps {
    isCollapsed: boolean;
    onToggleSidebar: () => void;
}

export function Header({ isCollapsed, onToggleSidebar }: HeaderProps) {
    const dispatch = useAppDispatch();
    const { mode } = useAppSelector((state) => state.settings);
    const { user } = useAppSelector((state) => state.auth);
    const { logout, isLoggingOut } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleLogout = async () => {
        setIsProfileOpen(false);
        await logout();
    };

    const handleProfileNavigate = () => {
        setIsProfileOpen(false);
        navigate("/app/settings");
    };

    return (
        <header className="sticky top-0 z-30 border-b border-slate-300 bg-gradient-to-r from-[var(--panel)]/90 via-[var(--panel)]/80 to-[var(--panel)]/90 pt-[env(safe-area-inset-top)] shadow-lg shadow-black/5 backdrop-blur-xl dark:border-slate-600">
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />

            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
                {/* Left side: desktop sidebar control */}
                <div className="flex items-center gap-2">
                    {/* Desktop sidebar toggle */}
                    <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        className="hidden lg:flex hover:bg-white/10 transition-colors px-2"
                        onPress={onToggleSidebar}
                        title={isCollapsed ? tr("Expand sidebar") : tr("Collapse sidebar")}
                    >
                        {isCollapsed ? (
                            <PanelLeft className="size-5 text-[var(--fg)]" />
                        ) : (
                            <PanelLeftClose className="size-5 text-[var(--fg)]" />
                        )}
                    </Button>
                </div>

                {/* Right side controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <LanguageToggle />
                    {/* Dark Mode Toggle */}
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/5 border border-white/5">
                        <Sun className="size-4 text-amber-400" />
                        <Switch
                            isSelected={mode === "dark"}
                            onValueChange={() => dispatch(toggleMode())}
                            size="sm"
                            aria-label={t("toggleDarkMode")}
                            classNames={{
                                wrapper: "group-data-[selected=true]:bg-[var(--accent)]",
                            }}
                        />
                        <Moon className="size-4 text-indigo-400" />
                    </div>

                    {/* Profile Dropdown */}
                    <Dropdown
                        placement="bottom-end"
                        isOpen={isProfileOpen}
                        onOpenChange={setIsProfileOpen}
                    >
                        <DropdownTrigger>
                            <Button
                                variant="light"
                                className="h-auto py-1.5 px-2 gap-2.5 hover:bg-white/10 transition-all duration-200 rounded-xl border border-transparent hover:border-white/10"
                            >
                                <div className="relative">
                                    <Avatar
                                        src={user?.avatar}
                                        name={user?.name || tr("User")}
                                        size="sm"
                                        className="bg-gradient-to-br from-[var(--accent)] to-purple-500 text-white ring-2 ring-white/20"
                                        fallback={<User className="size-4 text-white" />}
                                    />
                                    {/* Online indicator */}
                                    <span className="absolute bottom-0 right-0 size-2.5 bg-emerald-400 rounded-full border-2 border-[var(--panel)]" />
                                </div>
                                <div className="hidden sm:flex flex-col items-start">
                                    <span className="text-sm font-semibold text-[var(--fg)]">
                                        {user?.name || tr("User")}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                                        {user?.role || "N/A"}
                                    </span>
                                </div>
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label={t("profile")}
                            variant="solid"
                            classNames={{
                                base: "bg-[var(--panel)] min-w-[200px]",
                            }}
                        >
                            <DropdownItem
                                key="profile"
                                startContent={<User className="size-4" />}
                                onPress={handleProfileNavigate}
                                className="py-2.5"
                            >
                                {t("profile")}
                            </DropdownItem>
                            <DropdownItem
                                key="logout"
                                className="text-danger py-2.5"
                                color="danger"
                                startContent={<LogOut className="size-4" />}
                                onPress={handleLogout}
                            >
                                {isLoggingOut ? t("loggingOut") : t("logout")}
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
}
