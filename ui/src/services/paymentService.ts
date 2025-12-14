import { apiClient } from "../lib/apiClient";
import type {
    PaymentMethod,
    CreatePaymentMethodData,
    UpdatePaymentMethodData,
    PaymentMethodListParams,
} from "../types/payment";

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
    private normalizePaymentMethod(paymentMethod: any): PaymentMethod {
        return {
            id: paymentMethod.id,
            name: paymentMethod.name,
            is_active: paymentMethod.isActive ?? paymentMethod.is_active ?? true,
            config_details: paymentMethod.configDetails ?? paymentMethod.config_details,
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

        const response = await apiClient.get(`/sales/payment-methods/?${queryParams}`);
        const data = response.data;

        return {
            count: data.pagination?.count ?? data.count ?? 0,
            next: data.pagination?.next ?? data.next ?? null,
            previous: data.pagination?.previous ?? data.previous ?? null,
            results: (data.data ?? data.results ?? []).map((item: any) =>
                this.normalizePaymentMethod(item)
            ),
        };
    }

    /**
     * Get single payment method by ID
     */
    async getPaymentMethod(id: number): Promise<PaymentMethod> {
        const response = await apiClient.get(`/sales/payment-methods/${id}/`);
        const data = response.data;
        return this.normalizePaymentMethod(data.data ?? data);
    }

    /**
     * Create a new payment method
     */
    async createPaymentMethod(
        data: CreatePaymentMethodData
    ): Promise<PaymentMethod> {
        const payload = {
            name: data.name,
            is_active: data.is_active ?? true,
            config_details: data.config_details ?? "",
        };

        const response = await apiClient.post("/sales/payment-methods/", payload);
        const responseData = response.data;
        return this.normalizePaymentMethod(responseData.data ?? responseData);
    }

    /**
     * Update an existing payment method
     */
    async updatePaymentMethod(
        id: number,
        data: UpdatePaymentMethodData
    ): Promise<PaymentMethod> {
        const payload: any = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.is_active !== undefined) payload.is_active = data.is_active;
        if (data.config_details !== undefined) payload.config_details = data.config_details;

        const response = await apiClient.patch(`/sales/payment-methods/${id}/`, payload);
        const responseData = response.data;
        return this.normalizePaymentMethod(responseData.data ?? responseData);
    }

    /**
     * Delete a payment method
     */
    async deletePaymentMethod(id: number): Promise<void> {
        await apiClient.delete(`/sales/payment-methods/${id}/`);
    }
}

export const paymentService = new PaymentService();

