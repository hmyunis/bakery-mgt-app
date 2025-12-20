import { apiClient } from "../lib/apiClient";
import type { Sale, CreateSaleData, SaleListParams } from "../types/sales";
import type { ApiResponse, WrappedPaginatedResponse, PaginatedResponse } from "../types/api";

export interface SaleListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Sale[];
}

class SalesService {
    private normalizeSale(sale: Record<string, unknown>): Sale {
        return {
            id: sale.id as number,
            total_amount: parseFloat(
                (sale.totalAmount as string) || (sale.total_amount as string) || "0"
            ),
            created_at: (sale.createdAt || sale.created_at) as string,
            cashier: sale.cashier as number,
            cashier_name: (sale.cashierName ||
                sale.cashier_name ||
                sale.cashier__username) as string,
            items: ((sale.items as Record<string, unknown>[]) || []).map((item) => ({
                product: item.product as number,
                product_name: (item.productName || item.product_name || "") as string,
                quantity: parseInt((item.quantity as string) || "0"),
                unit_price: parseFloat(
                    (item.unitPrice as string) || (item.unit_price as string) || "0"
                ),
                subtotal: parseFloat((item.subtotal as string) || "0"),
            })),
            payments: ((sale.payments as Record<string, unknown>[]) || []).map((payment) => ({
                method__name: (payment.method__name ||
                    payment.method_Name ||
                    payment.methodName ||
                    (payment.method as Record<string, unknown>)?.name ||
                    "") as string,
                amount: parseFloat((payment.amount as string) || "0"),
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

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/sales/sales/?${queryParams.toString()}`);

        const responseData = response.data;

        if (
            responseData &&
            !Array.isArray(responseData) &&
            "data" in responseData &&
            "pagination" in responseData
        ) {
            const wrapped = responseData as WrappedPaginatedResponse<Record<string, unknown>>;
            const results = (wrapped.data || []).map((item) => this.normalizeSale(item));
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results,
            };
        }

        if (responseData && !Array.isArray(responseData) && "results" in responseData) {
            const paginated = responseData as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((item) => this.normalizeSale(item)),
            };
        }

        if (Array.isArray(responseData)) {
            return {
                count: responseData.length,
                next: null,
                previous: null,
                results: responseData.map((item) =>
                    this.normalizeSale(item as Record<string, unknown>)
                ),
            };
        }

        return {
            count: 0,
            next: null,
            previous: null,
            results: [],
        };
    }

    /**
     * Get single sale by ID
     */
    async getSale(id: number): Promise<Sale> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/sales/sales/${id}/`);
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeSale(data);
    }

    /**
     * Create a new sale
     */
    async createSale(data: CreateSaleData): Promise<Sale> {
        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/sales/sales/", data);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
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
