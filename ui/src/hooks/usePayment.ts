import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { paymentService } from "../services/paymentService";
import type {
    PaymentMethod,
    CreatePaymentMethodData,
    UpdatePaymentMethodData,
    PaymentMethodListParams,
} from "../types/payment";

// ==================== PAYMENT METHODS HOOKS ====================

/**
 * Get list of payment methods with pagination and filters
 */
export function usePaymentMethods(params: PaymentMethodListParams = {}) {
    return useQuery({
        queryKey: ["payment-methods", params],
        queryFn: async () => {
            return await paymentService.getPaymentMethods(params);
        },
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Get single payment method by ID
 */
export function usePaymentMethod(id: number | null) {
    return useQuery({
        queryKey: ["payment-methods", id],
        queryFn: async () => {
            if (!id) throw new Error("Payment method ID is required");
            return await paymentService.getPaymentMethod(id);
        },
        enabled: !!id,
    });
}

/**
 * Create a new payment method
 */
export function useCreatePaymentMethod() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreatePaymentMethodData) => {
            return await paymentService.createPaymentMethod(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
            toast.success("Payment method created successfully!");
        },
        onError: (error: any) => {
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.detail ||
                "Failed to create payment method. Please try again.";
            toast.error(errorMessage);
        },
    });
}

/**
 * Update an existing payment method
 */
export function useUpdatePaymentMethod() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            data,
        }: {
            id: number;
            data: UpdatePaymentMethodData;
        }) => {
            return await paymentService.updatePaymentMethod(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
            toast.success("Payment method updated successfully!");
        },
        onError: (error: any) => {
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.detail ||
                "Failed to update payment method. Please try again.";
            toast.error(errorMessage);
        },
    });
}

/**
 * Delete a payment method
 */
export function useDeletePaymentMethod() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            return await paymentService.deletePaymentMethod(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
            toast.success("Payment method deleted successfully!");
        },
        onError: (error: any) => {
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.detail ||
                "Failed to delete payment method. Please try again.";
            toast.error(errorMessage);
        },
    });
}

