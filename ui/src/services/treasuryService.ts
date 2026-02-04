import { apiClient } from "../lib/apiClient";
import type { ApiResponse, PaginatedResponse, WrappedPaginatedResponse } from "../types/api";
import type {
    BankAccount,
    BankAccountListParams,
    BankTransaction,
    BankTransactionListParams,
    CreateBankAccountData,
    CreateBankTransactionData,
    CreateExpenseData,
    Expense,
    ExpenseListParams,
    UpdateBankAccountData,
    UpdateBankTransactionData,
    UpdateExpenseData,
} from "../types/treasury";

export interface TreasuryListResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

class TreasuryService {
    private parseNumber(value: unknown): number {
        if (typeof value === "number") return value;
        if (typeof value === "string") {
            const parsed = Number.parseFloat(value);
            return Number.isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    private normalizeBankAccount(obj: Record<string, unknown>): BankAccount {
        return {
            id: obj.id as number,
            name: (obj.name || "") as string,
            bankName: (obj.bankName || obj.bank_name || "") as string,
            accountHolder: (obj.accountHolder || obj.account_holder || "") as string,
            accountNumber: (obj.accountNumber || obj.account_number || "") as string,
            balance: this.parseNumber(obj.balance),
            logo: (obj.logo || obj.logoUrl || obj.logo_url || null) as string | null,
            notes: (obj.notes || "") as string,
            isActive: (obj.isActive ?? obj.is_active ?? true) as boolean,
            linkedPaymentMethodIds:
                ((obj.linkedPaymentMethodIds ||
                    obj.linked_payment_method_ids ||
                    obj.linkedPaymentMethods ||
                    []) as number[]) ?? [],
            createdAt: (obj.createdAt || obj.created_at) as string,
            updatedAt: (obj.updatedAt || obj.updated_at) as string,
        };
    }

    private normalizeTransaction(obj: Record<string, unknown>): BankTransaction {
        return {
            id: obj.id as number,
            accountId: (obj.accountId || obj.account) as number,
            accountName: (obj.accountName || obj.account_name) as string,
            type: (obj.type || obj.transaction_type) as "deposit" | "withdrawal",
            amount: this.parseNumber(obj.amount),
            notes: (obj.notes || "") as string,
            recordedBy: (obj.recordedBy || obj.recorded_by) as number | null | undefined,
            recordedByName: (obj.recordedByName || obj.recorded_by_name) as string,
            createdAt: (obj.createdAt || obj.created_at) as string,
        };
    }

    private normalizeExpense(obj: Record<string, unknown>): Expense {
        return {
            id: obj.id as number,
            title: (obj.title || "") as string,
            amount: this.parseNumber(obj.amount),
            status: (obj.status || "pending") as "paid" | "pending",
            accountId: (obj.accountId ?? obj.account ?? null) as number | null,
            accountName: (obj.accountName || obj.account_name) as string,
            notes: (obj.notes || "") as string,
            recordedBy: (obj.recordedBy || obj.recorded_by) as number | null | undefined,
            recordedByName: (obj.recordedByName || obj.recorded_by_name) as string,
            createdAt: (obj.createdAt || obj.created_at) as string,
        };
    }

    private async unwrapList<T>(
        response: {
            data:
                | WrappedPaginatedResponse<Record<string, unknown>>
                | PaginatedResponse<Record<string, unknown>>
                | Record<string, unknown>[];
        },
        normalizer: (obj: Record<string, unknown>) => T
    ): Promise<TreasuryListResponse<T>> {
        const data = response.data;

        if (data && !Array.isArray(data) && "data" in data && "pagination" in data) {
            const wrapped = data as WrappedPaginatedResponse<Record<string, unknown>>;
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results: (wrapped.data || []).map((item) => normalizer(item)),
            };
        }

        if (data && !Array.isArray(data) && "results" in data) {
            const paginated = data as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((item) => normalizer(item)),
            };
        }

        if (Array.isArray(data)) {
            return {
                count: data.length,
                next: null,
                previous: null,
                results: data.map((item) => normalizer(item)),
            };
        }

        return { count: 0, next: null, previous: null, results: [] };
    }

    async getBankAccounts(
        params: BankAccountListParams = {}
    ): Promise<TreasuryListResponse<BankAccount>> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.ordering) queryParams.append("ordering", params.ordering);
        if (params.is_active !== undefined)
            queryParams.append("is_active", params.is_active.toString());

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/treasury/bank-accounts/?${queryParams.toString()}`);

        return this.unwrapList(response, (obj) => this.normalizeBankAccount(obj));
    }

    async createBankAccount(data: CreateBankAccountData): Promise<BankAccount> {
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("bank_name", data.bankName);
        formData.append("account_holder", data.accountHolder);
        formData.append("account_number", data.accountNumber);
        formData.append("balance", (data.balance ?? 0).toString());
        formData.append("notes", data.notes || "");
        formData.append("is_active", (data.isActive ?? true).toString());
        (data.linkedPaymentMethodIds || []).forEach((id) =>
            formData.append("linked_payment_method_ids", id.toString())
        );
        if (data.logo) {
            formData.append("logo", data.logo);
        }

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/treasury/bank-accounts/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        const created =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeBankAccount(created);
    }

    async updateBankAccount(id: number, data: UpdateBankAccountData): Promise<BankAccount> {
        const formData = new FormData();
        if (data.name !== undefined) formData.append("name", data.name);
        if (data.bankName !== undefined) formData.append("bank_name", data.bankName);
        if (data.accountHolder !== undefined) formData.append("account_holder", data.accountHolder);
        if (data.accountNumber !== undefined) formData.append("account_number", data.accountNumber);
        if (data.balance !== undefined) formData.append("balance", data.balance.toString());
        if (data.notes !== undefined) formData.append("notes", data.notes);
        if (data.isActive !== undefined) formData.append("is_active", data.isActive.toString());
        if (data.linkedPaymentMethodIds !== undefined) {
            data.linkedPaymentMethodIds.forEach((id) =>
                formData.append("linked_payment_method_ids", id.toString())
            );
        }
        if (data.logo !== undefined) {
            if (data.logo === null) {
                formData.append("logo_clear", "true");
            } else {
                formData.append("logo", data.logo);
            }
        }

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/treasury/bank-accounts/${id}/`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        const updated =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeBankAccount(updated);
    }

    async deleteBankAccount(id: number): Promise<void> {
        await apiClient.delete(`/treasury/bank-accounts/${id}/`);
    }

    async getBankTransactions(
        params: BankTransactionListParams = {}
    ): Promise<TreasuryListResponse<BankTransaction>> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.account) queryParams.append("account", params.account.toString());
        if (params.transaction_type)
            queryParams.append("transaction_type", params.transaction_type);
        if (params.search) queryParams.append("search", params.search);
        if (params.start_date) queryParams.append("start_date", params.start_date);
        if (params.end_date) queryParams.append("end_date", params.end_date);
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/treasury/transactions/?${queryParams.toString()}`);

        return this.unwrapList(response, (obj) => this.normalizeTransaction(obj));
    }

    async createBankTransaction(data: CreateBankTransactionData): Promise<BankTransaction> {
        const payload: Record<string, unknown> = {
            account: data.accountId,
            type: data.type,
            amount: data.amount,
            notes: data.notes || "",
        };

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/treasury/transactions/", payload);

        const created =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeTransaction(created);
    }

    async updateBankTransaction(
        id: number,
        data: UpdateBankTransactionData
    ): Promise<BankTransaction> {
        const payload: Record<string, unknown> = {};
        if (data.accountId !== undefined) payload.account = data.accountId;
        if (data.type !== undefined) payload.type = data.type;
        if (data.amount !== undefined) payload.amount = data.amount;
        if (data.notes !== undefined) payload.notes = data.notes;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/treasury/transactions/${id}/`, payload);

        const updated =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeTransaction(updated);
    }

    async deleteBankTransaction(id: number): Promise<void> {
        await apiClient.delete(`/treasury/transactions/${id}/`);
    }

    async getExpenses(params: ExpenseListParams = {}): Promise<TreasuryListResponse<Expense>> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.status) queryParams.append("status", params.status);
        if (params.account) queryParams.append("account", params.account.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.start_date) queryParams.append("start_date", params.start_date);
        if (params.end_date) queryParams.append("end_date", params.end_date);
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/treasury/expenses/?${queryParams.toString()}`);

        return this.unwrapList(response, (obj) => this.normalizeExpense(obj));
    }

    async createExpense(data: CreateExpenseData): Promise<Expense> {
        const payload: Record<string, unknown> = {
            title: data.title,
            amount: data.amount,
            status: data.status,
            account: data.accountId ?? null,
            notes: data.notes || "",
            created_at: data.createdAt,
        };

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/treasury/expenses/", payload);

        const created =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeExpense(created);
    }

    async updateExpense(id: number, data: UpdateExpenseData): Promise<Expense> {
        const payload: Record<string, unknown> = {};
        if (data.title !== undefined) payload.title = data.title;
        if (data.amount !== undefined) payload.amount = data.amount;
        if (data.status !== undefined) payload.status = data.status;
        if (data.accountId !== undefined) payload.account = data.accountId;
        if (data.notes !== undefined) payload.notes = data.notes;
        if (data.createdAt !== undefined) payload.created_at = data.createdAt;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/treasury/expenses/${id}/`, payload);

        const updated =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeExpense(updated);
    }

    async deleteExpense(id: number): Promise<void> {
        await apiClient.delete(`/treasury/expenses/${id}/`);
    }

    parseApiError(error: unknown): string {
        const err = error as { response?: { data?: unknown } };
        const data = err.response?.data as Record<string, unknown> | undefined;

        const message =
            (data?.message as string) ||
            (data?.detail as string) ||
            (data?.error as string) ||
            undefined;

        if (message) return message;

        if (data && typeof data === "object") {
            const firstKey = Object.keys(data)[0];
            const val = (data as Record<string, unknown>)[firstKey];
            if (Array.isArray(val) && val[0]) return String(val[0]);
            if (typeof val === "string") return val;
        }

        return "Something went wrong";
    }
}

export const treasuryService = new TreasuryService();
