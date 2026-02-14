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
    receipt_issued?: boolean;
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
    receipt_issued?: boolean;
}

export interface SaleListParams {
    page?: number;
    page_size?: number;
    cashier?: number;
    start_date?: string;
    end_date?: string;
    receipt_issued?: boolean;
}

export interface CashierStatementParams {
    cashier: number;
    start_time?: string;
    end_time?: string;
}

export interface CashierStatementSummary {
    saleCount: number;
    totalMoneyCollected: number;
}

export interface CashierStatementPaymentMethodTotal {
    methodId: number;
    methodName: string;
    amount: number;
    saleCount: number;
}

export interface CashierStatementProductTotal {
    productId: number;
    productName: string;
    quantitySold: number;
    amount: number;
}

export interface CashierStatementResponse {
    cashier: {
        id: number;
        username: string;
        fullName?: string | null;
        phoneNumber?: string | null;
    };
    startTime?: string | null;
    endTime?: string | null;
    summary: CashierStatementSummary;
    paymentMethodTotals: CashierStatementPaymentMethodTotal[];
    productTotals: CashierStatementProductTotal[];
    sales: Sale[];
}
