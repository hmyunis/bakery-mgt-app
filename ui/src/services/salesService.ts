import { apiClient } from "../lib/apiClient";
import type {
    AcceptShiftSessionData,
    CashierStatementParams,
    CashierStatementResponse,
    CloseShiftSessionData,
    CreateSaleData,
    OpenShiftSessionData,
    Sale,
    SaleListParams,
    ShiftSession,
    ShiftSessionActiveResponse,
    ShiftSessionReconciliationResponse,
    UpdateSalePaymentStatusData,
} from "../types/sales";
import type { ApiResponse, WrappedPaginatedResponse, PaginatedResponse } from "../types/api";

export interface SaleListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Sale[];
}

export interface ShiftSessionListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ShiftSession[];
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
            shift_session: (sale.shiftSession ?? sale.shift_session ?? null) as number | null,
            payment_status: (sale.paymentStatus || sale.payment_status || "paid") as
                | "paid"
                | "unpaid_approved",
            unpaid_reason: (sale.unpaidReason || sale.unpaid_reason || "") as string,
            approved_by: (sale.approvedBy ?? sale.approved_by ?? null) as number | null,
            approved_by_name: (sale.approvedByName || sale.approved_by_name || null) as
                | string
                | null,
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

    private normalizeShiftSession(row: Record<string, unknown>): ShiftSession {
        const counts =
            ((row.productCounts || row.product_counts) as Record<string, unknown>[] | undefined) ||
            [];
        return {
            id: this.normalizeNumber(row.id),
            status: (row.status as ShiftSession["status"]) || "opened",
            openedBy: this.normalizeNumber(row.openedBy ?? row.opened_by),
            openedByName: (row.openedByName || row.opened_by_name || "") as string,
            openedAt: (row.openedAt || row.opened_at || "") as string,
            openNotes: (row.openNotes || row.open_notes || "") as string,
            closedBy: (row.closedBy ?? row.closed_by ?? null) as number | null,
            closedByName: (row.closedByName || row.closed_by_name || null) as string | null,
            closedAt: (row.closedAt || row.closed_at || null) as string | null,
            closeNotes: (row.closeNotes || row.close_notes || "") as string,
            totalCashDeclared: this.normalizeNumber(
                row.totalCashDeclared ?? row.total_cash_declared ?? 0
            ),
            totalDigitalDeclared: this.normalizeNumber(
                row.totalDigitalDeclared ?? row.total_digital_declared ?? 0
            ),
            acceptedBy: (row.acceptedBy ?? row.accepted_by ?? null) as number | null,
            acceptedByName: (row.acceptedByName || row.accepted_by_name || null) as string | null,
            acceptedAt: (row.acceptedAt || row.accepted_at || null) as string | null,
            acceptanceNotes: (row.acceptanceNotes || row.acceptance_notes || "") as string,
            previousSession: (row.previousSession ?? row.previous_session ?? null) as number | null,
            productCounts: counts.map((count) => ({
                id: this.normalizeNumber(count.id),
                product: this.normalizeNumber(count.product),
                productName: (count.productName || count.product_name || "") as string,
                openingCount: this.normalizeNumber(count.openingCount ?? count.opening_count),
                expectedClosingCount:
                    count.expectedClosingCount === null || count.expected_closing_count === null
                        ? null
                        : count.expectedClosingCount === undefined &&
                            count.expected_closing_count === undefined
                          ? null
                          : this.normalizeNumber(
                                count.expectedClosingCount ?? count.expected_closing_count
                            ),
                closingCount:
                    count.closingCount === null || count.closing_count === null
                        ? null
                        : count.closingCount === undefined && count.closing_count === undefined
                          ? null
                          : this.normalizeNumber(count.closingCount ?? count.closing_count),
                variance:
                    count.variance === null || count.variance === undefined
                        ? null
                        : this.normalizeNumber(count.variance),
            })),
        };
    }

    private unwrapList<T>(
        responseData:
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[],
        normalizer: (row: Record<string, unknown>) => T
    ): { count: number; next: string | null; previous: string | null; results: T[] } {
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
                results: (wrapped.data || []).map((item) => normalizer(item)),
            };
        }

        if (responseData && !Array.isArray(responseData) && "results" in responseData) {
            const paginated = responseData as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((item) => normalizer(item)),
            };
        }

        if (Array.isArray(responseData)) {
            return {
                count: responseData.length,
                next: null,
                previous: null,
                results: responseData.map((item) => normalizer(item)),
            };
        }

        return { count: 0, next: null, previous: null, results: [] };
    }

    async getSales(params: SaleListParams = {}): Promise<SaleListResponse> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.cashier) queryParams.append("cashier", params.cashier.toString());
        if (params.shift_session)
            queryParams.append("shift_session", params.shift_session.toString());
        if (params.start_date) queryParams.append("start_date", params.start_date);
        if (params.end_date) queryParams.append("end_date", params.end_date);
        if (typeof params.receipt_issued === "boolean")
            queryParams.append("receipt_issued", params.receipt_issued ? "true" : "false");
        if (params.payment_status) queryParams.append("payment_status", params.payment_status);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/sales/sales/?${queryParams.toString()}`);

        return this.unwrapList(response.data, (row) => this.normalizeSale(row));
    }

    async getSale(id: number): Promise<Sale> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/sales/sales/${id}/`);
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeSale(data);
    }

    async createSale(data: CreateSaleData): Promise<Sale> {
        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/sales/sales/", data);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeSale(responseData);
    }

    async deleteSale(id: number): Promise<void> {
        await apiClient.delete(`/sales/sales/${id}/`);
    }

    async updateSalePaymentStatus(id: number, data: UpdateSalePaymentStatusData): Promise<Sale> {
        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/sales/sales/${id}/payment-status/`, data);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeSale(responseData);
    }

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

        const cashier = (raw.cashier as Record<string, unknown>) || {};
        const summary = (raw.summary as Record<string, unknown>) || {};

        return {
            cashier: {
                id: this.normalizeNumber(cashier.id),
                username: (cashier.username || "") as string,
                fullName: (cashier.fullName || cashier.full_name || "") as string,
                phoneNumber: (cashier.phoneNumber || cashier.phone_number || "") as string,
            },
            startTime: (raw.startTime || raw.start_time || null) as string | null,
            endTime: (raw.endTime || raw.end_time || null) as string | null,
            summary: {
                saleCount: this.normalizeNumber(summary.saleCount ?? summary.sale_count),
                totalMoneyCollected: this.normalizeNumber(
                    summary.totalMoneyCollected ?? summary.total_money_collected
                ),
                unpaidTotal: this.normalizeNumber(summary.unpaidTotal ?? summary.unpaid_total),
            },
            paymentMethodTotals: (
                (raw.paymentMethodTotals || raw.payment_method_totals || []) as Record<
                    string,
                    unknown
                >[]
            ).map((item) => ({
                methodId: this.normalizeNumber(item.methodId ?? item.method_id),
                methodName: (item.methodName || item.method_name || "") as string,
                amount: this.normalizeNumber(item.amount),
                saleCount: this.normalizeNumber(item.saleCount ?? item.sale_count),
            })),
            productTotals: (
                (raw.productTotals || raw.product_totals || []) as Record<string, unknown>[]
            ).map((item) => ({
                productId: this.normalizeNumber(item.productId ?? item.product_id),
                productName: (item.productName || item.product_name || "") as string,
                quantitySold: this.normalizeNumber(item.quantitySold ?? item.quantity_sold),
                amount: this.normalizeNumber(item.amount),
            })),
            sales: ((raw.sales as Record<string, unknown>[]) || []).map((item) =>
                this.normalizeSale(item)
            ),
        };
    }

    async getShiftSessions(
        params: {
            page?: number;
            page_size?: number;
            status?: "opened" | "pending_handover_acceptance" | "closed";
            start_date?: string;
            end_date?: string;
        } = {}
    ): Promise<ShiftSessionListResponse> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.status) queryParams.append("status", params.status);
        if (params.start_date) queryParams.append("start_date", params.start_date);
        if (params.end_date) queryParams.append("end_date", params.end_date);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/sales/shift-sessions/?${queryParams.toString()}`);
        return this.unwrapList(response.data, (row) => this.normalizeShiftSession(row));
    }

    async getActiveShiftSession(): Promise<ShiftSessionActiveResponse> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/sales/shift-sessions/active/");
        const raw =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        const openedRaw = (raw.openedSession || raw.opened_session) as Record<
            string,
            unknown
        > | null;
        const pendingRaw = (raw.pendingSession || raw.pending_session) as Record<
            string,
            unknown
        > | null;

        return {
            openedSession: openedRaw ? this.normalizeShiftSession(openedRaw) : null,
            pendingSession: pendingRaw ? this.normalizeShiftSession(pendingRaw) : null,
        };
    }

    async openShiftSession(data: OpenShiftSessionData): Promise<ShiftSession> {
        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/sales/shift-sessions/open/", data);
        const raw =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeShiftSession(raw);
    }

    async closeShiftSession(id: number, data: CloseShiftSessionData): Promise<ShiftSession> {
        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/sales/shift-sessions/${id}/close/`, data);
        const raw =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeShiftSession(raw);
    }

    async acceptShiftSession(id: number, data: AcceptShiftSessionData): Promise<ShiftSession> {
        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/sales/shift-sessions/${id}/accept/`, data);
        const raw =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeShiftSession(raw);
    }

    async getShiftSessionReconciliation(id: number): Promise<ShiftSessionReconciliationResponse> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/sales/shift-sessions/${id}/reconciliation/`);
        const raw =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        const totals = (raw.totals as Record<string, unknown>) || {};
        const money = (raw.money as Record<string, unknown>) || {};

        return {
            session: this.normalizeShiftSession((raw.session as Record<string, unknown>) || {}),
            formula: (raw.formula || "") as string,
            products: ((raw.products as Record<string, unknown>[]) || []).map((item) => ({
                productId: this.normalizeNumber(item.productId ?? item.product_id),
                productName: (item.productName || item.product_name || "") as string,
                unitPrice: this.normalizeNumber(item.unitPrice ?? item.unit_price),
                openingCount: this.normalizeNumber(item.openingCount ?? item.opening_count),
                producedInShift: this.normalizeNumber(
                    item.producedInShift ?? item.produced_in_shift
                ),
                paidSoldQty: this.normalizeNumber(item.paidSoldQty ?? item.paid_sold_qty),
                unpaidQty: this.normalizeNumber(item.unpaidQty ?? item.unpaid_qty),
                expectedClosingCount: this.normalizeNumber(
                    item.expectedClosingCount ?? item.expected_closing_count
                ),
                countedClosingCount:
                    item.countedClosingCount === null || item.counted_closing_count === null
                        ? null
                        : this.normalizeNumber(
                              item.countedClosingCount ?? item.counted_closing_count
                          ),
                varianceQty:
                    item.varianceQty === null || item.variance_qty === null
                        ? null
                        : this.normalizeNumber(item.varianceQty ?? item.variance_qty),
                varianceValue:
                    item.varianceValue === null || item.variance_value === null
                        ? null
                        : this.normalizeNumber(item.varianceValue ?? item.variance_value),
            })),
            totals: {
                openingTotalQty: this.normalizeNumber(
                    totals.openingTotalQty ?? totals.opening_total_qty
                ),
                producedTotalQty: this.normalizeNumber(
                    totals.producedTotalQty ?? totals.produced_total_qty
                ),
                paidSoldTotalQty: this.normalizeNumber(
                    totals.paidSoldTotalQty ?? totals.paid_sold_total_qty
                ),
                unpaidTotalQty: this.normalizeNumber(
                    totals.unpaidTotalQty ?? totals.unpaid_total_qty
                ),
                expectedTotalQty: this.normalizeNumber(
                    totals.expectedTotalQty ?? totals.expected_total_qty
                ),
                closingTotalQty: this.normalizeNumber(
                    totals.closingTotalQty ?? totals.closing_total_qty
                ),
                varianceTotalQty: this.normalizeNumber(
                    totals.varianceTotalQty ?? totals.variance_total_qty
                ),
                varianceTotalValue: this.normalizeNumber(
                    totals.varianceTotalValue ?? totals.variance_total_value
                ),
            },
            money: {
                saleCount: this.normalizeNumber(money.saleCount ?? money.sale_count),
                billedTotal: this.normalizeNumber(money.billedTotal ?? money.billed_total),
                collectedTotal: this.normalizeNumber(money.collectedTotal ?? money.collected_total),
                cashCollected: this.normalizeNumber(money.cashCollected ?? money.cash_collected),
                digitalCollected: this.normalizeNumber(
                    money.digitalCollected ?? money.digital_collected
                ),
                unpaidValue: this.normalizeNumber(money.unpaidValue ?? money.unpaid_value),
                cashDeclared: this.normalizeNumber(money.cashDeclared ?? money.cash_declared),
                digitalDeclared: this.normalizeNumber(
                    money.digitalDeclared ?? money.digital_declared
                ),
                cashDiscrepancy: this.normalizeNumber(
                    money.cashDiscrepancy ?? money.cash_discrepancy
                ),
                digitalDiscrepancy: this.normalizeNumber(
                    money.digitalDiscrepancy ?? money.digital_discrepancy
                ),
            },
        };
    }
}

export const salesService = new SalesService();
