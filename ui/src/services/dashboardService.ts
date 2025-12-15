import { apiClient } from "../lib/apiClient";
import type { OwnerDashboardResponse } from "../types/dashboard";

class DashboardService {
    private normalizeNumber(value: any): number {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    async getOwnerDashboard(): Promise<OwnerDashboardResponse> {
        const response = await apiClient.get<any>("/dashboard/owner/");
        const data = response.data?.data ?? response.data;

        const salesToday = data.salesToday ?? data.sales_today ?? {};
        const split = data.cashVsDigitalSplit ?? data.cash_vs_digital_split ?? {};
        const topProducts = data.topProductsToday ?? data.top_products_today ?? [];
        const salesByHour = data.salesByHour ?? data.sales_by_hour ?? [];
        const critical = data.criticalStockAlerts ?? data.critical_stock_alerts ?? [];
        const wastage = data.recentProductionWastage ?? data.recent_production_wastage ?? [];
        const inventoryStats = data.inventoryStats ?? data.inventory_stats ?? {};
        const productionRuns = data.recentProductionRuns ?? data.recent_production_runs ?? [];
        const auditInsights = data.auditInsights ?? data.audit_insights ?? {};

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
            topProductsToday: (topProducts || []).map((p: any) => ({
                productName: p.productName ?? p.product_name,
                quantity: Number(p.quantity ?? 0),
                revenue: this.normalizeNumber(p.revenue),
            })),
            salesByHour: (salesByHour || []).map((h: any) => ({
                hour: Number(h.hour ?? 0),
                count: Number(h.count ?? 0),
                total: this.normalizeNumber(h.total),
            })),
            criticalStockAlerts: (critical || []).map((i: any) => ({
                id: Number(i.id),
                name: i.name,
                unit: i.unit,
                currentStock: this.normalizeNumber(i.currentStock ?? i.current_stock),
                reorderPoint: this.normalizeNumber(i.reorderPoint ?? i.reorder_point),
                shortfall: this.normalizeNumber(i.shortfall),
            })),
            recentProductionWastage: (wastage || []).map((w: any) => ({
                productionRunId: Number(w.productionRunId ?? w.production_run_id),
                producedAt: w.producedAt ?? w.produced_at,
                producedItemName: w.producedItemName ?? w.produced_item_name ?? null,
                ingredientName: w.ingredientName ?? w.ingredient_name,
                unit: w.unit,
                wastage: this.normalizeNumber(w.wastage),
            })),
            inventoryStats: {
                totalValue: this.normalizeNumber(inventoryStats.totalValue ?? inventoryStats.total_value),
                totalItems: Number(inventoryStats.totalItems ?? inventoryStats.total_items ?? 0),
                lowStockCount: Number(inventoryStats.lowStockCount ?? inventoryStats.low_stock_count ?? 0),
            },
            recentProductionRuns: (productionRuns || []).map((r: any) => ({
                id: Number(r.id),
                itemName: r.itemName ?? r.item_name ?? null,
                quantityProduced: this.normalizeNumber(r.quantityProduced ?? r.quantity_produced),
                producedAt: r.producedAt ?? r.produced_at,
                chefName: r.chefName ?? r.chef_name ?? null,
            })),
            auditInsights: {
                deleteCount: Number(auditInsights.deleteCount ?? auditInsights.delete_count ?? 0),
                updateCount: Number(auditInsights.updateCount ?? auditInsights.update_count ?? 0),
                createCount: Number(auditInsights.createCount ?? auditInsights.create_count ?? 0),
                recentDeletes: ((auditInsights.recentDeletes ?? auditInsights.recent_deletes) || []).map((d: any) => ({
                    id: Number(d.id),
                    tableName: d.tableName ?? d.table_name,
                    recordId: d.recordId ?? d.record_id,
                    actorName: d.actorName ?? d.actor_name,
                    timestamp: d.timestamp,
                })),
            },
        };
    }
}

export const dashboardService = new DashboardService();


