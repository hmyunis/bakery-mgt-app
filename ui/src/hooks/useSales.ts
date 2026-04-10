import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../services/salesService";
import type {
    AcceptShiftSessionData,
    CashierStatementParams,
    CloseShiftSessionData,
    CreateSaleData,
    OpenShiftSessionData,
    SaleListParams,
    UpdateSalePaymentStatusData,
} from "../types/sales";
import type { ApiError } from "../types/api";
import { toast } from "sonner";

/**
 * Get list of sales with pagination and filters
 */
export function useSales(params: SaleListParams = {}) {
    return useQuery({
        queryKey: ["sales", params],
        queryFn: async () => {
            return await salesService.getSales(params);
        },
        placeholderData: (previousData) => previousData,
    });
}

export function useShiftSessions(
    params: {
        page?: number;
        page_size?: number;
        status?: "opened" | "pending_handover_acceptance" | "closed";
        start_date?: string;
        end_date?: string;
    } = {}
) {
    return useQuery({
        queryKey: ["shift-sessions", params],
        queryFn: async () => {
            return await salesService.getShiftSessions(params);
        },
        placeholderData: (previousData) => previousData,
    });
}

export function useActiveShiftSession(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ["shift-sessions", "active"],
        queryFn: async () => {
            return await salesService.getActiveShiftSession();
        },
        refetchInterval: 15000,
        enabled: options?.enabled ?? true,
    });
}

export function useOpenShiftSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: OpenShiftSessionData) => {
            return await salesService.openShiftSession(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shift-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            toast.success("Shift opened successfully.");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to open shift.";
            toast.error(errorMessage);
        },
    });
}

export function useCloseShiftSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: CloseShiftSessionData }) => {
            return await salesService.closeShiftSession(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shift-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            toast.success("Shift closed and pending acceptance.");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to close shift.";
            toast.error(errorMessage);
        },
    });
}

export function useAcceptShiftSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: AcceptShiftSessionData }) => {
            return await salesService.acceptShiftSession(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shift-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            toast.success("Shift handover accepted.");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to accept handover.";
            toast.error(errorMessage);
        },
    });
}

export function useReopenShiftSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id }: { id: number }) => {
            return await salesService.reopenShiftSession(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shift-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["shift-session-reconciliation"] });
            toast.success("Shift reopened successfully.");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to reopen shift.";
            toast.error(errorMessage);
        },
    });
}

export function useShiftSessionReconciliation(
    id: number | null,
    options?: { enabled?: boolean; refetchInterval?: number | false }
) {
    return useQuery({
        queryKey: ["shift-session-reconciliation", id],
        queryFn: async () => {
            if (!id) throw new Error("Shift session id is required.");
            return await salesService.getShiftSessionReconciliation(id);
        },
        enabled: !!id && (options?.enabled ?? true),
        refetchInterval: options?.refetchInterval,
    });
}

/**
 * Get single sale by ID
 */
export function useSale(id: number | null) {
    return useQuery({
        queryKey: ["sales", id],
        queryFn: async () => {
            if (!id) throw new Error("Sale ID is required");
            return await salesService.getSale(id);
        },
        enabled: !!id,
    });
}

/**
 * Admin-only cashier statement query.
 */
export function useCashierStatement(
    params: CashierStatementParams | null,
    options?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: ["cashier-statement", params],
        queryFn: async () => {
            if (!params) {
                throw new Error("Cashier statement params are required");
            }
            return await salesService.getCashierStatement(params);
        },
        enabled: Boolean(params) && (options?.enabled ?? true),
    });
}

/**
 * Create a new sale
 */
export function useCreateSale() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateSaleData) => {
            return await salesService.createSale(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["shift-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["shift-session-reconciliation"] });
            queryClient.invalidateQueries({ queryKey: ["products"] }); // Update product stock
            queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
            queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            toast.success("Sale completed successfully!");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to complete sale. Please try again.";
            toast.error(errorMessage);
        },
    });
}

/**
 * Delete a sale (reverses stock changes on the backend)
 */
export function useDeleteSale() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            await salesService.deleteSale(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["shift-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["shift-session-reconciliation"] });
            queryClient.invalidateQueries({ queryKey: ["products"] }); // refresh product stock
            queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
            queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            toast.success("Sale deleted successfully. Stock changes were reversed.");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to delete sale. Please try again.";
            toast.error(errorMessage);
        },
    });
}

export function useUpdateSalePaymentStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateSalePaymentStatusData }) => {
            return await salesService.updateSalePaymentStatus(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["shift-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["shift-session-reconciliation"] });
            toast.success("Payment status updated.");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to update payment status.";
            toast.error(errorMessage);
        },
    });
}
