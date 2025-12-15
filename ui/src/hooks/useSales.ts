import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../services/salesService";
import type { CreateSaleData, SaleListParams } from "../types/sales";
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
            queryClient.invalidateQueries({ queryKey: ["products"] }); // Update product stock
            toast.success("Sale completed successfully!");
        },
        onError: (error: any) => {
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.detail ||
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
            queryClient.invalidateQueries({ queryKey: ["products"] }); // refresh product stock
            toast.success("Sale deleted successfully. Stock changes were reversed.");
        },
        onError: (error: any) => {
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.detail ||
                "Failed to delete sale. Please try again.";
            toast.error(errorMessage);
        },
    });
}

