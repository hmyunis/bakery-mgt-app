import { apiClient } from "../lib/apiClient";
import type {
    Product,
    CreateProductData,
    UpdateProductData,
    ProductListParams,
    Recipe,
    CreateRecipeData,
    UpdateRecipeData,
    RecipeListParams,
    ProductionRun,
    CreateProductionRunData,
    ProductionRunListParams,
} from "../types/production";
import type { ApiResponse, WrappedPaginatedResponse, PaginatedResponse } from "../types/api";
import type { Unit } from "../types/inventory";

export interface ProductListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Product[];
}

export interface RecipeListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Recipe[];
}

export interface ProductionRunListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ProductionRun[];
}

class ProductionService {
    /**
     * Normalize product data from backend
     */
    private normalizeProduct(product: Record<string, unknown>): Product {
        return {
            id: product.id as number,
            name: product.name as string,
            description: product.description as string,
            image: product.image as string,
            selling_price: parseFloat(
                (product.sellingPrice as string) ?? (product.selling_price as string) ?? "0"
            ),
            stock_quantity: parseInt(
                (product.stockQuantity as string) ?? (product.stock_quantity as string) ?? "0"
            ),
            is_active: (product.isActive ?? product.is_active ?? true) as boolean,
            created_at: (product.createdAt ?? product.created_at) as string,
        };
    }

    /**
     * Normalize recipe data from backend
     */
    private normalizeRecipe(recipe: Record<string, unknown>): Recipe {
        return {
            id: recipe.id as number,
            product: recipe.product as number,
            composite_ingredient: (recipe.compositeIngredient ??
                recipe.composite_ingredient) as number,
            instructions: recipe.instructions as string,
            standard_yield: parseFloat(
                (recipe.standardYield as string) ?? (recipe.standard_yield as string) ?? "1"
            ),
            items: ((recipe.items as Record<string, unknown>[]) ?? []).map((item) => ({
                id: item.id as number,
                ingredient: item.ingredient as number,
                ingredient_name: (item.ingredientName ?? item.ingredient_name) as string,
                quantity: parseFloat((item.quantity as string) ?? "0"),
                unit: item.unit as Unit,
            })),
        };
    }

    // ==================== PRODUCTS ====================

    /**
     * Get list of products with pagination and filters
     */
    async getProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.is_active !== undefined)
            queryParams.append("is_active", params.is_active.toString());

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/production/products/?${queryParams}`);
        const responseData = response.data;

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
                results: (wrapped.data || []).map((item) => this.normalizeProduct(item)),
            };
        }

        if (responseData && !Array.isArray(responseData) && "results" in responseData) {
            const paginated = responseData as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((item) => this.normalizeProduct(item)),
            };
        }

        if (Array.isArray(responseData)) {
            return {
                count: responseData.length,
                next: null,
                previous: null,
                results: responseData.map((item) =>
                    this.normalizeProduct(item as Record<string, unknown>)
                ),
            };
        }

        return {
            count: 0,
            next: null,
            previous: null,
            results: [],
        };
    }

    /**
     * Get single product by ID
     */
    async getProduct(id: number): Promise<Product> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/production/products/${id}/`);
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeProduct(data);
    }

    /**
     * Create a new product
     */
    async createProduct(data: CreateProductData): Promise<Product> {
        const formData = new FormData();
        formData.append("name", data.name);
        if (data.description) formData.append("description", data.description);
        if (data.image) formData.append("image", data.image);
        formData.append("selling_price", data.selling_price.toString());
        formData.append("is_active", (data.is_active ?? true).toString());

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/production/products/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeProduct(responseData);
    }

    /**
     * Update an existing product
     */
    async updateProduct(id: number, data: UpdateProductData): Promise<Product> {
        const formData = new FormData();
        if (data.name !== undefined) formData.append("name", data.name);
        if (data.description !== undefined) formData.append("description", data.description);
        if (data.image !== undefined) {
            if (data.image === null) {
                formData.append("image_clear", "true");
            } else {
                formData.append("image", data.image);
            }
        }
        if (data.selling_price !== undefined)
            formData.append("selling_price", data.selling_price.toString());
        if (data.is_active !== undefined) formData.append("is_active", data.is_active.toString());

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/production/products/${id}/`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeProduct(responseData);
    }

    /**
     * Delete a product
     */
    async deleteProduct(id: number): Promise<void> {
        await apiClient.delete(`/production/products/${id}/`);
    }

    // ==================== RECIPES ====================

    /**
     * Get list of recipes with pagination
     */
    async getRecipes(params: RecipeListParams = {}): Promise<RecipeListResponse> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.product) queryParams.append("product", params.product.toString());
        if (params.search) queryParams.append("search", params.search);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/production/recipes/?${queryParams}`);
        const responseData = response.data;

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
                results: (wrapped.data || []).map((item) => this.normalizeRecipe(item)),
            };
        }

        if (responseData && !Array.isArray(responseData) && "results" in responseData) {
            const paginated = responseData as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((item) => this.normalizeRecipe(item)),
            };
        }

        if (Array.isArray(responseData)) {
            return {
                count: responseData.length,
                next: null,
                previous: null,
                results: responseData.map((item) =>
                    this.normalizeRecipe(item as Record<string, unknown>)
                ),
            };
        }

        return {
            count: 0,
            next: null,
            previous: null,
            results: [],
        };
    }

    /**
     * Get single recipe by ID
     */
    async getRecipe(id: number): Promise<Recipe> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/production/recipes/${id}/`);
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeRecipe(data);
    }

    /**
     * Get recipe by product ID
     */
    async getRecipeByProduct(productId: number): Promise<Recipe | null> {
        try {
            const recipes = await this.getRecipes({
                product: productId,
                page_size: 1,
            });
            return recipes.results.length > 0 ? recipes.results[0] : null;
        } catch {
            return null;
        }
    }

    /**
     * Create a new recipe
     */
    async createRecipe(data: CreateRecipeData): Promise<Recipe> {
        const payload = {
            product: data.product,
            composite_ingredient: data.composite_ingredient ?? null,
            instructions: data.instructions ?? "",
            standard_yield: data.standard_yield,
            items: data.items.map((item) => ({
                ingredient: item.ingredient,
                quantity: item.quantity,
            })),
        };

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/production/recipes/", payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeRecipe(responseData);
    }

    /**
     * Update an existing recipe
     */
    async updateRecipe(id: number, data: UpdateRecipeData): Promise<Recipe> {
        const payload: Record<string, unknown> = {};
        if (data.product !== undefined) payload.product = data.product;
        if (data.composite_ingredient !== undefined)
            payload.composite_ingredient = data.composite_ingredient;
        if (data.instructions !== undefined) payload.instructions = data.instructions;
        if (data.standard_yield !== undefined) payload.standard_yield = data.standard_yield;
        if (data.items !== undefined) {
            payload.items = data.items.map((item) => ({
                ingredient: item.ingredient,
                quantity: item.quantity,
            }));
        }

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/production/recipes/${id}/`, payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeRecipe(responseData);
    }

    /**
     * Delete a recipe
     */
    async deleteRecipe(id: number): Promise<void> {
        await apiClient.delete(`/production/recipes/${id}/`);
    }

    /**
     * Get product IDs that already have recipes (lightweight endpoint for filtering)
     */
    async getProductsWithRecipes(): Promise<number[]> {
        const response = await apiClient.get<
            ApiResponse<number[]> | { data: { data: number[] } } | { data: number[] }
        >("/production/recipes/products-with-recipes/");
        const data = response.data;
        // Handle nested response structure: data.data.data contains the array
        const d = data as ApiResponse<number[]> | { data: { data: number[] } } | { data: number[] };
        if (
            "data" in d &&
            typeof d.data === "object" &&
            d.data &&
            "data" in d.data &&
            Array.isArray(d.data.data)
        ) {
            return d.data.data;
        }
        // Fallback to direct data array if structure is different
        if ("data" in d && Array.isArray(d.data)) {
            return d.data;
        }
        return [];
    }

    // ==================== PRODUCTION RUNS ====================

    /**
     * Normalize production run data from backend (camelCase or snake_case)
     */
    private normalizeProductionRun(run: Record<string, unknown>): ProductionRun {
        return {
            id: run.id as number,
            chef: run.chef as number,
            chef_name: (run.chefName || run.chef_name) as string,
            product: run.product as number,
            product_name: (run.productName || run.product_name) as string,
            composite_ingredient: (run.compositeIngredient || run.composite_ingredient) as number,
            composite_name: (run.compositeName || run.composite_name) as string,
            quantity_produced: parseFloat(
                run.quantityProduced?.toString() || run.quantity_produced?.toString() || "0"
            ),
            date_produced: (run.dateProduced || run.date_produced) as string,
            notes: (run.notes || "") as string,
            usages: ((run.usages as Record<string, unknown>[]) || []).map((usage) => ({
                ingredient__name: (usage.ingredient__name ||
                    usage.ingredient_Name ||
                    usage.ingredientName ||
                    "") as string,
                ingredient__unit: (usage.ingredient__unit ||
                    usage.ingredient_Unit ||
                    usage.ingredientUnit ||
                    "") as string,
                theoretical_amount: parseFloat(
                    usage.theoreticalAmount?.toString() ||
                        usage.theoretical_amount?.toString() ||
                        "0"
                ),
                actual_amount: parseFloat(
                    usage.actualAmount?.toString() || usage.actual_amount?.toString() || "0"
                ),
                wastage: parseFloat(usage.wastage?.toString() || "0"),
            })),
        };
    }

    /**
     * Get list of production runs with pagination and filters
     */
    async getProductionRuns(
        params: ProductionRunListParams = {}
    ): Promise<ProductionRunListResponse> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.product) queryParams.append("product", params.product.toString());
        if (params.chef) queryParams.append("chef", params.chef.toString());
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/production/runs/?${queryParams.toString()}`);
        const responseData = response.data;

        // Handle wrapped response format
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
                results: (wrapped.data || []).map((item) => this.normalizeProductionRun(item)),
            };
        }

        // Handle direct paginated response
        if (responseData && !Array.isArray(responseData) && "results" in responseData) {
            const paginated = responseData as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((item) => this.normalizeProductionRun(item)),
            };
        }

        // Fallback for array response
        if (Array.isArray(responseData)) {
            return {
                count: responseData.length,
                next: null,
                previous: null,
                results: responseData.map((item) =>
                    this.normalizeProductionRun(item as Record<string, unknown>)
                ),
            };
        }

        return {
            count: 0,
            next: null,
            previous: null,
            results: [],
        };
    }

    /**
     * Get single production run by ID
     */
    async getProductionRun(id: number): Promise<ProductionRun> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/production/runs/${id}/`);
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeProductionRun(data);
    }

    /**
     * Create new production run
     */
    async createProductionRun(data: CreateProductionRunData): Promise<ProductionRun> {
        const payload: Record<string, unknown> = {
            product: data.product || null,
            composite_ingredient: data.composite_ingredient || null,
            quantity_produced: data.quantity_produced,
            notes: data.notes || "",
        };

        if (data.usage_inputs && data.usage_inputs.length > 0) {
            payload.usage_inputs = data.usage_inputs.map((input) => ({
                ingredient_id: input.ingredient, // Backend expects ingredient_id
                actual_amount: input.actual_amount,
            }));
        }

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/production/runs/", payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeProductionRun(responseData);
    }

    /**
     * Delete production run (will reverse stock changes)
     */
    async deleteProductionRun(id: number): Promise<void> {
        await apiClient.delete(`/production/runs/${id}/`);
    }
}

export const productionService = new ProductionService();
