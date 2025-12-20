import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { inventoryService } from "../services/inventoryService";
import type { ApiError, ApiErrorResponse } from "../types/api";
import type {
    CreateIngredientData,
    UpdateIngredientData,
    CreatePurchaseData,
    UpdatePurchaseData,
    CreateStockAdjustmentData,
    UpdateStockAdjustmentData,
    IngredientListParams,
    PurchaseListParams,
    StockAdjustmentListParams,
} from "../types/inventory";

// ==================== INGREDIENTS HOOKS ====================

/**
 * Get list of ingredients with pagination and filters
 */
export function useIngredients(params: IngredientListParams = {}) {
    return useQuery({
        queryKey: ["ingredients", params],
        queryFn: async () => {
            return await inventoryService.getIngredients(params);
        },
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Get single ingredient by ID
 */
export function useIngredient(id: number | null) {
    return useQuery({
        queryKey: ["ingredients", id],
        queryFn: async () => {
            if (!id) throw new Error("Invalid ingredient ID");
            return await inventoryService.getIngredient(id);
        },
        enabled: !!id,
    });
}

/**
 * Create ingredient mutation
 */
export function useCreateIngredient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateIngredientData) => {
            return await inventoryService.createIngredient(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ingredients"] });
            toast.success("Ingredient created successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorData = apiError.response?.data as ApiErrorResponse;
            const errorMessage =
                errorData?.message ||
                (errorData?.errors?.nonFieldErrors as string[])?.[0] ||
                errorData?.non_field_errors?.[0] ||
                (
                    Object.values(errorData?.errors || errorData || {})[0] as string[] | undefined
                )?.[0] ||
                apiError.message ||
                "Failed to create ingredient";
            toast.error(errorMessage);
        },
    });
}

/**
 * Update ingredient mutation
 */
export function useUpdateIngredient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateIngredientData }) => {
            return await inventoryService.updateIngredient(id, data);
        },
        onSuccess: (updatedIngredient) => {
            queryClient.invalidateQueries({ queryKey: ["ingredients"] });
            queryClient.setQueryData(["ingredients", updatedIngredient.id], updatedIngredient);
            toast.success("Ingredient updated successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorData = apiError.response?.data as ApiErrorResponse;
            const errorMessage =
                errorData?.message ||
                (errorData?.errors?.nonFieldErrors as string[])?.[0] ||
                errorData?.non_field_errors?.[0] ||
                (
                    Object.values(errorData?.errors || errorData || {})[0] as string[] | undefined
                )?.[0] ||
                apiError.message ||
                "Failed to update ingredient";
            toast.error(errorMessage);
        },
    });
}

/**
 * Delete ingredient mutation
 */
export function useDeleteIngredient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            await inventoryService.deleteIngredient(id);
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ["ingredients"] });
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            queryClient.removeQueries({ queryKey: ["ingredients", id] });
            toast.success("Ingredient deleted successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorData = apiError.response?.data as ApiErrorResponse;
            const errorMessage =
                errorData?.message ||
                errorData?.detail ||
                apiError.message ||
                "Failed to delete ingredient";
            toast.error(errorMessage);
        },
    });
}

/**
 * Get shopping list (low stock items)
 */
export function useShoppingList() {
    return useQuery({
        queryKey: ["ingredients", "shopping-list"],
        queryFn: async () => {
            return await inventoryService.getShoppingList();
        },
        staleTime: 1000 * 60 * 2, // Refresh every 2 minutes
    });
}

// ==================== PURCHASES HOOKS ====================

/**
 * Get list of purchases with pagination and filters
 */
export function usePurchases(params: PurchaseListParams = {}) {
    return useQuery({
        queryKey: ["purchases", params],
        queryFn: async () => {
            return await inventoryService.getPurchases(params);
        },
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Get single purchase by ID
 */
export function usePurchase(id: number | null) {
    return useQuery({
        queryKey: ["purchases", id],
        queryFn: async () => {
            if (!id) throw new Error("Invalid purchase ID");
            return await inventoryService.getPurchase(id);
        },
        enabled: !!id,
    });
}

/**
 * Create purchase mutation
 */
export function useCreatePurchase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreatePurchaseData) => {
            return await inventoryService.createPurchase(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            queryClient.invalidateQueries({ queryKey: ["ingredients"] }); // Update stock levels
            toast.success("Purchase recorded successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorData = apiError.response?.data as ApiErrorResponse;
            const errorMessage =
                errorData?.message ||
                (errorData?.errors?.nonFieldErrors as string[])?.[0] ||
                errorData?.non_field_errors?.[0] ||
                (
                    Object.values(errorData?.errors || errorData || {})[0] as string[] | undefined
                )?.[0] ||
                apiError.message ||
                "Failed to record purchase";
            toast.error(errorMessage);
        },
    });
}

/**
 * Update purchase mutation
 */
export function useUpdatePurchase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdatePurchaseData }) => {
            return await inventoryService.updatePurchase(id, data);
        },
        onSuccess: (updatedPurchase) => {
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            queryClient.invalidateQueries({ queryKey: ["ingredients"] }); // Update stock levels
            queryClient.setQueryData(["purchases", updatedPurchase.id], updatedPurchase);
            toast.success("Purchase updated successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorData = apiError.response?.data as ApiErrorResponse;
            const errorMessage =
                errorData?.message ||
                (errorData?.errors?.nonFieldErrors as string[])?.[0] ||
                errorData?.non_field_errors?.[0] ||
                (
                    Object.values(errorData?.errors || errorData || {})[0] as string[] | undefined
                )?.[0] ||
                apiError.message ||
                "Failed to update purchase";
            toast.error(errorMessage);
        },
    });
}

/**
 * Delete purchase mutation
 */
export function useDeletePurchase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            await inventoryService.deletePurchase(id);
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            queryClient.invalidateQueries({ queryKey: ["ingredients"] }); // Update stock levels
            queryClient.removeQueries({ queryKey: ["purchases", id] });
            toast.success("Purchase deleted successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorData = apiError.response?.data as ApiErrorResponse;
            const errorMessage =
                errorData?.message ||
                errorData?.detail ||
                apiError.message ||
                "Failed to delete purchase";
            toast.error(errorMessage);
        },
    });
}

// ==================== STOCK ADJUSTMENTS HOOKS ====================

/**
 * Get list of stock adjustments with pagination and filters
 */
export function useStockAdjustments(params: StockAdjustmentListParams = {}) {
    return useQuery({
        queryKey: ["stock-adjustments", params],
        queryFn: async () => {
            return await inventoryService.getStockAdjustments(params);
        },
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Get single stock adjustment by ID
 */
export function useStockAdjustment(id: number | null) {
    return useQuery({
        queryKey: ["stock-adjustments", id],
        queryFn: async () => {
            if (!id) throw new Error("Invalid stock adjustment ID");
            return await inventoryService.getStockAdjustment(id);
        },
        enabled: !!id,
    });
}

/**
 * Create stock adjustment mutation
 */
export function useCreateStockAdjustment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateStockAdjustmentData) => {
            return await inventoryService.createStockAdjustment(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
            queryClient.invalidateQueries({ queryKey: ["ingredients"] }); // Update stock levels
        },
    });
}

/**
 * Update stock adjustment mutation
 */
export function useUpdateStockAdjustment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateStockAdjustmentData }) => {
            return await inventoryService.updateStockAdjustment(id, data);
        },
        onSuccess: (updatedAdjustment) => {
            queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
            queryClient.invalidateQueries({ queryKey: ["ingredients"] }); // Update stock levels
            queryClient.setQueryData(
                ["stock-adjustments", updatedAdjustment.id],
                updatedAdjustment
            );
        },
    });
}

/**
 * Delete stock adjustment mutation
 */
export function useDeleteStockAdjustment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            await inventoryService.deleteStockAdjustment(id);
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
            queryClient.invalidateQueries({ queryKey: ["ingredients"] }); // Update stock levels
            queryClient.removeQueries({ queryKey: ["stock-adjustments", id] });
            toast.success("Stock adjustment deleted successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorData = apiError.response?.data as ApiErrorResponse;
            const errorMessage =
                errorData?.message ||
                errorData?.detail ||
                apiError.message ||
                "Failed to delete stock adjustment";
            toast.error(errorMessage);
        },
    });
}
