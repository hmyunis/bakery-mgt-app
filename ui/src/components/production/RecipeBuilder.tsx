import { useState, useEffect, useMemo } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Textarea,
    Select,
    SelectItem,
    Chip,
} from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import type { Recipe, CreateRecipeData, UpdateRecipeData } from "../../types/production";
import type { Ingredient } from "../../types/inventory";
import { useIngredients } from "../../hooks/useInventory";
import {
    useCreateRecipe,
    useUpdateRecipe,
    useProducts,
    useProductsWithRecipes,
} from "../../hooks/useProduction";

interface RecipeBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    recipe?: Recipe | null;
    preselectedProductId?: number | null;
}

export function RecipeBuilder({
    isOpen,
    onClose,
    recipe,
    preselectedProductId,
}: RecipeBuilderProps) {
    const isEdit = !!recipe;

    const [formData, setFormData] = useState({
        product: "",
        instructions: "",
        standard_yield: "1",
    });

    const [items, setItems] = useState<Array<{ ingredient: number; quantity: string }>>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: productsData } = useProducts({ page_size: 100 });
    const { data: ingredientsData } = useIngredients({ page_size: 100 });
    const { data: productsWithRecipesIds } = useProductsWithRecipes();

    // Ensure productsWithRecipesIds is always an array
    const productsWithRecipesArray = Array.isArray(productsWithRecipesIds)
        ? productsWithRecipesIds
        : [];
    const { mutateAsync: createRecipe, isPending: isCreating } = useCreateRecipe();
    const { mutateAsync: updateRecipe, isPending: isUpdating } = useUpdateRecipe();

    const isLoading = isCreating || isUpdating;
    const allProducts = productsData?.results ?? [];
    const ingredients = ingredientsData?.results ?? [];

    // Filter products to exclude those that already have recipes (unless editing)
    const availableProducts = useMemo(() => {
        if (isEdit && recipe?.product) {
            // When editing, include the current product
            return allProducts.filter(
                (p) => !productsWithRecipesArray.includes(p.id) || p.id === recipe.product
            );
        }
        // When creating, exclude all products with recipes
        return allProducts.filter((p) => !productsWithRecipesArray.includes(p.id));
    }, [allProducts, productsWithRecipesArray, isEdit, recipe]);

    // Get ingredient map for quick lookup
    const ingredientMap = useMemo(() => {
        const map = new Map<number, Ingredient>();
        ingredients.forEach((ing) => map.set(ing.id, ing));
        return map;
    }, [ingredients]);

    // Get available ingredients for a specific row (excludes already selected ingredients)
    const getAvailableIngredients = (currentIndex: number): Ingredient[] => {
        const selectedIngredientIds = new Set(
            items
                .map((item, index) => (index !== currentIndex ? item.ingredient : null))
                .filter((id): id is number => id !== null && id !== 0)
        );
        return ingredients.filter((ing) => !selectedIngredientIds.has(ing.id));
    };

    // Check if all ingredients are already selected
    const allIngredientsSelected = useMemo(() => {
        if (ingredients.length === 0) return false;
        const selectedIngredientIds = new Set(
            items.map((item) => item.ingredient).filter((id) => id !== 0)
        );
        return selectedIngredientIds.size >= ingredients.length;
    }, [items, ingredients]);

    // Reset form when modal opens/closes or recipe changes
    useEffect(() => {
        if (isOpen) {
            if (recipe) {
                setFormData({
                    product: recipe.product?.toString() || "",
                    instructions: recipe.instructions || "",
                    standard_yield: recipe.standard_yield?.toString() || "1",
                });
                setItems(
                    recipe.items.map((item) => ({
                        ingredient: item.ingredient,
                        quantity: item.quantity.toString(),
                    }))
                );
            } else {
                setFormData({
                    product: preselectedProductId?.toString() || "",
                    instructions: "",
                    standard_yield: "1",
                });
                setItems([]);
            }
            setErrors({});
        }
    }, [isOpen, recipe, preselectedProductId]);

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleAddItem = () => {
        const availableIngredients = getAvailableIngredients(-1);
        if (availableIngredients.length > 0) {
            setItems((prev) => [
                ...prev,
                {
                    ingredient: availableIngredients[0].id,
                    quantity: "",
                },
            ]);
        }
    };

    const handleRemoveItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: "ingredient" | "quantity", value: string) => {
        setItems((prev) => {
            const newItems = [...prev];
            if (field === "ingredient") {
                newItems[index] = {
                    ...newItems[index],
                    ingredient: parseInt(value),
                };
            } else {
                newItems[index] = {
                    ...newItems[index],
                    quantity: value,
                };
            }
            return newItems;
        });

        // Clear errors for this field when it changes
        if (errors[`item_${index}_${field}`]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[`item_${index}_${field}`];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.product) {
            newErrors.product = "Product is required";
        }

        if (!formData.standard_yield || parseFloat(formData.standard_yield) <= 0) {
            newErrors.standard_yield = "Standard yield must be greater than 0";
        }

        if (items.length === 0) {
            newErrors.items = "At least one ingredient is required";
        }

        // Check for duplicate ingredients
        const ingredientIds = items.map((item) => item.ingredient).filter((id) => id !== 0);
        const duplicateIngredientIds = ingredientIds.filter(
            (id, index) => ingredientIds.indexOf(id) !== index
        );

        items.forEach((item, index) => {
            if (!item.ingredient) {
                newErrors[`item_${index}_ingredient`] = "Ingredient is required";
            } else if (duplicateIngredientIds.includes(item.ingredient)) {
                newErrors[`item_${index}_ingredient`] = "This ingredient is already selected";
            }
            const quantity = parseFloat(item.quantity);
            if (!item.quantity || isNaN(quantity) || quantity <= 0) {
                newErrors[`item_${index}_quantity`] = "Quantity must be greater than 0";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            const recipeItems = items.map((item) => {
                const quantity = parseFloat(item.quantity);
                return {
                    ingredient: item.ingredient,
                    quantity: isNaN(quantity) ? 0 : quantity,
                };
            });

            if (isEdit && recipe) {
                const updateData: UpdateRecipeData = {
                    product: parseInt(formData.product) || null,
                    instructions: formData.instructions || undefined,
                    standard_yield: parseFloat(formData.standard_yield),
                    items: recipeItems,
                };
                await updateRecipe({ id: recipe.id, data: updateData });
            } else {
                const createData: CreateRecipeData = {
                    product: parseInt(formData.product) || null,
                    instructions: formData.instructions || undefined,
                    standard_yield: parseFloat(formData.standard_yield),
                    items: recipeItems,
                };
                await createRecipe(createData);
            }
            onClose();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    {isEdit ? "Edit Recipe" : "Create Recipe"}
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Select
                            label="Product"
                            placeholder="Select a product"
                            selectedKeys={formData.product ? [formData.product] : []}
                            onSelectionChange={(keys) => {
                                const selected = Array.from(keys)[0] as string;
                                handleInputChange("product", selected || "");
                            }}
                            errorMessage={errors.product}
                            isInvalid={!!errors.product}
                            isRequired
                            isDisabled={!!preselectedProductId}
                            classNames={{
                                trigger: "!w-full !text-left",
                                label: "!w-full !text-left",
                                base: "!w-full !text-left",
                                value: "!text-slate-900 dark:!text-slate-100",
                            }}
                        >
                            {availableProducts.length > 0 ? (
                                availableProducts.map((product) => (
                                    <SelectItem key={product.id.toString()}>
                                        {product.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem key="none" isDisabled>
                                    All products already have recipes
                                </SelectItem>
                            )}
                        </Select>

                        <Input
                            label="Standard Yield"
                            placeholder="e.g., 100"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={formData.standard_yield}
                            onValueChange={(value) => handleInputChange("standard_yield", value)}
                            errorMessage={errors.standard_yield}
                            isInvalid={!!errors.standard_yield}
                            isRequired
                            description="The quantity this recipe produces (e.g., 100 breads)"
                            classNames={{
                                input: "!text-zinc-900 dark:!text-zinc-100",
                                inputWrapper:
                                    "!placeholder:text-zinc-400 dark:!placeholder:text-zinc-500",
                            }}
                        />

                        <Textarea
                            label="Instructions"
                            placeholder="Optional recipe instructions..."
                            value={formData.instructions}
                            onValueChange={(value) => handleInputChange("instructions", value)}
                            minRows={3}
                            classNames={{
                                input: "!text-zinc-900 dark:!text-zinc-100",
                                inputWrapper:
                                    "!placeholder:text-zinc-400 dark:!placeholder:text-zinc-500",
                            }}
                        />

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium">Ingredients</label>
                                <Button
                                    size="sm"
                                    color="primary"
                                    variant="flat"
                                    startContent={<Plus className="h-4 w-4" />}
                                    onPress={handleAddItem}
                                    isDisabled={allIngredientsSelected}
                                >
                                    Add Ingredient
                                </Button>
                            </div>

                            {errors.items && (
                                <p className="text-danger text-sm mb-2">{errors.items}</p>
                            )}

                            <div className="space-y-3">
                                {items.map((item, index) => {
                                    const ingredient = ingredientMap.get(item.ingredient);
                                    const availableIngredients = getAvailableIngredients(index);
                                    return (
                                        <div
                                            key={index}
                                            className="flex gap-2 items-start p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                                        >
                                            <Select
                                                placeholder="Select ingredient"
                                                selectedKeys={
                                                    item.ingredient
                                                        ? [item.ingredient.toString()]
                                                        : []
                                                }
                                                onSelectionChange={(keys) => {
                                                    const selected = Array.from(keys)[0] as string;
                                                    handleItemChange(
                                                        index,
                                                        "ingredient",
                                                        selected || ""
                                                    );
                                                }}
                                                errorMessage={errors[`item_${index}_ingredient`]}
                                                isInvalid={!!errors[`item_${index}_ingredient`]}
                                                isDisabled={availableIngredients.length === 0}
                                                classNames={{
                                                    trigger: "!w-full !text-left flex-1",
                                                    label: "!w-full !text-left",
                                                    base: "!w-full !text-left",
                                                    value: "!text-slate-900 dark:!text-slate-100",
                                                }}
                                            >
                                                {availableIngredients.map((ing) => (
                                                    <SelectItem key={ing.id.toString()}>
                                                        {ing.name}
                                                    </SelectItem>
                                                ))}
                                            </Select>

                                            <Input
                                                placeholder="Quantity"
                                                type="number"
                                                step="0.001"
                                                min="0.001"
                                                value={item.quantity}
                                                onValueChange={(value) =>
                                                    handleItemChange(index, "quantity", value || "")
                                                }
                                                errorMessage={errors[`item_${index}_quantity`]}
                                                isInvalid={!!errors[`item_${index}_quantity`]}
                                                endContent={
                                                    ingredient && (
                                                        <Chip
                                                            size="sm"
                                                            variant="flat"
                                                            className="mr-2"
                                                        >
                                                            {ingredient.unit}
                                                        </Chip>
                                                    )
                                                }
                                                classNames={{
                                                    input: "!text-zinc-900 dark:!text-zinc-100",
                                                    inputWrapper:
                                                        "!placeholder:text-zinc-400 dark:!placeholder:text-zinc-500",
                                                }}
                                            />

                                            <Button
                                                isIconOnly
                                                variant="light"
                                                color="danger"
                                                size="sm"
                                                onPress={() => handleRemoveItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })}

                                {items.length === 0 && (
                                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                                        No ingredients added. Click "Add Ingredient" to get started.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="light"
                        onPress={onClose}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        Cancel
                    </Button>
                    <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
                        {isEdit ? "Update" : "Create"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
