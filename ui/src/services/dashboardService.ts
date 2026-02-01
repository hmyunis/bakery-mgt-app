import { apiClient } from "../lib/apiClient";
import type { OwnerDashboardResponse } from "../types/dashboard";
import type { ApiResponse } from "../types/api";
import type { Unit } from "../types/inventory";

class DashboardService {
    private normalizeNumber(value: unknown): number {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    async getOwnerDashboard(): Promise<OwnerDashboardResponse> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/dashboard/owner/");
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ??
            (response.data as Record<string, unknown>);

        const salesToday = (data.salesToday ?? data.sales_today ?? {}) as Record<string, unknown>;
        const split = (data.cashVsDigitalSplit ?? data.cash_vs_digital_split ?? {}) as Record<
            string,
            unknown
        >;
        const topProducts = (data.topProductsToday ?? data.top_products_today ?? []) as Record<
            string,
            unknown
        >[];
        const salesByHour = (data.salesByHour ?? data.sales_by_hour ?? []) as Record<
            string,
            unknown
        >[];
        const critical = (data.criticalStockAlerts ?? data.critical_stock_alerts ?? []) as Record<
            string,
            unknown
        >[];
        const wastage = (data.recentProductionWastage ??
            data.recent_production_wastage ??
            []) as Record<string, unknown>[];
        const inventoryStats = (data.inventoryStats ?? data.inventory_stats ?? {}) as Record<
            string,
            unknown
        >;
        const productionRuns = (data.recentProductionRuns ??
            data.recent_production_runs ??
            []) as Record<string, unknown>[];
        const auditInsights = (data.auditInsights ?? data.audit_insights ?? {}) as Record<
            string,
            unknown
        >;
        const salesPerformance = (data.salesPerformance ?? data.sales_performance ?? {}) as Record<
            string,
            unknown
        >;

        return {
            salesToday: {
                total: this.normalizeNumber(salesToday.total),
                count: this.normalizeNumber(salesToday.count),
                average: this.normalizeNumber(salesToday.average),
            },
            cashVsDigitalSplit: {
                cash: this.normalizeNumber(split.cash),
                digital: this.normalizeNumber(split.digital),
            },
            topProductsToday: (topProducts || []).map((p) => ({
                productName: (p.productName ?? p.product_name) as string,
                quantity: Number(p.quantity ?? 0),
                revenue: this.normalizeNumber(p.revenue),
            })),
            salesByHour: (salesByHour || []).map((h) => ({
                hour: Number(h.hour ?? 0),
                count: Number(h.count ?? 0),
                total: this.normalizeNumber(h.total),
            })),
            criticalStockAlerts: (critical || []).map((i) => ({
                id: Number(i.id),
                name: i.name as string,
                unit: i.unit as Unit,
                currentStock: this.normalizeNumber(i.currentStock ?? i.current_stock),
                reorderPoint: this.normalizeNumber(i.reorderPoint ?? i.reorder_point),
                shortfall: this.normalizeNumber(i.shortfall),
            })),
            recentProductionWastage: (wastage || []).map((w) => ({
                productionRunId: Number(w.productionRunId ?? w.production_run_id),
                producedAt: w.producedAt as string,
                producedItemName: (w.producedItemName ?? w.produced_item_name ?? null) as
                    | string
                    | null,
                ingredientName: (w.ingredientName ?? w.ingredient_name) as string,
                unit: w.unit as Unit,
                wastage: this.normalizeNumber(w.wastage),
            })),
            inventoryStats: {
                totalValue: this.normalizeNumber(
                    inventoryStats.totalValue ?? inventoryStats.total_value
                ),
                totalItems: Number(inventoryStats.totalItems ?? inventoryStats.total_items ?? 0),
                lowStockCount: Number(
                    inventoryStats.lowStockCount ?? inventoryStats.low_stock_count ?? 0
                ),
            },
            recentProductionRuns: (productionRuns || []).map((r) => ({
                id: Number(r.id),
                itemName: (r.itemName ?? r.item_name ?? null) as string | null,
                quantityProduced: this.normalizeNumber(r.quantityProduced ?? r.quantity_produced),
                producedAt: r.producedAt as string,
                chefName: (r.chefName ?? r.chef_name ?? null) as string | null,
            })),
            auditInsights: {
                deleteCount: Number(auditInsights.deleteCount ?? auditInsights.delete_count ?? 0),
                updateCount: Number(auditInsights.updateCount ?? auditInsights.update_count ?? 0),
                createCount: Number(auditInsights.createCount ?? auditInsights.create_count ?? 0),
                recentDeletes: (
                    ((auditInsights.recentDeletes ?? auditInsights.recent_deletes) as Record<
                        string,
                        unknown
                    >[]) || []
                ).map((d) => ({
                    id: Number(d.id),
                    tableName: (d.tableName ?? d.table_name) as string,
                    recordId: (d.recordId ?? d.record_id) as string,
                    actorName: (d.actorName ?? d.actor_name) as string,
                    timestamp: d.timestamp as string,
                })),
            },
            salesPerformance: {
                todayTotal: this.normalizeNumber(
                    salesPerformance.todayTotal ?? salesPerformance.today_total
                ),
                lastThreeDays:
                    (
                        (salesPerformance.lastThreeDays ??
                            salesPerformance.last_three_days) as Record<string, unknown>[]
                    )?.map((d) => ({
                        date: String(d.date),
                        salesTotal: this.normalizeNumber(d.salesTotal ?? d.sales_total),
                        productionCost: this.normalizeNumber(d.productionCost ?? d.production_cost),
                    })) ?? [],
                lastThreeDaysAverage: this.normalizeNumber(
                    salesPerformance.lastThreeDaysAverage ??
                        salesPerformance.last_three_days_average
                ),
                changePercent:
                    (salesPerformance.changePercent ?? salesPerformance.change_percent) === null
                        ? null
                        : this.normalizeNumber(
                              salesPerformance.changePercent ?? salesPerformance.change_percent
                          ),
            },
        };
    }
}

export const dashboardService = new DashboardService();
