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
    private normalizeProduct(product: any): Product {
        return {
            id: product.id,
            name: product.name,
            description: product.description,
            image: product.image,
            selling_price: parseFloat(product.sellingPrice ?? product.selling_price ?? 0),
            stock_quantity: parseInt(product.stockQuantity ?? product.stock_quantity ?? 0),
            is_active: product.isActive ?? product.is_active ?? true,
            created_at: product.createdAt ?? product.created_at,
        };
    }

    /**
     * Normalize recipe data from backend
     */
    private normalizeRecipe(recipe: any): Recipe {
        return {
            id: recipe.id,
            product: recipe.product,
            composite_ingredient: recipe.compositeIngredient ?? recipe.composite_ingredient,
            instructions: recipe.instructions,
            standard_yield: parseFloat(recipe.standardYield ?? recipe.standard_yield ?? 1),
            items: (recipe.items ?? []).map((item: any) => ({
                id: item.id,
                ingredient: item.ingredient,
                ingredient_name: item.ingredientName ?? item.ingredient_name,
                quantity: parseFloat(item.quantity ?? 0),
                unit: item.unit,
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

        const response = await apiClient.get(`/production/products/?${queryParams}`);
        const data = response.data;

        return {
            count: data.pagination?.count ?? data.count ?? 0,
            next: data.pagination?.next ?? data.next ?? null,
            previous: data.pagination?.previous ?? data.previous ?? null,
            results: (data.data ?? data.results ?? []).map((item: any) =>
                this.normalizeProduct(item)
            ),
        };
    }

    /**
     * Get single product by ID
     */
    async getProduct(id: number): Promise<Product> {
        const response = await apiClient.get(`/production/products/${id}/`);
        const data = response.data;
        return this.normalizeProduct(data.data ?? data);
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

        const response = await apiClient.post("/production/products/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        const responseData = response.data;
        return this.normalizeProduct(responseData.data ?? responseData);
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

        const response = await apiClient.patch(`/production/products/${id}/`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        const responseData = response.data;
        return this.normalizeProduct(responseData.data ?? responseData);
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

        const response = await apiClient.get(`/production/recipes/?${queryParams}`);
        const data = response.data;

        return {
            count: data.pagination?.count ?? data.count ?? 0,
            next: data.pagination?.next ?? data.next ?? null,
            previous: data.pagination?.previous ?? data.previous ?? null,
            results: (data.data ?? data.results ?? []).map((item: any) =>
                this.normalizeRecipe(item)
            ),
        };
    }

    /**
     * Get single recipe by ID
     */
    async getRecipe(id: number): Promise<Recipe> {
        const response = await apiClient.get(`/production/recipes/${id}/`);
        const data = response.data;
        return this.normalizeRecipe(data.data ?? data);
    }

    /**
     * Get recipe by product ID
     */
    async getRecipeByProduct(productId: number): Promise<Recipe | null> {
        try {
            const recipes = await this.getRecipes({ product: productId, page_size: 1 });
            return recipes.results.length > 0 ? recipes.results[0] : null;
        } catch (error) {
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

        const response = await apiClient.post("/production/recipes/", payload);
        const responseData = response.data;
        return this.normalizeRecipe(responseData.data ?? responseData);
    }

    /**
     * Update an existing recipe
     */
    async updateRecipe(id: number, data: UpdateRecipeData): Promise<Recipe> {
        const payload: any = {};
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

        const response = await apiClient.patch(`/production/recipes/${id}/`, payload);
        const responseData = response.data;
        return this.normalizeRecipe(responseData.data ?? responseData);
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
        const response = await apiClient.get("/production/recipes/products-with-recipes/");
        const data = response.data;
        // Handle nested response structure: data.data.data contains the array
        if (data?.data?.data && Array.isArray(data.data.data)) {
            return data.data.data;
        }
        // Fallback to direct data array if structure is different
        if (Array.isArray(data?.data)) {
            return data.data;
        }
        return [];
    }

    // ==================== PRODUCTION RUNS ====================

    /**
     * Normalize production run data from backend (camelCase or snake_case)
     */
    private normalizeProductionRun(run: any): ProductionRun {
        return {
            id: run.id,
            chef: run.chef,
            chef_name: run.chefName || run.chef_name,
            product: run.product,
            product_name: run.productName || run.product_name,
            composite_ingredient: run.compositeIngredient || run.composite_ingredient,
            composite_name: run.compositeName || run.composite_name,
            quantity_produced: parseFloat(
                run.quantityProduced?.toString() || run.quantity_produced?.toString() || "0"
            ),
            date_produced: run.dateProduced || run.date_produced,
            notes: run.notes || "",
            usages: (run.usages || []).map((usage: any) => ({
                ingredient__name:
                    usage.ingredient__name || usage.ingredient_Name || usage.ingredientName || "",
                ingredient__unit:
                    usage.ingredient__unit || usage.ingredient_Unit || usage.ingredientUnit || "",
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

        const response = await apiClient.get<any>(`/production/runs/?${queryParams.toString()}`);

        // Handle wrapped response format
        if (response.data && "data" in response.data && "pagination" in response.data) {
            const pagination = response.data.pagination;
            const results = (response.data.data || []).map((item: any) =>
                this.normalizeProductionRun(item)
            );
            return {
                count: pagination.count || 0,
                next: pagination.next || null,
                previous: pagination.previous || null,
                results,
            };
        }

        // Handle direct paginated response
        if (response.data && "results" in response.data) {
            return {
                ...response.data,
                results: (response.data.results || []).map((item: any) =>
                    this.normalizeProductionRun(item)
                ),
            };
        }

        // Fallback for array response
        return {
            count: Array.isArray(response.data) ? response.data.length : 0,
            next: null,
            previous: null,
            results: Array.isArray(response.data)
                ? response.data.map((item: any) => this.normalizeProductionRun(item))
                : [],
        };
    }

    /**
     * Get single production run by ID
     */
    async getProductionRun(id: number): Promise<ProductionRun> {
        const response = await apiClient.get<any>(`/production/runs/${id}/`);
        const data = response.data?.data || response.data;
        return this.normalizeProductionRun(data);
    }

    /**
     * Create new production run
     */
    async createProductionRun(data: CreateProductionRunData): Promise<ProductionRun> {
        const payload: any = {
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

        const response = await apiClient.post<any>("/production/runs/", payload);
        const responseData = response.data?.data || response.data;
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
