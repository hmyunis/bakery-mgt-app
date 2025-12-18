/**
 * Inventory types matching the backend models
 * @see api/inventory/models.py
 */

export type Unit = "kg" | "g" | "l" | "ml" | "pcs";

export interface Ingredient {
    id: number;
    name: string;
    unit: Unit;
    current_stock: number;
    reorder_point: number;
    average_cost_per_unit: number;
    last_purchased_price: number;
    updated_at: string;
}

export interface CreateIngredientData {
    name: string;
    unit: Unit;
    reorder_point: number;
}

export interface UpdateIngredientData {
    name?: string;
    unit?: Unit;
    reorder_point?: number;
}

export interface Purchase {
    id: number;
    purchaser: number | null;
    purchaser_name?: string;
    ingredient: number;
    ingredient_name?: string;
    quantity: number;
    total_cost: number;
    unit_cost: number;
    purchase_date: string;
    vendor?: string;
    notes?: string;
    is_price_anomaly: boolean;
}

export interface CreatePurchaseData {
    ingredient: number;
    quantity: number;
    total_cost: number;
    vendor?: string;
    notes?: string;
}

export interface UpdatePurchaseData {
    ingredient?: number;
    quantity?: number;
    total_cost?: number;
    vendor?: string;
    notes?: string;
}

export type StockAdjustmentReason =
    | "waste"
    | "theft"
    | "audit"
    | "return"
    | "packaging_usage";

export interface StockAdjustment {
    id: number;
    ingredient: number;
    ingredient_name?: string;
    actor: number | null;
    actor_name?: string;
    quantity_change: number;
    reason: StockAdjustmentReason;
    notes?: string;
    timestamp: string;
}

export interface CreateStockAdjustmentData {
    ingredient: number;
    quantity_change: number;
    reason: StockAdjustmentReason;
    notes?: string;
}

export interface UpdateStockAdjustmentData {
    ingredient?: number;
    quantity_change?: number;
    reason?: StockAdjustmentReason;
    notes?: string;
}

export interface ShoppingListResponse {
    items: Ingredient[];
    share_text: string;
}

export interface IngredientListParams {
    page?: number;
    page_size?: number;
    search?: string;
    ordering?: string;
}

export interface PurchaseListParams {
    page?: number;
    page_size?: number;
    ingredient?: number;
    is_price_anomaly?: boolean;
    start_date?: string;
}

export interface StockAdjustmentListParams {
    page?: number;
    page_size?: number;
    ingredient?: number;
    start_date?: string;
}

