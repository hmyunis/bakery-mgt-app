/**
 * Sales types matching the backend models
 * @see api/sales/models.py
 */

export interface SaleItem {
    product: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export interface SalePayment {
    method__name: string;
    amount: number;
}

export interface Sale {
    id: number;
    total_amount: number;
    created_at: string;
    cashier?: number;
    cashier_name?: string;
    items: SaleItem[];
    payments: SalePayment[];
}

export interface CreateSaleData {
    items_input: Array<{
        product_id: number;
        quantity: number;
    }>;
    payments_input: Array<{
        method_id: number;
        amount: number;
    }>;
}

export interface SaleListParams {
    page?: number;
    page_size?: number;
    cashier?: number;
    start_date?: string;
    end_date?: string;
}
