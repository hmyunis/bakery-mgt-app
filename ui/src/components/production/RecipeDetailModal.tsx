import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Chip,
} from "@heroui/react";
import { Utensils, Package, Scale, FileText } from "lucide-react";
import type { Recipe } from "../../types/production";
import type { Ingredient } from "../../types/inventory";
import { useIngredients } from "../../hooks/useInventory";
import { useProducts, useRecipe } from "../../hooks/useProduction";
import { Spinner } from "@heroui/react";

interface RecipeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipe: Recipe | null;
    onEdit?: (recipe: Recipe) => void;
}

export function RecipeDetailModal({
    isOpen,
    onClose,
    recipe,
    onEdit,
}: RecipeDetailModalProps) {
    const { data: productsData } = useProducts({ page_size: 100 });
    const { data: ingredientsData } = useIngredients({ page_size: 100 });
    
    // Fetch the latest recipe data to ensure it updates after edits
    const { data: latestRecipe, isLoading: isLoadingRecipe } = useRecipe(
        recipe?.id ?? null
    );

    // Use the latest recipe data if available, otherwise fall back to the prop
    const displayRecipe = latestRecipe ?? recipe;

    if (!displayRecipe) return null;

    const product = productsData?.results.find((p) => p.id === displayRecipe.product) || null;
    const ingredientMap = new Map<number, Ingredient>();
    ingredientsData?.results.forEach((ing) => ingredientMap.set(ing.id, ing));

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Utensils className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                Recipe Details
                            </h2>
                            {product && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    For {product.name}
                                </p>
                            )}
                        </div>
                    </div>
                </ModalHeader>
                <ModalBody>
                    {isLoadingRecipe ? (
                        <div className="flex justify-center py-12">
                            <Spinner size="lg" />
                        </div>
                    ) : (
                    <div className="space-y-6">
                        {/* Product Information */}
                        {product && (
                            <div className="flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Package className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                        Product
                                    </p>
                                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                        {product.name}
                                    </p>
                                    {product.description && (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                            {product.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Standard Yield */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Scale className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Standard Yield
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {parseFloat(displayRecipe.standard_yield.toString()).toFixed(2)}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    Quantity this recipe produces
                                </p>
                            </div>

                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Utensils className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Ingredients Count
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {displayRecipe.items?.length || 0}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    Total ingredients required
                                </p>
                            </div>
                        </div>

                        {/* Instructions */}
                        {displayRecipe.instructions && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Instructions
                                    </p>
                                </div>
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
                                    <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                                        {displayRecipe.instructions}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Ingredients List */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Utensils className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                    Ingredients
                                </p>
                            </div>
                            <div className="space-y-2">
                                {displayRecipe.items && displayRecipe.items.length > 0 ? (
                                    displayRecipe.items.map((item, index) => {
                                        const ingredient = ingredientMap.get(item.ingredient);
                                        const ingredientName =
                                            item.ingredient_name ||
                                            ingredient?.name ||
                                            `Ingredient #${item.ingredient}`;
                                        const unit = item.unit || ingredient?.unit || "";

                                        return (
                                            <div
                                                key={item.id || index}
                                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                            {ingredientName}
                                                        </p>
                                                        {ingredient && (
                                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                Current stock: {ingredient.current_stock.toFixed(3)}{" "}
                                                                {ingredient.unit}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:flex-shrink-0">
                                                    <div className="text-left sm:text-right">
                                                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                                            {parseFloat(item.quantity.toString()).toFixed(3)}
                                                        </p>
                                                        {unit && (
                                                            <Chip
                                                                size="sm"
                                                                variant="flat"
                                                                className="mt-1 uppercase"
                                                            >
                                                                {unit}
                                                            </Chip>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                                        <p className="text-zinc-500 dark:text-zinc-400">
                                            No ingredients added to this recipe.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="light"
                        onPress={onClose}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        Close
                    </Button>
                    {onEdit && displayRecipe && (
                        <Button color="primary" onPress={() => onEdit(displayRecipe)}>
                            Edit Recipe
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

