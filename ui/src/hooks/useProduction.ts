import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { productionService } from "../services/productionService";
import type { ApiError } from "../types/api";
import type {
    CreateProductData,
    UpdateProductData,
    ProductListParams,
    CreateRecipeData,
    UpdateRecipeData,
    RecipeListParams,
    CreateProductionRunData,
    ProductionRunListParams,
} from "../types/production";

// ==================== PRODUCTS HOOKS ====================

/**
 * Get list of products with pagination and filters
 */
export function useProducts(params: ProductListParams = {}) {
    return useQuery({
        queryKey: ["products", params],
        queryFn: async () => {
            return await productionService.getProducts(params);
        },
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Get single product by ID
 */
export function useProduct(id: number | null) {
    return useQuery({
        queryKey: ["products", id],
        queryFn: async () => {
            if (!id) throw new Error("Product ID is required");
            return await productionService.getProduct(id);
        },
        enabled: !!id,
    });
}

/**
 * Create a new product
 */
export function useCreateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateProductData) => {
            return await productionService.createProduct(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Product created successfully!");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to create product. Please try again.";
            toast.error(errorMessage);
        },
    });
}

/**
 * Update an existing product
 */
export function useUpdateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateProductData }) => {
            return await productionService.updateProduct(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["recipes"] });
            toast.success("Product updated successfully!");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to update product. Please try again.";
            toast.error(errorMessage);
        },
    });
}

/**
 * Delete a product
 */
export function useDeleteProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            return await productionService.deleteProduct(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["recipes"] });
            toast.success("Product deleted successfully!");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to delete product. Please try again.";
            toast.error(errorMessage);
        },
    });
}

// ==================== RECIPES HOOKS ====================

/**
 * Get list of recipes with pagination
 */
export function useRecipes(params: RecipeListParams = {}) {
    return useQuery({
        queryKey: ["recipes", params],
        queryFn: async () => {
            return await productionService.getRecipes(params);
        },
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Get single recipe by ID
 */
export function useRecipe(id: number | null) {
    return useQuery({
        queryKey: ["recipes", id],
        queryFn: async () => {
            if (!id) throw new Error("Recipe ID is required");
            return await productionService.getRecipe(id);
        },
        enabled: !!id,
    });
}

/**
 * Get recipe by product ID
 */
export function useRecipeByProduct(productId: number | null) {
    return useQuery({
        queryKey: ["recipes", "product", productId],
        queryFn: async () => {
            if (!productId) throw new Error("Product ID is required");
            return await productionService.getRecipeByProduct(productId);
        },
        enabled: !!productId,
    });
}

/**
 * Create a new recipe
 */
export function useCreateRecipe() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateRecipeData) => {
            return await productionService.createRecipe(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recipes"] });
            toast.success("Recipe created successfully!");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to create recipe. Please try again.";
            toast.error(errorMessage);
        },
    });
}

/**
 * Update an existing recipe
 */
export function useUpdateRecipe() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateRecipeData }) => {
            return await productionService.updateRecipe(id, data);
        },
        onSuccess: (updatedRecipe) => {
            queryClient.invalidateQueries({ queryKey: ["recipes"] });
            queryClient.invalidateQueries({ queryKey: ["productsWithRecipes"] });
            // Invalidate the specific recipe query to refresh detail modal
            queryClient.invalidateQueries({
                queryKey: ["recipes", updatedRecipe.id],
            });
            toast.success("Recipe updated successfully!");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to update recipe. Please try again.";
            toast.error(errorMessage);
        },
    });
}

/**
 * Delete a recipe
 */
export function useDeleteRecipe() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            return await productionService.deleteRecipe(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recipes"] });
            queryClient.invalidateQueries({ queryKey: ["productsWithRecipes"] });
            toast.success("Recipe deleted successfully!");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to delete recipe. Please try again.";
            toast.error(errorMessage);
        },
    });
}

/**
 * Get product IDs that already have recipes (lightweight query for filtering)
 */
export function useProductsWithRecipes() {
    return useQuery({
        queryKey: ["productsWithRecipes"],
        queryFn: async () => {
            return await productionService.getProductsWithRecipes();
        },
    });
}

// ==================== PRODUCTION RUNS HOOKS ====================

/**
 * Get list of production runs with pagination and filters
 */
export function useProductionRuns(params: ProductionRunListParams = {}) {
    return useQuery({
        queryKey: ["production-runs", params],
        queryFn: async () => {
            return await productionService.getProductionRuns(params);
        },
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Get single production run by ID
 */
export function useProductionRun(id: number | null) {
    return useQuery({
        queryKey: ["production-runs", id],
        queryFn: async () => {
            if (!id) throw new Error("Production run ID is required");
            return await productionService.getProductionRun(id);
        },
        enabled: !!id,
    });
}

/**
 * Create a new production run
 */
export function useCreateProductionRun() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateProductionRunData) => {
            return await productionService.createProductionRun(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["production-runs"] });
            queryClient.invalidateQueries({ queryKey: ["products"] }); // Update product stock
            queryClient.invalidateQueries({ queryKey: ["ingredients"] }); // Update ingredient stock
            toast.success("Production run recorded successfully!");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to record production run. Please try again.";
            toast.error(errorMessage);
        },
    });
}

/**
 * Delete a production run (reverses stock changes)
 */
export function useDeleteProductionRun() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            await productionService.deleteProductionRun(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["production-runs"] });
            queryClient.invalidateQueries({ queryKey: ["products"] }); // Update product stock
            queryClient.invalidateQueries({ queryKey: ["ingredients"] }); // Update ingredient stock
            toast.success("Production run deleted successfully. Stock changes have been reversed.");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message ||
                apiError.response?.data?.detail ||
                "Failed to delete production run. Please try again.";
            toast.error(errorMessage);
        },
    });
}
