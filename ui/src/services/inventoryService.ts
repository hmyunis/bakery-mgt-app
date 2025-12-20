import { apiClient } from "../lib/apiClient";
import type {
    Ingredient,
    CreateIngredientData,
    UpdateIngredientData,
    Purchase,
    CreatePurchaseData,
    UpdatePurchaseData,
    StockAdjustment,
    CreateStockAdjustmentData,
    UpdateStockAdjustmentData,
    ShoppingListResponse,
    IngredientListParams,
    PurchaseListParams,
    StockAdjustmentListParams,
    StockAdjustmentReason,
    Unit,
} from "../types/inventory";
import type { ApiResponse, WrappedPaginatedResponse, PaginatedResponse } from "../types/api";

export interface InventoryListResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

class InventoryService {
    // ==================== INGREDIENTS ====================

    /**
     * Normalize ingredient data from backend (camelCase or snake_case) to frontend (snake_case)
     */
    private normalizeIngredient(ingredient: Record<string, unknown>): Ingredient {
        return {
            id: ingredient.id as number,
            name: ingredient.name as string,
            unit: ingredient.unit as Unit, // Unit type is a union of strings
            current_stock: parseFloat(
                (ingredient.currentStock as string) || (ingredient.current_stock as string) || "0"
            ),
            reorder_point: parseFloat(
                (ingredient.reorderPoint as string) || (ingredient.reorder_point as string) || "0"
            ),
            average_cost_per_unit: parseFloat(
                (ingredient.averageCostPerUnit as string) ||
                    (ingredient.average_cost_per_unit as string) ||
                    "0"
            ),
            last_purchased_price: parseFloat(
                (ingredient.lastPurchasedPrice as string) ||
                    (ingredient.last_purchased_price as string) ||
                    "0"
            ),
            updated_at: (ingredient.updatedAt || ingredient.updated_at) as string,
        };
    }

    /**
     * Get list of ingredients with pagination and filters
     */
    async getIngredients(
        params: IngredientListParams = {}
    ): Promise<InventoryListResponse<Ingredient>> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/inventory/ingredients/?${queryParams.toString()}`);

        const responseData = response.data;

        // Handle wrapped response format
        if (
            responseData &&
            !Array.isArray(responseData) &&
            "data" in responseData &&
            "pagination" in responseData
        ) {
            const wrapped = responseData as WrappedPaginatedResponse<Record<string, unknown>>;
            const results = (wrapped.data || []).map((item) => this.normalizeIngredient(item));
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results,
            };
        }

        // Handle direct paginated response
        if (responseData && !Array.isArray(responseData) && "results" in responseData) {
            const paginated = responseData as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((item) => this.normalizeIngredient(item)),
            };
        }

        // Fallback for array response
        if (Array.isArray(responseData)) {
            return {
                count: responseData.length,
                next: null,
                previous: null,
                results: responseData.map((item) =>
                    this.normalizeIngredient(item as Record<string, unknown>)
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
     * Get single ingredient by ID
     */
    async getIngredient(id: number): Promise<Ingredient> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/inventory/ingredients/${id}/`);
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeIngredient(data);
    }

    /**
     * Create new ingredient
     */
    async createIngredient(data: CreateIngredientData): Promise<Ingredient> {
        const payload = {
            name: data.name,
            unit: data.unit,
            reorder_point: data.reorder_point,
        };
        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/inventory/ingredients/", payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeIngredient(responseData);
    }

    /**
     * Update ingredient
     */
    async updateIngredient(id: number, data: UpdateIngredientData): Promise<Ingredient> {
        const payload: Record<string, unknown> = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.unit !== undefined) payload.unit = data.unit;
        if (data.reorder_point !== undefined) payload.reorder_point = data.reorder_point;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/inventory/ingredients/${id}/`, payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeIngredient(responseData);
    }

    /**
     * Delete ingredient
     */
    async deleteIngredient(id: number): Promise<void> {
        await apiClient.delete(`/inventory/ingredients/${id}/`);
    }

    /**
     * Get shopping list (low stock items)
     */
    async getShoppingList(): Promise<ShoppingListResponse> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/inventory/ingredients/shopping_list/");
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return {
            items: ((data.items as Record<string, unknown>[]) || []).map((item) =>
                this.normalizeIngredient(item)
            ),
            share_text: (data.shareText || data.share_text || "") as string,
        };
    }

    // ==================== PURCHASES ====================

    /**
     * Normalize purchase data from backend (camelCase or snake_case)
     */
    private normalizePurchase(purchase: Record<string, unknown>): Purchase {
        return {
            id: purchase.id as number,
            purchaser: purchase.purchaser as number,
            purchaser_name: (purchase.purchaserName || purchase.purchaser_name) as string,
            ingredient: purchase.ingredient as number,
            ingredient_name: (purchase.ingredientName || purchase.ingredient_name) as string,
            quantity: parseFloat((purchase.quantity as string) || "0"),
            total_cost: parseFloat(
                (purchase.totalCost as string) || (purchase.total_cost as string) || "0"
            ),
            unit_cost: parseFloat(
                (purchase.unitCost as string) || (purchase.unit_cost as string) || "0"
            ),
            purchase_date: (purchase.purchaseDate || purchase.purchase_date) as string,
            vendor: purchase.vendor as string,
            notes: purchase.notes as string,
            is_price_anomaly:
                purchase.isPriceAnomaly !== undefined
                    ? (purchase.isPriceAnomaly as boolean)
                    : (purchase.is_price_anomaly as boolean) || false,
        };
    }

    /**
     * Get list of purchases with pagination and filters
     */
    async getPurchases(params: PurchaseListParams = {}): Promise<InventoryListResponse<Purchase>> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.ingredient) queryParams.append("ingredient", params.ingredient.toString());
        if (params.is_price_anomaly !== undefined)
            queryParams.append("is_price_anomaly", params.is_price_anomaly.toString());
        if (params.start_date) queryParams.append("start_date", params.start_date);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/inventory/purchases/?${queryParams.toString()}`);

        const responseData = response.data;

        // Handle wrapped response format
        if (
            responseData &&
            !Array.isArray(responseData) &&
            "data" in responseData &&
            "pagination" in responseData
        ) {
            const wrapped = responseData as WrappedPaginatedResponse<Record<string, unknown>>;
            const results = (wrapped.data || []).map((item) => this.normalizePurchase(item));
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results,
            };
        }

        // Handle direct paginated response
        if (responseData && !Array.isArray(responseData) && "results" in responseData) {
            const paginated = responseData as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((item) => this.normalizePurchase(item)),
            };
        }

        // Fallback for array response
        if (Array.isArray(responseData)) {
            return {
                count: responseData.length,
                next: null,
                previous: null,
                results: responseData.map((item) =>
                    this.normalizePurchase(item as Record<string, unknown>)
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
     * Get single purchase by ID
     */
    async getPurchase(id: number): Promise<Purchase> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/inventory/purchases/${id}/`);
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizePurchase(data);
    }

    /**
     * Create new purchase
     */
    async createPurchase(data: CreatePurchaseData): Promise<Purchase> {
        const payload = {
            ingredient: data.ingredient,
            quantity: data.quantity,
            total_cost: data.total_cost,
            vendor: data.vendor || "",
            notes: data.notes || "",
        };
        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/inventory/purchases/", payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizePurchase(responseData);
    }

    /**
     * Update purchase
     */
    async updatePurchase(id: number, data: UpdatePurchaseData): Promise<Purchase> {
        const payload: Record<string, unknown> = {};
        if (data.ingredient !== undefined) payload.ingredient = data.ingredient;
        if (data.quantity !== undefined) payload.quantity = data.quantity;
        if (data.total_cost !== undefined) payload.total_cost = data.total_cost;
        if (data.vendor !== undefined) payload.vendor = data.vendor;
        if (data.notes !== undefined) payload.notes = data.notes;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/inventory/purchases/${id}/`, payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizePurchase(responseData);
    }

    /**
     * Delete purchase
     */
    async deletePurchase(id: number): Promise<void> {
        await apiClient.delete(`/inventory/purchases/${id}/`);
    }

    // ==================== STOCK ADJUSTMENTS ====================

    /**
     * Normalize stock adjustment data from backend (camelCase or snake_case)
     */
    private normalizeStockAdjustment(adjustment: Record<string, unknown>): StockAdjustment {
        return {
            id: adjustment.id as number,
            ingredient: adjustment.ingredient as number,
            ingredient_name: (adjustment.ingredientName || adjustment.ingredient_name) as string,
            actor: adjustment.actor as number,
            actor_name: (adjustment.actorName || adjustment.actor_name) as string,
            quantity_change: parseFloat(
                (adjustment.quantityChange as string) ||
                    (adjustment.quantity_change as string) ||
                    "0"
            ),
            reason: adjustment.reason as StockAdjustmentReason,
            notes: (adjustment.notes || "") as string,
            timestamp: adjustment.timestamp as string,
        };
    }

    /**
     * Get list of stock adjustments with pagination and filters
     */
    async getStockAdjustments(
        params: StockAdjustmentListParams = {}
    ): Promise<InventoryListResponse<StockAdjustment>> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.ingredient) queryParams.append("ingredient", params.ingredient.toString());
        if (params.start_date) queryParams.append("start_date", params.start_date);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/inventory/adjustments/?${queryParams.toString()}`);

        const responseData = response.data;

        // Handle wrapped response format
        if (
            responseData &&
            !Array.isArray(responseData) &&
            "data" in responseData &&
            "pagination" in responseData
        ) {
            const wrapped = responseData as WrappedPaginatedResponse<Record<string, unknown>>;
            const results = (wrapped.data || []).map((item) => this.normalizeStockAdjustment(item));
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results,
            };
        }

        // Handle direct paginated response
        if (responseData && !Array.isArray(responseData) && "results" in responseData) {
            const paginated = responseData as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((item) =>
                    this.normalizeStockAdjustment(item)
                ),
            };
        }

        // Fallback for array response
        if (Array.isArray(responseData)) {
            return {
                count: responseData.length,
                next: null,
                previous: null,
                results: responseData.map((item) =>
                    this.normalizeStockAdjustment(item as Record<string, unknown>)
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
     * Get single stock adjustment by ID
     */
    async getStockAdjustment(id: number): Promise<StockAdjustment> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/inventory/adjustments/${id}/`);
        const data =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeStockAdjustment(data);
    }

    /**
     * Create new stock adjustment
     */
    async createStockAdjustment(data: CreateStockAdjustmentData): Promise<StockAdjustment> {
        const payload = {
            ingredient: data.ingredient,
            quantity_change: data.quantity_change,
            reason: data.reason,
            notes: data.notes || "",
        };
        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/inventory/adjustments/", payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeStockAdjustment(responseData);
    }

    /**
     * Update stock adjustment
     */
    async updateStockAdjustment(
        id: number,
        data: UpdateStockAdjustmentData
    ): Promise<StockAdjustment> {
        const payload: Record<string, unknown> = {};
        if (data.ingredient !== undefined) payload.ingredient = data.ingredient;
        if (data.quantity_change !== undefined) payload.quantity_change = data.quantity_change;
        if (data.reason !== undefined) payload.reason = data.reason;
        if (data.notes !== undefined) payload.notes = data.notes;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/inventory/adjustments/${id}/`, payload);
        const responseData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        return this.normalizeStockAdjustment(responseData);
    }

    /**
     * Delete stock adjustment
     */
    async deleteStockAdjustment(id: number): Promise<void> {
        await apiClient.delete(`/inventory/adjustments/${id}/`);
    }
}

export const inventoryService = new InventoryService();
