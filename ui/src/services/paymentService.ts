import { apiClient } from "../lib/apiClient";
import type {
    PaymentMethod,
    CreatePaymentMethodData,
    UpdatePaymentMethodData,
    PaymentMethodListParams,
} from "../types/payment";
import type { ApiResponse, WrappedPaginatedResponse, PaginatedResponse } from "../types/api";

export interface PaymentMethodListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: PaymentMethod[];
}

class PaymentService {
    /**
     * Normalize payment method data from backend
     */
    private normalizePaymentMethod(paymentMethod: Record<string, unknown>): PaymentMethod {
        return {
            id: paymentMethod.id as number,
            name: paymentMethod.name as string,
            is_active: (paymentMethod.isActive ?? paymentMethod.is_active ?? true) as boolean,
            config_details: (paymentMethod.configDetails ?? paymentMethod.config_details) as string,
        };
    }

    /**
     * Get list of payment methods with pagination
     */
    async getPaymentMethods(
        params: PaymentMethodListParams = {}
    ): Promise<PaymentMethodListResponse> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.is_active !== undefined)
            queryParams.append("is_active", params.is_active.toString());

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/sales/payment-methods/?${queryParams}`);
        const responseData = response.data;

        if (
            responseData &&
            !Array.isArray(responseData) &&
            "data" in responseData &&
            "pagination" in responseData
        ) {
            const wrapped = responseData as WrappedPaginatedResponse<Record<string, unknown>>;
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results: (wrapped.data || []).map((item) => this.normalizePaymentMethod(item)),
            };
        }

        if (responseData && !Array.isArray(responseData) && "results" in responseData) {
            const paginated = responseData as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((item) => this.normalizePaymentMethod(item)),
            };
        }

        if (Array.isArray(responseData)) {
            return {
                count: responseData.length,
                next: null,
                previous: null,
                results: responseData.map((item) =>
                    this.normalizePaymentMethod(item as Record<string, unknown>)
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
     * Get single payment method by ID
     */
    async getPaymentMethod(id: number): Promise<PaymentMethod> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/sales/payment-methods/${id}/`);
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizePaymentMethod(data);
    }

    /**
     * Create a new payment method
     */
    async createPaymentMethod(data: CreatePaymentMethodData): Promise<PaymentMethod> {
        const payload = {
            name: data.name,
            is_active: data.is_active ?? true,
            config_details: data.config_details ?? "",
        };

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/sales/payment-methods/", payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizePaymentMethod(responseData);
    }

    /**
     * Update an existing payment method
     */
    async updatePaymentMethod(id: number, data: UpdatePaymentMethodData): Promise<PaymentMethod> {
        const payload: Record<string, unknown> = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.is_active !== undefined) payload.is_active = data.is_active;
        if (data.config_details !== undefined) payload.config_details = data.config_details;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/sales/payment-methods/${id}/`, payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizePaymentMethod(responseData);
    }

    /**
     * Delete a payment method
     */
    async deletePaymentMethod(id: number): Promise<void> {
        await apiClient.delete(`/sales/payment-methods/${id}/`);
    }
}

export const paymentService = new PaymentService();
