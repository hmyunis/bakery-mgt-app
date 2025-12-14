import { apiClient } from "../lib/apiClient";
import type { Sale, CreateSaleData, SaleListParams } from "../types/sales";

export interface SaleListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Sale[];
}

class SalesService {
    private normalizeSale(sale: any): Sale {
        return {
            id: sale.id,
            total_amount: parseFloat(
                sale.totalAmount?.toString() || sale.total_amount?.toString() || "0"
            ),
            created_at: sale.createdAt || sale.created_at,
            cashier: sale.cashier,
            cashier_name: sale.cashierName || sale.cashier_name || sale.cashier__username,
            items: (sale.items || []).map((item: any) => ({
                product: item.product,
                product_name: item.productName || item.product_name || "",
                quantity: parseInt(item.quantity?.toString() || "0"),
                unit_price: parseFloat(
                    item.unitPrice?.toString() || item.unit_price?.toString() || "0"
                ),
                subtotal: parseFloat(item.subtotal?.toString() || "0"),
            })),
            payments: (sale.payments || []).map((payment: any) => ({
                method__name:
                    payment.method__name ||
                    payment.method_Name ||
                    payment.methodName ||
                    payment.method?.name ||
                    "",
                amount: parseFloat(payment.amount?.toString() || "0"),
            })),
        };
    }

    /**
     * Get list of sales with pagination and filters
     */
    async getSales(params: SaleListParams = {}): Promise<SaleListResponse> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.cashier) queryParams.append("cashier", params.cashier.toString());
        if (params.start_date) queryParams.append("start_date", params.start_date);
        if (params.end_date) queryParams.append("end_date", params.end_date);

        const response = await apiClient.get<any>(`/sales/sales/?${queryParams.toString()}`);

        if (response.data && "data" in response.data && "pagination" in response.data) {
            const pagination = response.data.pagination;
            const results = (response.data.data || []).map((item: any) => this.normalizeSale(item));
            return {
                count: pagination.count || 0,
                next: pagination.next || null,
                previous: pagination.previous || null,
                results,
            };
        }

        if (response.data && "results" in response.data) {
            return {
                ...response.data,
                results: (response.data.results || []).map((item: any) => this.normalizeSale(item)),
            };
        }

        return {
            count: Array.isArray(response.data) ? response.data.length : 0,
            next: null,
            previous: null,
            results: Array.isArray(response.data)
                ? response.data.map((item: any) => this.normalizeSale(item))
                : [],
        };
    }

    /**
     * Get single sale by ID
     */
    async getSale(id: number): Promise<Sale> {
        const response = await apiClient.get<any>(`/sales/sales/${id}/`);
        const data = response.data?.data || response.data;
        return this.normalizeSale(data);
    }

    /**
     * Create a new sale
     */
    async createSale(data: CreateSaleData): Promise<Sale> {
        const response = await apiClient.post<any>("/sales/sales/", data);
        const responseData = response.data?.data || response.data;
        return this.normalizeSale(responseData);
    }

    /**
     * Delete a sale (admin-only). Backend will reverse stock changes.
     */
    async deleteSale(id: number): Promise<void> {
        await apiClient.delete(`/sales/sales/${id}/`);
    }
}

export const salesService = new SalesService();

