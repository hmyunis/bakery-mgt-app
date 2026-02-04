import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { treasuryService } from "../services/treasuryService";
import type {
    BankAccountListParams,
    BankTransactionListParams,
    CreateBankAccountData,
    CreateBankTransactionData,
    CreateExpenseData,
    ExpenseListParams,
    UpdateBankAccountData,
    UpdateBankTransactionData,
    UpdateExpenseData,
} from "../types/treasury";

const bankAccountKeys = {
    all: ["bank-accounts"] as const,
    list: (params: BankAccountListParams) => [...bankAccountKeys.all, params] as const,
};

const transactionKeys = {
    all: ["bank-transactions"] as const,
    list: (params: BankTransactionListParams) => [...transactionKeys.all, params] as const,
};

const expenseKeys = {
    all: ["expenses"] as const,
    list: (params: ExpenseListParams) => [...expenseKeys.all, params] as const,
};

export function useBankAccounts(params: BankAccountListParams = {}) {
    return useQuery({
        queryKey: bankAccountKeys.list(params),
        queryFn: () => treasuryService.getBankAccounts(params),
    });
}

export function useCreateBankAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateBankAccountData) => treasuryService.createBankAccount(data),
        onSuccess: () => {
            toast.success("Bank account created successfully");
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
        },
        onError: (error) => {
            toast.error(treasuryService.parseApiError(error));
        },
    });
}

export function useUpdateBankAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateBankAccountData }) =>
            treasuryService.updateBankAccount(id, data),
        onSuccess: () => {
            toast.success("Bank account updated successfully");
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
        },
        onError: (error) => {
            toast.error(treasuryService.parseApiError(error));
        },
    });
}

export function useDeleteBankAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => treasuryService.deleteBankAccount(id),
        onSuccess: () => {
            toast.success("Bank account deleted successfully");
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            queryClient.invalidateQueries({ queryKey: expenseKeys.all });
        },
        onError: (error) => {
            toast.error(treasuryService.parseApiError(error));
        },
    });
}

export function useBankTransactions(params: BankTransactionListParams = {}) {
    return useQuery({
        queryKey: transactionKeys.list(params),
        queryFn: () => treasuryService.getBankTransactions(params),
    });
}

export function useCreateBankTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateBankTransactionData) =>
            treasuryService.createBankTransaction(data),
        onSuccess: () => {
            toast.success("Transaction saved");
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
        },
        onError: (error) => {
            toast.error(treasuryService.parseApiError(error));
        },
    });
}

export function useUpdateBankTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateBankTransactionData }) =>
            treasuryService.updateBankTransaction(id, data),
        onSuccess: () => {
            toast.success("Transaction updated");
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
        },
        onError: (error) => {
            toast.error(treasuryService.parseApiError(error));
        },
    });
}

export function useDeleteBankTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => treasuryService.deleteBankTransaction(id),
        onSuccess: () => {
            toast.success("Transaction deleted");
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
        },
        onError: (error) => {
            toast.error(treasuryService.parseApiError(error));
        },
    });
}

export function useExpenses(params: ExpenseListParams = {}) {
    return useQuery({
        queryKey: expenseKeys.list(params),
        queryFn: () => treasuryService.getExpenses(params),
    });
}

export function useCreateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateExpenseData) => treasuryService.createExpense(data),
        onSuccess: () => {
            toast.success("Expense saved");
            queryClient.invalidateQueries({ queryKey: expenseKeys.all });
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
        },
        onError: (error) => {
            toast.error(treasuryService.parseApiError(error));
        },
    });
}

export function useUpdateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateExpenseData }) =>
            treasuryService.updateExpense(id, data),
        onSuccess: () => {
            toast.success("Expense updated");
            queryClient.invalidateQueries({ queryKey: expenseKeys.all });
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
        },
        onError: (error) => {
            toast.error(treasuryService.parseApiError(error));
        },
    });
}

export function useDeleteExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => treasuryService.deleteExpense(id),
        onSuccess: () => {
            toast.success("Expense deleted");
            queryClient.invalidateQueries({ queryKey: expenseKeys.all });
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
        },
        onError: (error) => {
            toast.error(treasuryService.parseApiError(error));
        },
    });
}
