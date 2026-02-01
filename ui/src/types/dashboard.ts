export interface OwnerDashboardResponse {
    salesToday: {
        total: number;
        count: number;
        average: number;
    };
    cashVsDigitalSplit: {
        cash: number;
        digital: number;
    };
    topProductsToday: Array<{
        productName: string;
        quantity: number;
        revenue: number;
    }>;
    salesByHour: Array<{
        hour: number;
        count: number;
        total: number;
    }>;
    criticalStockAlerts: Array<{
        id: number;
        name: string;
        unit: string;
        currentStock: number;
        reorderPoint: number;
        shortfall: number;
    }>;
    recentProductionWastage: Array<{
        productionRunId: number;
        producedAt: string;
        producedItemName: string | null;
        ingredientName: string;
        unit: string;
        wastage: number;
    }>;
    inventoryStats: {
        totalValue: number;
        totalItems: number;
        lowStockCount: number;
    };
    recentProductionRuns: Array<{
        id: number;
        itemName: string | null;
        quantityProduced: number;
        producedAt: string;
        chefName: string | null;
    }>;
    auditInsights: {
        deleteCount: number;
        updateCount: number;
        createCount: number;
        recentDeletes: Array<{
            id: number;
            tableName: string;
            recordId: string;
            actorName: string;
            timestamp: string;
        }>;
    };
    salesPerformance: {
        todayTotal: number;
        lastThreeDays: Array<{
            date: string;
            salesTotal: number;
            productionCost: number;
        }>;
        lastThreeDaysAverage: number;
        changePercent: number | null;
    };
}
