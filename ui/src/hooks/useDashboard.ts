import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";
import type { OwnerDashboardResponse } from "../types/dashboard";

function areDashboardDataEqual(
    oldData: OwnerDashboardResponse | undefined,
    newData: OwnerDashboardResponse | undefined
): boolean {
    if (!oldData || !newData) return false;
    
    if (
        oldData.salesToday.total !== newData.salesToday.total ||
        oldData.salesToday.count !== newData.salesToday.count ||
        oldData.salesToday.average !== newData.salesToday.average ||
        oldData.cashVsDigitalSplit.cash !== newData.cashVsDigitalSplit.cash ||
        oldData.cashVsDigitalSplit.digital !== newData.cashVsDigitalSplit.digital ||
        oldData.inventoryStats.totalValue !== newData.inventoryStats.totalValue ||
        oldData.inventoryStats.lowStockCount !== newData.inventoryStats.lowStockCount
    ) {
        return false;
    }
    
    if (oldData.topProductsToday.length !== newData.topProductsToday.length) {
        return false;
    }
    
    if (oldData.salesByHour.length !== newData.salesByHour.length) {
        return false;
    }
    
    if (oldData.criticalStockAlerts.length !== newData.criticalStockAlerts.length) {
        return false;
    }
    
    if (oldData.recentProductionWastage.length !== newData.recentProductionWastage.length) {
        return false;
    }
    
    if (oldData.recentProductionRuns.length !== newData.recentProductionRuns.length) {
        return false;
    }
    
    if (
        oldData.auditInsights.deleteCount !== newData.auditInsights.deleteCount ||
        oldData.auditInsights.updateCount !== newData.auditInsights.updateCount ||
        oldData.auditInsights.createCount !== newData.auditInsights.createCount ||
        oldData.auditInsights.recentDeletes.length !== newData.auditInsights.recentDeletes.length
    ) {
        return false;
    }
    
    for (let i = 0; i < oldData.topProductsToday.length; i++) {
        const oldItem = oldData.topProductsToday[i];
        const newItem = newData.topProductsToday[i];
        if (
            oldItem.productName !== newItem.productName ||
            oldItem.revenue !== newItem.revenue ||
            oldItem.quantity !== newItem.quantity
        ) {
            return false;
        }
    }
    
    for (let i = 0; i < oldData.salesByHour.length; i++) {
        const oldItem = oldData.salesByHour[i];
        const newItem = newData.salesByHour[i];
        if (
            oldItem.hour !== newItem.hour ||
            oldItem.total !== newItem.total ||
            oldItem.count !== newItem.count
        ) {
            return false;
        }
    }
    
    for (let i = 0; i < oldData.criticalStockAlerts.length; i++) {
        const oldItem = oldData.criticalStockAlerts[i];
        const newItem = newData.criticalStockAlerts[i];
        if (
            oldItem.id !== newItem.id ||
            oldItem.currentStock !== newItem.currentStock ||
            oldItem.shortfall !== newItem.shortfall
        ) {
            return false;
        }
    }
    
    for (let i = 0; i < oldData.recentProductionWastage.length; i++) {
        const oldItem = oldData.recentProductionWastage[i];
        const newItem = newData.recentProductionWastage[i];
        if (
            oldItem.productionRunId !== newItem.productionRunId ||
            oldItem.wastage !== newItem.wastage ||
            oldItem.producedAt !== newItem.producedAt
        ) {
            return false;
        }
    }
    
    for (let i = 0; i < oldData.recentProductionRuns.length; i++) {
        const oldItem = oldData.recentProductionRuns[i];
        const newItem = newData.recentProductionRuns[i];
        if (
            oldItem.id !== newItem.id ||
            oldItem.quantityProduced !== newItem.quantityProduced ||
            oldItem.producedAt !== newItem.producedAt
        ) {
            return false;
        }
    }
    
    for (let i = 0; i < oldData.auditInsights.recentDeletes.length; i++) {
        const oldItem = oldData.auditInsights.recentDeletes[i];
        const newItem = newData.auditInsights.recentDeletes[i];
        if (
            oldItem.id !== newItem.id ||
            oldItem.timestamp !== newItem.timestamp
        ) {
            return false;
        }
    }
    
    return true;
}

export function useOwnerDashboard(enabled = true) {
    return useQuery({
        queryKey: ["ownerDashboard"],
        queryFn: async () => {
            return await dashboardService.getOwnerDashboard();
        },
        refetchInterval: 3000,
        enabled,
        structuralSharing: (oldData, newData) => {
            if (!oldData || !newData) return newData;
            
            if (areDashboardDataEqual(oldData, newData)) {
                return oldData;
            }
            
            return newData;
        },
    });
}


