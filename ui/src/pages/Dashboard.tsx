import { Spinner } from "@heroui/react";
import {
    Package,
    AlertTriangle,
    DollarSign,
    ShoppingCart,
    BarChart3,
    ChefHat,
    ShieldAlert,
} from "lucide-react";
import { PageTitle } from "../components/ui/PageTitle";
import { useOwnerDashboard } from "../hooks/useDashboard";
import { CashVsDigitalPie } from "../components/dashboard/CashVsDigitalPie";
import { SalesByHourChart } from "../components/dashboard/SalesByHourChart";
import { TopProductsChart } from "../components/dashboard/TopProductsChart";
import { useAppSelector } from "../store";

function formatMoney(n: number) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

function formatDateTime(iso: string) {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function formatDateShort(isoOrDate: string) {
    try {
        return new Date(isoOrDate).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
    } catch {
        return isoOrDate;
    }
}

export function DashboardPage() {
    const { user } = useAppSelector((s) => s.auth);
    const isAdmin = user?.role === "admin";

    const { data, isLoading, isError } = useOwnerDashboard(isAdmin);

    if (!isAdmin) {
        return (
            <div className="space-y-6">
                <PageTitle title="Dashboard" subtitle="High-level overview (Owner/Admin only)." />
                <div className="rounded-xl border border-white/10 bg-[var(--panel)]/80 backdrop-blur-xl p-6">
                    <p className="text-sm text-[var(--muted)]">
                        Dashboard analytics are available to Admin only.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading && !data) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="space-y-6">
                <PageTitle title="Dashboard" subtitle="High-level oversight." />
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Failed to load dashboard data. Please refresh.
                    </p>
                </div>
            </div>
        );
    }

    const salesPerformance = data.salesPerformance ?? {
        todayTotal: 0,
        lastThreeDays: [] as Array<{
            date: string;
            salesTotal: number;
            productionCost: number;
        }>,
        lastThreeDaysAverage: 0,
        changePercent: null as number | null,
    };

    return (
        <div className="space-y-6">
            <PageTitle title="Dashboard" subtitle="High-level oversight and analytics." />

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sales Today - 2x width */}
                <div className="sm:col-span-2 rounded-xl p-6 border border-slate-300 dark:border-slate-700 bg-gradient-to-br from-indigo-600/90 via-purple-600/90 to-fuchsia-600/90 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <ShoppingCart className="h-6 w-6 text-white/90" />
                        <span className="text-sm text-white/80">Today</span>
                    </div>
                    <div className="text-4xl font-bold mb-2">
                        {formatMoney(data.salesToday.total)} ETB
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/80">
                        <span>
                            {data.salesToday.count} sale
                            {data.salesToday.count !== 1 ? "s" : ""}
                        </span>
                        {data.salesToday.count > 0 && (
                            <span>Avg: {formatMoney(data.salesToday.average)} ETB</span>
                        )}
                    </div>
                </div>

                {/* Inventory Value */}
                <div className="rounded-xl p-5 border border-slate-300 dark:border-slate-700 bg-[var(--panel)]/80 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-2">
                        <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-[var(--muted)]">Inventory</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--fg)]">
                        {formatMoney(data.inventoryStats.totalValue)} ETB
                    </div>
                    <div className="text-sm text-[var(--muted)] mt-1">
                        {data.inventoryStats.totalItems} items
                    </div>
                </div>

                {/* Low Stock Alert */}
                <div className="rounded-xl p-5 border border-slate-300 dark:border-slate-700 bg-[var(--panel)]/80 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs text-[var(--muted)]">Alerts</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--fg)]">
                        {data.inventoryStats.lowStockCount}
                    </div>
                    <div className="text-sm text-[var(--muted)] mt-1">Low stock items</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales by Hour */}
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--panel)]/80 backdrop-blur-xl p-4 sm:p-6">
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            <div className="text-base font-medium text-[var(--fg)]">
                                Sales by Hour
                            </div>
                        </div>
                        <div className="text-sm text-[var(--muted)]">Last 12 hours revenue</div>
                    </div>
                    <SalesByHourChart data={data.salesByHour} />
                </div>

                {/* Top Products */}
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--panel)]/80 backdrop-blur-xl p-4 sm:p-6">
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <div className="text-base font-medium text-[var(--fg)]">
                                Top Products Today
                            </div>
                        </div>
                        <div className="text-sm text-[var(--muted)]">Best sellers by revenue</div>
                    </div>
                    <TopProductsChart data={data.topProductsToday} />
                </div>
            </div>

            {/* Insights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Production Runs */}
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--panel)]/80 backdrop-blur-xl p-6">
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <ChefHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <div className="text-base font-medium text-[var(--fg)]">
                                Recent Production Runs
                            </div>
                        </div>
                        <div className="text-sm text-[var(--muted)]">
                            Today's production activity
                        </div>
                    </div>

                    {data.recentProductionRuns.length === 0 ? (
                        <div className="text-sm text-[var(--muted)] py-4">
                            No production runs today.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.recentProductionRuns.map((run) => (
                                <div
                                    key={run.id}
                                    className="rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 p-3"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-[var(--fg)] truncate">
                                                {run.itemName ?? "Production"}
                                            </div>
                                            <div className="text-xs text-[var(--muted)] truncate">
                                                {run.chefName ? `By ${run.chefName}` : "System"} ·{" "}
                                                {formatDateTime(run.producedAt)}
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 text-nowrap">
                                            {formatMoney(run.quantityProduced)} units
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sales Performance */}
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--panel)]/80 backdrop-blur-xl p-6">
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            <div className="text-base font-medium text-[var(--fg)]">
                                Sales Performance
                            </div>
                        </div>
                        <div className="text-sm text-[var(--muted)]">
                            Compared to the previous 3 days
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
                            <div className="text-xs text-[var(--muted)]">Today</div>
                            <div className="text-lg font-bold text-[var(--fg)]">
                                {formatMoney(salesPerformance.todayTotal)} ETB
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
                            <div className="text-xs text-[var(--muted)]">Avg (last 3 days)</div>
                            <div className="text-lg font-bold text-[var(--fg)]">
                                {formatMoney(salesPerformance.lastThreeDaysAverage)} ETB
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
                            <div className="text-xs text-[var(--muted)]">Change</div>
                            {salesPerformance.changePercent === null ? (
                                <div className="text-lg font-bold text-[var(--muted)]">—</div>
                            ) : (
                                <div
                                    className={[
                                        "text-lg font-bold",
                                        salesPerformance.changePercent >= 0
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-red-600 dark:text-red-400",
                                    ].join(" ")}
                                >
                                    {salesPerformance.changePercent >= 0 ? "+" : ""}
                                    {salesPerformance.changePercent.toFixed(1)}%
                                </div>
                            )}
                        </div>
                    </div>

                    {salesPerformance.lastThreeDays.length > 0 && (
                        <div className="mt-4 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900/50">
                                    <tr className="text-left">
                                        <th className="px-3 py-2 text-xs font-medium text-[var(--muted)]">
                                            Day
                                        </th>
                                        <th className="px-3 py-2 text-xs font-medium text-[var(--muted)]">
                                            Sales
                                        </th>
                                        <th className="px-3 py-2 text-xs font-medium text-[var(--muted)]">
                                            Production Cost
                                        </th>
                                        <th className="px-3 py-2 text-xs font-medium text-[var(--muted)]">
                                            Net
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {salesPerformance.lastThreeDays.map((d) => {
                                        const net = d.salesTotal - d.productionCost;
                                        return (
                                            <tr key={d.date}>
                                                <td className="px-3 py-2 font-medium text-[var(--fg)]">
                                                    {formatDateShort(d.date)}
                                                </td>
                                                <td className="px-3 py-2 text-[var(--fg)]">
                                                    {formatMoney(d.salesTotal)} ETB
                                                </td>
                                                <td className="px-3 py-2 text-[var(--fg)]">
                                                    {formatMoney(d.productionCost)} ETB
                                                </td>
                                                <td
                                                    className={[
                                                        "px-3 py-2 font-medium",
                                                        net >= 0
                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                            : "text-red-600 dark:text-red-400",
                                                    ].join(" ")}
                                                >
                                                    {formatMoney(net)} ETB
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cash vs Digital Split */}
                <div className="lg:col-span-2 overflow-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--panel)]/80 backdrop-blur-xl p-4 sm:p-6">
                    <div className="mb-4">
                        <div className="text-base font-medium text-[var(--fg)]">
                            Payment Methods
                        </div>
                        <div className="text-sm text-[var(--muted)]">Today's split</div>
                    </div>
                    <CashVsDigitalPie
                        cash={data.cashVsDigitalSplit.cash}
                        digital={data.cashVsDigitalSplit.digital}
                    />
                </div>

                {/* Critical Stock Alerts */}
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--panel)]/80 backdrop-blur-xl p-6">
                    <div className="mb-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <div className="text-base font-medium text-[var(--fg)]">
                                Critical Stock Alerts
                            </div>
                        </div>
                        <div className="text-sm text-[var(--muted)]">
                            Ingredients below reorder point
                        </div>
                    </div>

                    {data.criticalStockAlerts.length === 0 ? (
                        <div className="text-sm text-[var(--muted)] py-4">No critical items.</div>
                    ) : (
                        <div className="space-y-3">
                            {data.criticalStockAlerts.map((i) => (
                                <div
                                    key={i.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 p-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium text-[var(--fg)] truncate">
                                            {i.name}
                                        </div>
                                        <div className="text-xs text-[var(--muted)]">
                                            Stock: {formatMoney(i.currentStock)} {i.unit} / Reorder:{" "}
                                            {formatMoney(i.reorderPoint)} {i.unit}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                                            -{formatMoney(i.shortfall)} {i.unit}
                                        </div>
                                        <div className="text-xs text-[var(--muted)]">shortfall</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Production Wastage (wider on large devices) */}
                <div className="lg:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--panel)]/80 backdrop-blur-xl p-6">
                    <div className="mb-4">
                        <div className="text-base font-medium text-[var(--fg)]">
                            Recent Production Wastage
                        </div>
                        <div className="text-sm text-[var(--muted)]">
                            Latest positive wastage entries
                        </div>
                    </div>

                    {data.recentProductionWastage.length === 0 ? (
                        <div className="text-sm text-[var(--muted)] py-4">No wastage recorded.</div>
                    ) : (
                        <div className="space-y-3">
                            {data.recentProductionWastage.map((w) => (
                                <div
                                    key={`${w.productionRunId}-${w.ingredientName}-${w.producedAt}`}
                                    className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10 p-3"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-[var(--fg)] truncate">
                                                {w.ingredientName}
                                            </div>
                                            <div className="text-xs text-[var(--muted)] truncate">
                                                Run #{w.productionRunId} ·{" "}
                                                {w.producedItemName ?? "Production"} ·{" "}
                                                {formatDateTime(w.producedAt)}
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 text-nowrap">
                                            +{formatMoney(w.wastage)} {w.unit}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Audit Insights (moved to bottom) */}
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--panel)]/80 backdrop-blur-xl p-6">
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldAlert className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <div className="text-base font-medium text-[var(--fg)]">
                                Audit Insights
                            </div>
                        </div>
                        <div className="text-sm text-[var(--muted)]">Last 24 hours activity</div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                                    {data.auditInsights.deleteCount}
                                </div>
                                <div className="text-xs text-[var(--muted)]">Deletes</div>
                            </div>
                            <div className="text-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                    {data.auditInsights.updateCount}
                                </div>
                                <div className="text-xs text-[var(--muted)]">Updates</div>
                            </div>
                            <div className="text-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                    {data.auditInsights.createCount}
                                </div>
                                <div className="text-xs text-[var(--muted)]">Creates</div>
                            </div>
                        </div>

                        {data.auditInsights.recentDeletes.length > 0 && (
                            <div>
                                <div className="text-xs font-medium text-[var(--muted)] mb-2">
                                    Recent Delete Actions
                                </div>
                                <div className="space-y-2">
                                    {data.auditInsights.recentDeletes.map((del) => (
                                        <div
                                            key={del.id}
                                            className="flex items-center justify-between gap-2 text-xs p-2 rounded border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-[var(--fg)] truncate">
                                                    {del.tableName} #{del.recordId}
                                                </div>
                                                <div className="text-[var(--muted)] truncate">
                                                    {del.actorName} ·{" "}
                                                    {formatDateTime(del.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
