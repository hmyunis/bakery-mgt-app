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
} from "../types/inventory";

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
    private normalizeIngredient(ingredient: any): Ingredient {
        return {
            id: ingredient.id,
            name: ingredient.name,
            unit: ingredient.unit,
            current_stock: parseFloat(ingredient.currentStock || ingredient.current_stock || 0),
            reorder_point: parseFloat(ingredient.reorderPoint || ingredient.reorder_point || 0),
            average_cost_per_unit: parseFloat(ingredient.averageCostPerUnit || ingredient.average_cost_per_unit || 0),
            last_purchased_price: parseFloat(ingredient.lastPurchasedPrice || ingredient.last_purchased_price || 0),
            updated_at: ingredient.updatedAt || ingredient.updated_at,
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

        const response = await apiClient.get<any>(`/inventory/ingredients/?${queryParams.toString()}`);

        // Handle wrapped response format
        if (response.data && "data" in response.data && "pagination" in response.data) {
            const pagination = response.data.pagination;
            const results = (response.data.data || []).map((item: any) =>
                this.normalizeIngredient(item)
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
                    this.normalizeIngredient(item)
                ),
            };
        }

        // Fallback for array response
        return {
            count: Array.isArray(response.data) ? response.data.length : 0,
            next: null,
            previous: null,
            results: Array.isArray(response.data)
                ? response.data.map((item: any) => this.normalizeIngredient(item))
                : [],
        };
    }

    /**
     * Get single ingredient by ID
     */
    async getIngredient(id: number): Promise<Ingredient> {
        const response = await apiClient.get<any>(`/inventory/ingredients/${id}/`);
        const data = response.data?.data || response.data;
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
        const response = await apiClient.post<any>("/inventory/ingredients/", payload);
        const responseData = response.data?.data || response.data;
        return this.normalizeIngredient(responseData);
    }

    /**
     * Update ingredient
     */
    async updateIngredient(id: number, data: UpdateIngredientData): Promise<Ingredient> {
        const payload: any = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.unit !== undefined) payload.unit = data.unit;
        if (data.reorder_point !== undefined) payload.reorder_point = data.reorder_point;

        const response = await apiClient.patch<any>(`/inventory/ingredients/${id}/`, payload);
        const responseData = response.data?.data || response.data;
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
        const response = await apiClient.get<any>("/inventory/ingredients/shopping_list/");
        const data = response.data?.data || response.data;
        return {
            items: (data.items || []).map((item: any) => this.normalizeIngredient(item)),
            share_text: data.shareText || data.share_text || "",
        };
    }

    // ==================== PURCHASES ====================

    /**
     * Normalize purchase data from backend (camelCase or snake_case)
     */
    private normalizePurchase(purchase: any): Purchase {
        return {
            id: purchase.id,
            purchaser: purchase.purchaser,
            purchaser_name: purchase.purchaserName || purchase.purchaser_name,
            ingredient: purchase.ingredient,
            ingredient_name: purchase.ingredientName || purchase.ingredient_name,
            quantity: parseFloat(purchase.quantity || 0),
            total_cost: parseFloat(purchase.totalCost || purchase.total_cost || 0),
            unit_cost: parseFloat(purchase.unitCost || purchase.unit_cost || 0),
            purchase_date: purchase.purchaseDate || purchase.purchase_date,
            vendor: purchase.vendor,
            notes: purchase.notes,
            is_price_anomaly: purchase.isPriceAnomaly !== undefined ? purchase.isPriceAnomaly : purchase.is_price_anomaly || false,
        };
    }

    /**
     * Get list of purchases with pagination and filters
     */
    async getPurchases(
        params: PurchaseListParams = {}
    ): Promise<InventoryListResponse<Purchase>> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.ingredient) queryParams.append("ingredient", params.ingredient.toString());
        if (params.is_price_anomaly !== undefined)
            queryParams.append("is_price_anomaly", params.is_price_anomaly.toString());

        const response = await apiClient.get<any>(`/inventory/purchases/?${queryParams.toString()}`);

        // Handle wrapped response format
        if (response.data && "data" in response.data && "pagination" in response.data) {
            const pagination = response.data.pagination;
            const results = (response.data.data || []).map((item: any) =>
                this.normalizePurchase(item)
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
                    this.normalizePurchase(item)
                ),
            };
        }

        // Fallback for array response
        return {
            count: Array.isArray(response.data) ? response.data.length : 0,
            next: null,
            previous: null,
            results: Array.isArray(response.data)
                ? response.data.map((item: any) => this.normalizePurchase(item))
                : [],
        };
    }

    /**
     * Get single purchase by ID
     */
    async getPurchase(id: number): Promise<Purchase> {
        const response = await apiClient.get<any>(`/inventory/purchases/${id}/`);
        const data = response.data?.data || response.data;
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
        const response = await apiClient.post<any>("/inventory/purchases/", payload);
        const responseData = response.data?.data || response.data;
        return this.normalizePurchase(responseData);
    }

    /**
     * Update purchase
     */
    async updatePurchase(id: number, data: UpdatePurchaseData): Promise<Purchase> {
        const payload: any = {};
        if (data.ingredient !== undefined) payload.ingredient = data.ingredient;
        if (data.quantity !== undefined) payload.quantity = data.quantity;
        if (data.total_cost !== undefined) payload.total_cost = data.total_cost;
        if (data.vendor !== undefined) payload.vendor = data.vendor;
        if (data.notes !== undefined) payload.notes = data.notes;

        const response = await apiClient.patch<any>(`/inventory/purchases/${id}/`, payload);
        const responseData = response.data?.data || response.data;
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
    private normalizeStockAdjustment(adjustment: any): StockAdjustment {
        return {
            id: adjustment.id,
            ingredient: adjustment.ingredient,
            ingredient_name: adjustment.ingredientName || adjustment.ingredient_name,
            actor: adjustment.actor,
            actor_name: adjustment.actorName || adjustment.actor_name,
            quantity_change: parseFloat(
                adjustment.quantityChange || adjustment.quantity_change || 0
            ),
            reason: adjustment.reason,
            notes: adjustment.notes || "",
            timestamp: adjustment.timestamp,
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

        const response = await apiClient.get<any>(
            `/inventory/adjustments/?${queryParams.toString()}`
        );

        // Handle wrapped response format
        if (response.data && "data" in response.data && "pagination" in response.data) {
            const pagination = response.data.pagination;
            const results = (response.data.data || []).map((item: any) =>
                this.normalizeStockAdjustment(item)
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
                    this.normalizeStockAdjustment(item)
                ),
            };
        }

        // Fallback for array response
        return {
            count: Array.isArray(response.data) ? response.data.length : 0,
            next: null,
            previous: null,
            results: Array.isArray(response.data)
                ? response.data.map((item: any) => this.normalizeStockAdjustment(item))
                : [],
        };
    }

    /**
     * Get single stock adjustment by ID
     */
    async getStockAdjustment(id: number): Promise<StockAdjustment> {
        const response = await apiClient.get<any>(`/inventory/adjustments/${id}/`);
        const data = response.data?.data || response.data;
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
        const response = await apiClient.post<any>("/inventory/adjustments/", payload);
        const responseData = response.data?.data || response.data;
        return this.normalizeStockAdjustment(responseData);
    }

    /**
     * Update stock adjustment
     */
    async updateStockAdjustment(
        id: number,
        data: UpdateStockAdjustmentData
    ): Promise<StockAdjustment> {
        const payload: any = {};
        if (data.ingredient !== undefined) payload.ingredient = data.ingredient;
        if (data.quantity_change !== undefined) payload.quantity_change = data.quantity_change;
        if (data.reason !== undefined) payload.reason = data.reason;
        if (data.notes !== undefined) payload.notes = data.notes;

        const response = await apiClient.patch<any>(`/inventory/adjustments/${id}/`, payload);
        const responseData = response.data?.data || response.data;
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

