import { apiClient } from "../lib/apiClient";
import type {
    Sale,
    CreateSaleData,
    SaleListParams,
    CashierStatementParams,
    CashierStatementResponse,
} from "../types/sales";
import type { ApiResponse, WrappedPaginatedResponse, PaginatedResponse } from "../types/api";

export interface SaleListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Sale[];
}

class SalesService {
    private normalizeNumber(value: unknown): number {
        if (typeof value === "number") return value;
        if (typeof value === "string") {
            const parsed = Number.parseFloat(value);
            return Number.isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    private normalizeSale(sale: Record<string, unknown>): Sale {
        return {
            id: sale.id as number,
            total_amount: this.normalizeNumber(sale.totalAmount || sale.total_amount),
            created_at: (sale.createdAt || sale.created_at) as string,
            cashier: sale.cashier as number,
            cashier_name: (sale.cashierName ||
                sale.cashier_name ||
                sale.cashier__username) as string,
            receipt_issued:
                typeof sale.receiptIssued === "boolean"
                    ? sale.receiptIssued
                    : typeof sale.receipt_issued === "boolean"
                      ? sale.receipt_issued
                      : false,
            items: ((sale.items as Record<string, unknown>[]) || []).map((item) => ({
                product: item.product as number,
                product_name: (item.productName || item.product_name || "") as string,
                quantity: this.normalizeNumber(item.quantity),
                unit_price: this.normalizeNumber(item.unitPrice || item.unit_price),
                subtotal: this.normalizeNumber(item.subtotal),
            })),
            payments: ((sale.payments as Record<string, unknown>[]) || []).map((payment) => ({
                method__name: (payment.method__name ||
                    payment.method_Name ||
                    payment.methodName ||
                    (payment.method as Record<string, unknown>)?.name ||
                    "") as string,
                amount: this.normalizeNumber(payment.amount),
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
        if (typeof params.receipt_issued === "boolean")
            queryParams.append("receipt_issued", params.receipt_issued ? "true" : "false");

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

    /**
     * Admin-only cashier statement with server-side date-time range filtering.
     */
    async getCashierStatement(params: CashierStatementParams): Promise<CashierStatementResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append("cashier", params.cashier.toString());
        if (params.start_time) queryParams.append("start_time", params.start_time);
        if (params.end_time) queryParams.append("end_time", params.end_time);

        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/sales/sales/cashier-statement/?${queryParams.toString()}`);

        const raw =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return {
            cashier: {
                id: this.normalizeNumber((raw.cashier as Record<string, unknown>)?.id),
                username: ((raw.cashier as Record<string, unknown>)?.username || "") as string,
                fullName: ((raw.cashier as Record<string, unknown>)?.fullName || "") as string,
                phoneNumber: ((raw.cashier as Record<string, unknown>)?.phoneNumber ||
                    "") as string,
            },
            startTime: (raw.startTime as string) || null,
            endTime: (raw.endTime as string) || null,
            summary: {
                saleCount: this.normalizeNumber(
                    (raw.summary as Record<string, unknown>)?.saleCount
                ),
                totalMoneyCollected: this.normalizeNumber(
                    (raw.summary as Record<string, unknown>)?.totalMoneyCollected
                ),
            },
            paymentMethodTotals: ((raw.paymentMethodTotals || []) as Record<string, unknown>[]).map(
                (item) => ({
                    methodId: this.normalizeNumber(item.methodId),
                    methodName: (item.methodName || "") as string,
                    amount: this.normalizeNumber(item.amount),
                    saleCount: this.normalizeNumber(item.saleCount),
                })
            ),
            productTotals: ((raw.productTotals || []) as Record<string, unknown>[]).map((item) => ({
                productId: this.normalizeNumber(item.productId),
                productName: (item.productName || "") as string,
                quantitySold: this.normalizeNumber(item.quantitySold),
                amount: this.normalizeNumber(item.amount),
            })),
            sales: ((raw.sales as Record<string, unknown>[]) || []).map((item) =>
                this.normalizeSale(item)
            ),
        };
    }
}

export const salesService = new SalesService();
