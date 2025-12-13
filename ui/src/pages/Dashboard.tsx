import { Card, CardBody, CardHeader, Chip, Button } from "@heroui/react";
import { LayoutDashboard, TrendingUp, Package, Users, ArrowUpRight, Sparkles } from "lucide-react";
import { useAppSelector } from "../store";
import { PageHeader } from "../components/ui/PageHeader";

export function DashboardPage() {
    const { user, roles } = useAppSelector((state) => state.auth);

    const stats = [
        {
            label: "Total Sales",
            value: "₦0",
            icon: TrendingUp,
            color: "cyan",
            change: "+0%",
            changeType: "positive",
        },
        {
            label: "Inventory",
            value: "0",
            icon: Package,
            color: "emerald",
            change: "0 items",
            changeType: "neutral",
        },
        {
            label: "Users",
            value: "0",
            icon: Users,
            color: "violet",
            change: "Active",
            changeType: "neutral",
        },
        {
            label: "Role",
            value: roles[0] || "N/A",
            icon: LayoutDashboard,
            color: "amber",
            change: "Current",
            changeType: "neutral",
        },
    ];

    const colorClasses: Record<string, { bg: string; text: string; gradient: string }> = {
        cyan: {
            bg: "bg-cyan-500/10",
            text: "text-cyan-400",
            gradient: "from-cyan-500/20 to-transparent",
        },
        emerald: {
            bg: "bg-emerald-500/10",
            text: "text-emerald-400",
            gradient: "from-emerald-500/20 to-transparent",
        },
        violet: {
            bg: "bg-violet-500/10",
            text: "text-violet-400",
            gradient: "from-violet-500/20 to-transparent",
        },
        amber: {
            bg: "bg-amber-500/10",
            text: "text-amber-400",
            gradient: "from-amber-500/20 to-transparent",
        },
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Welcome back, {user?.name || "User"}! Here's an overview of your bakery
                        operations.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    const colors = colorClasses[stat.color];

                    return (
                        <Card
                            key={stat.label}
                            className="group bg-[var(--panel)]/80 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 overflow-hidden"
                        >
                            {/* Gradient background */}
                            <div
                                className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                            />

                            <CardBody className="p-5 lg:p-6 relative">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <p className="text-sm text-[var(--muted)] font-medium">
                                            {stat.label}
                                        </p>
                                        <p className="text-2xl lg:text-3xl font-bold text-[var(--fg)] capitalize">
                                            {stat.value}
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            {stat.changeType === "positive" && (
                                                <ArrowUpRight className="size-3.5 text-emerald-400" />
                                            )}
                                            <span
                                                className={`text-xs font-medium ${
                                                    stat.changeType === "positive"
                                                        ? "text-emerald-400"
                                                        : "text-[var(--muted)]"
                                                }`}
                                            >
                                                {stat.change}
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        className={`${colors.bg} p-3 rounded-xl transition-transform duration-300 group-hover:scale-110`}
                                    >
                                        <Icon className={`size-5 lg:size-6 ${colors.text}`} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <Card className="bg-[var(--panel)]/80 backdrop-blur-xl border border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent" />

                <CardHeader className="relative">
                    <div className="flex items-center gap-2">
                        <Sparkles className="size-5 text-amber-400" />
                        <h2 className="text-lg lg:text-xl font-semibold text-[var(--fg)]">
                            Quick Actions
                        </h2>
                    </div>
                </CardHeader>

                <CardBody className="relative">
                    <div className="flex flex-wrap gap-3">
                        {roles.includes("admin") && (
                            <Button
                                variant="flat"
                                className="bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 font-medium"
                                startContent={<Users className="size-4" />}
                            >
                                Manage Users
                            </Button>
                        )}
                        {roles.some((r) => ["admin", "storekeeper"].includes(r)) && (
                            <Button
                                variant="flat"
                                className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-medium"
                                startContent={<Package className="size-4" />}
                            >
                                View Inventory
                            </Button>
                        )}
                        {roles.some((r) => ["admin", "chef"].includes(r)) && (
                            <Button
                                variant="flat"
                                className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-medium"
                            >
                                Production
                            </Button>
                        )}
                        {roles.some((r) => ["admin", "cashier"].includes(r)) && (
                            <Button
                                variant="flat"
                                className="bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-medium"
                                startContent={<TrendingUp className="size-4" />}
                            >
                                Process Sales
                            </Button>
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
