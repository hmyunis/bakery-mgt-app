export interface BankAccount {
    id: number;
    name: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    balance: number;
    logo?: string | null;
    notes?: string;
    isActive: boolean;
    linkedPaymentMethodIds: number[];
    createdAt?: string;
    updatedAt: string;
}

export interface BankTransaction {
    id: number;
    accountId: number;
    accountName?: string;
    type: "deposit" | "withdrawal";
    amount: number;
    notes?: string;
    recordedBy?: number | null;
    recordedByName?: string;
    createdAt: string;
}

export interface Expense {
    id: number;
    title: string;
    amount: number;
    status: "paid" | "pending";
    accountId?: number | null;
    accountName?: string;
    notes?: string;
    createdAt: string;
    recordedBy?: number | null;
    recordedByName?: string;
}

export interface BankAccountListParams {
    page?: number;
    page_size?: number;
    search?: string;
    ordering?: string;
    is_active?: boolean;
}

export interface BankTransactionListParams {
    page?: number;
    page_size?: number;
    account?: number;
    transaction_type?: "deposit" | "withdrawal";
    search?: string;
    start_date?: string;
    end_date?: string;
    ordering?: string;
}

export interface ExpenseListParams {
    page?: number;
    page_size?: number;
    status?: "paid" | "pending";
    account?: number;
    search?: string;
    start_date?: string;
    end_date?: string;
    ordering?: string;
}

export interface CreateBankAccountData {
    name: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    balance: number;
    logo?: File | null;
    notes?: string;
    isActive?: boolean;
    linkedPaymentMethodIds?: number[];
}

export interface UpdateBankAccountData {
    name?: string;
    bankName?: string;
    accountHolder?: string;
    accountNumber?: string;
    balance?: number;
    logo?: File | null;
    notes?: string;
    isActive?: boolean;
    linkedPaymentMethodIds?: number[];
}

export interface CreateBankTransactionData {
    accountId: number;
    type: "deposit" | "withdrawal";
    amount: number;
    notes?: string;
}

export interface UpdateBankTransactionData {
    accountId?: number;
    type?: "deposit" | "withdrawal";
    amount?: number;
    notes?: string;
}

export interface CreateExpenseData {
    title: string;
    amount: number;
    status: "paid" | "pending";
    accountId?: number | null;
    notes?: string;
    createdAt: string;
}

export interface UpdateExpenseData {
    title?: string;
    amount?: number;
    status?: "paid" | "pending";
    accountId?: number | null;
    notes?: string;
    createdAt?: string;
}
