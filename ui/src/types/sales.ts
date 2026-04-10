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
    shift_session?: number | null;
    payment_status?: "paid" | "unpaid_approved";
    unpaid_reason?: string;
    approved_by?: number | null;
    approved_by_name?: string | null;
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
    payment_status?: "paid" | "unpaid_approved";
    unpaid_reason?: string;
    receipt_issued?: boolean;
}

export interface UpdateSalePaymentStatusData {
    payment_status: "paid" | "unpaid_approved";
    unpaid_reason?: string;
}

export interface SaleListParams {
    page?: number;
    page_size?: number;
    cashier?: number;
    start_date?: string;
    end_date?: string;
    receipt_issued?: boolean;
    payment_status?: "paid" | "unpaid_approved";
    shift_session?: number;
}

export interface CashierStatementParams {
    cashier: number;
    start_time?: string;
    end_time?: string;
}

export interface CashierStatementSummary {
    saleCount: number;
    totalMoneyCollected: number;
    unpaidTotal?: number;
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

export type ShiftSessionStatus = "opened" | "pending_handover_acceptance" | "closed";

export interface ShiftSessionProductCount {
    id: number;
    product: number;
    productName?: string;
    openingCount: number;
    expectedClosingCount?: number | null;
    closingCount?: number | null;
    variance?: number | null;
}

export interface ShiftSession {
    id: number;
    status: ShiftSessionStatus;
    openedBy: number;
    openedByName?: string;
    openedByFullName?: string | null;
    openedAt: string;
    openNotes?: string;
    closedBy?: number | null;
    closedByName?: string | null;
    closedAt?: string | null;
    closeNotes?: string;
    totalCashDeclared?: number | null;
    totalDigitalDeclared?: number | null;
    acceptedBy?: number | null;
    acceptedByName?: string | null;
    acceptedAt?: string | null;
    acceptanceNotes?: string;
    previousSession?: number | null;
    productCounts: ShiftSessionProductCount[];
}

export interface ShiftSessionCountInput {
    product_id: number;
    opening_count?: number;
    closing_count?: number;
}

export interface OpenShiftSessionData {
    open_notes?: string;
    cashier?: number;
    counts: ShiftSessionCountInput[];
}

export interface CloseShiftSessionData {
    close_notes?: string;
    total_cash_declared: number;
    total_digital_declared: number;
    counts: ShiftSessionCountInput[];
}

export interface AcceptShiftSessionData {
    acceptance_notes?: string;
}

export interface ShiftSessionActiveResponse {
    openedSession: ShiftSession | null;
    pendingSession: ShiftSession | null;
}

export interface ShiftSessionReconciliationProduct {
    productId: number;
    productName: string;
    unitPrice: number;
    openingCount: number;
    producedInShift: number;
    paidSoldQty: number;
    unpaidQty: number;
    expectedClosingCount: number;
    countedClosingCount: number | null;
    varianceQty: number | null;
    varianceValue: number | null;
}

export interface ShiftSessionReconciliationResponse {
    session: ShiftSession;
    formula: string;
    products: ShiftSessionReconciliationProduct[];
    totals: {
        openingTotalQty: number;
        producedTotalQty: number;
        paidSoldTotalQty: number;
        unpaidTotalQty: number;
        expectedTotalQty: number;
        closingTotalQty: number;
        varianceTotalQty: number;
        varianceTotalValue: number;
    };
    money: {
        saleCount: number;
        billedTotal: number;
        collectedTotal: number;
        cashCollected: number;
        digitalCollected: number;
        unpaidValue: number;
        cashDeclared: number;
        digitalDeclared: number;
        cashDiscrepancy: number;
        digitalDiscrepancy: number;
    };
}
