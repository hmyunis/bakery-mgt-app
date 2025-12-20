/**
 * Payment Method types matching the backend models
 * @see api/sales/models.py
 */

export interface PaymentMethod {
    id: number;
    name: string;
    is_active: boolean;
    config_details?: string;
}

export interface CreatePaymentMethodData {
    name: string;
    is_active?: boolean;
    config_details?: string;
}

export interface UpdatePaymentMethodData {
    name?: string;
    is_active?: boolean;
    config_details?: string;
}

export interface PaymentMethodListParams {
    page?: number;
    page_size?: number;
    is_active?: boolean;
}
