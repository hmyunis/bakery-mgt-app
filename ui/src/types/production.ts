/**
 * Production types matching the backend models
 * @see api/production/models.py
 */

export interface Product {
    id: number;
    name: string;
    description?: string;
    image?: string;
    selling_price: number;
    stock_quantity: number;
    is_active: boolean;
    created_at: string;
    hasRecipe?: boolean; // Added for UI filtering
}

export interface CreateProductData {
    name: string;
    description?: string;
    image?: File | null;
    selling_price: number;
    is_active?: boolean;
}

export interface UpdateProductData {
    name?: string;
    description?: string;
    image?: File | null;
    selling_price?: number;
    is_active?: boolean;
}

export interface ProductListParams {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
}

export interface RecipeItem {
    id?: number;
    ingredient: number;
    ingredient_name?: string;
    quantity: number;
    unit?: string;
}

export interface Recipe {
    id: number;
    product: number | null;
    composite_ingredient: number | null;
    instructions?: string;
    standard_yield: number;
    items: RecipeItem[];
}

export interface CreateRecipeData {
    product: number | null;
    composite_ingredient?: number | null;
    instructions?: string;
    standard_yield: number;
    items: Omit<RecipeItem, "id" | "ingredient_name" | "unit">[];
}

export interface UpdateRecipeData {
    product?: number | null;
    composite_ingredient?: number | null;
    instructions?: string;
    standard_yield?: number;
    items?: Omit<RecipeItem, "id" | "ingredient_name" | "unit">[];
}

export interface RecipeListParams {
    page?: number;
    page_size?: number;
    product?: number;
    search?: string;
}

export interface IngredientUsage {
    ingredient__name: string;
    ingredient__unit?: string;
    theoretical_amount: number;
    actual_amount: number;
    wastage: number;
}

export interface ProductionRun {
    id: number;
    chef: number | null;
    chef_name?: string;
    product: number | null;
    product_name?: string;
    composite_ingredient: number | null;
    composite_name?: string;
    quantity_produced: number;
    date_produced: string;
    notes?: string;
    usages: IngredientUsage[];
}

export interface CreateProductionRunData {
    product?: number | null;
    composite_ingredient?: number | null;
    quantity_produced: number;
    notes?: string;
    usage_inputs?: Array<{
        ingredient: number;
        actual_amount: number;
    }>;
}

export interface ProductionRunListParams {
    page?: number;
    page_size?: number;
    product?: number;
    chef?: number;
    ordering?: string;
    start_date?: string;
}
