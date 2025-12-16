import { apiClient } from "../lib/apiClient";

export interface DashboardStats {
    hourlySales: { hour: string; total: number }[];
    topProducts: { name: string; quantity: number }[];
    paymentMethods: { name: string; value: number }[];
    productionVsSales: { name: string; produced: number; sold: number }[];
    wastage: { name: string; wastage: number }[];
    cashierPerformance: { name: string; sales: number; count: number }[];
    productsInStock: number;
}

export const reportsService = {
    getDashboardStats: async (date?: string): Promise<DashboardStats> => {
        const response = await apiClient.get("/reports/dashboard-stats/", {
            params: { date },
        });
        return response.data.data;
    },

    exportReport: async (startDate: string, endDate: string) => {
        const response = await apiClient.get("/reports/export/", {
            params: { start_date: startDate, end_date: endDate },
            responseType: "blob",
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `bakery_report_${startDate}_${endDate}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },
};
