import { useState } from "react";
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
    Divider,
} from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import type { CreateProductionRunData, Product } from "../../types/production";
import { useIngredients } from "../../hooks/useInventory";
import { useCreateProductionRun, useProducts, useRecipeByProduct } from "../../hooks/useProduction";

interface ProductionRunFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedProduct?: Product | null;
}

// Internal component to handle form logic.
// Mounts freshly when the modal opens or the product context changes.
function ProductionRunFormContent({
    preselectedProduct,
    onClose,
}: {
    preselectedProduct?: Product | null;
    onClose: () => void;
}) {
    // Initialize form data directly from props
    const [formData, setFormData] = useState({
        product: preselectedProduct?.id.toString() || "",
        quantity_produced: "",
        notes: "",
    });

    // Store actual amounts keyed by ingredient ID: { [ingredientId]: "amount" }
    // We don't need to sync this with recipe; we just clear it if product changes.
    const [actualAmounts, setActualAmounts] = useState<Record<number, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: productsData } = useProducts({
        page_size: 100,
        is_active: true,
    });
    const { data: ingredientsData } = useIngredients({ page_size: 100 });

    // Fetch recipe based on currently selected product (from state)
    const { data: recipe } = useRecipeByProduct(
        formData.product ? parseInt(formData.product) : null
    );

    const { mutateAsync: createProductionRun, isPending: isCreating } = useCreateProductionRun();

    const products = productsData?.results || [];
    const ingredients = ingredientsData?.results || [];

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        // If product changes, reset the actual amounts entered
        if (field === "product") {
            setActualAmounts({});
        }

        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleUsageAmountChange = (ingredientId: number, value: string) => {
        setActualAmounts((prev) => ({
            ...prev,
            [ingredientId]: value,
        }));

        // Clear specific error if exists
        const errorKey = `usage_${ingredientId}`;
        if (errors[errorKey]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[errorKey];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.product) {
            newErrors.product = "Product is required";
        }

        if (!formData.quantity_produced || parseFloat(formData.quantity_produced) <= 0) {
            newErrors.quantity_produced = "Quantity must be greater than 0";
        }

        // Validate actual amounts
        Object.entries(actualAmounts).forEach(([ingId, amount]) => {
            if (amount && parseFloat(amount) < 0) {
                newErrors[`usage_${ingId}`] = "Actual amount cannot be negative";
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
            // Construct usage inputs from the recipe items and the manual overrides (actualAmounts)
            // If no recipe, usage_inputs is empty.
            const usage_inputs = recipe?.items
                ? recipe.items
                      .map((item) => ({
                          ingredient: item.ingredient,
                          actual_amount: actualAmounts[item.ingredient]
                              ? parseFloat(actualAmounts[item.ingredient])
                              : 0, // 0 or undefined depending on backend requirement. Usually filtered out if 0.
                      }))
                      .filter((usage) => usage.actual_amount > 0)
                : [];

            const createData: CreateProductionRunData = {
                product: parseInt(formData.product),
                quantity_produced: parseFloat(formData.quantity_produced),
                notes: formData.notes || undefined,
                usage_inputs: usage_inputs,
            };

            await createProductionRun(createData);
            onClose();
        } catch {
            // Error handling is done in the hook
        }
    };

    // Get ingredient name helper
    const getIngredientName = (ingredientId: number): string => {
        const ingredient = ingredients.find((ing) => ing.id === ingredientId);
        return ingredient?.name || `Ingredient #${ingredientId}`;
    };

    // Calculate theoretical amount for each ingredient
    const getTheoreticalAmount = (ingredientId: number): number => {
        if (!recipe || !formData.quantity_produced) return 0;
        const recipeItem = recipe.items.find((item) => item.ingredient === ingredientId);
        if (!recipeItem) return 0;
        const ratio = parseFloat(formData.quantity_produced) / recipe.standard_yield;
        return recipeItem.quantity * ratio;
    };

    // Calculate wastage preview
    const getWastagePreview = (ingredientId: number, actualAmountStr: string): number => {
        if (!actualAmountStr) return 0;
        const theoretical = getTheoreticalAmount(ingredientId);
        const actual = parseFloat(actualAmountStr);
        return actual - theoretical;
    };

    return (
        <>
            <ModalHeader>
                {preselectedProduct
                    ? `Record Production: ${preselectedProduct.name}`
                    : "Record Baking Session"}
            </ModalHeader>
            <ModalBody className="space-y-4">
                {/* Product Selection */}
                {!preselectedProduct ? (
                    <Select
                        label="Product"
                        placeholder="Select a product"
                        selectionMode="single"
                        selectedKeys={
                            formData.product
                                ? new Set<string>([formData.product])
                                : new Set<string>()
                        }
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string;
                            if (selected) {
                                handleInputChange("product", selected);
                            }
                        }}
                        isRequired
                        isInvalid={!!errors.product}
                        errorMessage={errors.product}
                        items={products.map((p) => ({
                            key: p.id.toString(),
                            label: p.name,
                        }))}
                        classNames={{
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            base: "!w-full !text-left",
                            value: "!text-slate-900 dark:!text-slate-100",
                        }}
                    >
                        {(product) => <SelectItem>{product.label}</SelectItem>}
                    </Select>
                ) : (
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Product</p>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {preselectedProduct.name}
                        </p>
                    </div>
                )}

                {/* Recipe Info */}
                {recipe && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            Recipe Information
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Standard Yield: {recipe.standard_yield} pcs
                        </p>
                    </div>
                )}

                {/* Quantity Produced */}
                <Input
                    label="Quantity Produced"
                    type="number"
                    value={formData.quantity_produced}
                    onValueChange={(v) => handleInputChange("quantity_produced", v)}
                    isRequired
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    isInvalid={!!errors.quantity_produced}
                    errorMessage={errors.quantity_produced}
                    description={
                        recipe && formData.quantity_produced
                            ? `Ratio: ${(
                                  parseFloat(formData.quantity_produced) / recipe.standard_yield
                              ).toFixed(3)}x`
                            : undefined
                    }
                    classNames={{
                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                    }}
                />

                {/* Ingredient Usage Inputs - Derived from Recipe Items */}
                {recipe && recipe.items && recipe.items.length > 0 && (
                    <div className="space-y-3">
                        <Divider />
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Ingredient Usage (Optional)
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Leave empty to use theoretical amounts
                            </p>
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {recipe.items.map((item) => {
                                const theoretical = getTheoreticalAmount(item.ingredient);
                                const actualVal = actualAmounts[item.ingredient] || "";
                                const wastage = getWastagePreview(item.ingredient, actualVal);
                                const ingredient = ingredients.find(
                                    (ing) => ing.id === item.ingredient
                                );

                                return (
                                    <div
                                        key={item.ingredient}
                                        className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {getIngredientName(item.ingredient)}
                                            </span>
                                            {ingredient && (
                                                <Chip variant="flat" size="sm">
                                                    {ingredient.unit}
                                                </Chip>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-zinc-500 dark:text-zinc-400">
                                                    Theoretical:{" "}
                                                </span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                    {theoretical.toFixed(3)}
                                                </span>
                                            </div>
                                            <div>
                                                <Input
                                                    size="sm"
                                                    label="Actual Amount"
                                                    type="number"
                                                    value={actualVal}
                                                    onValueChange={(v) =>
                                                        handleUsageAmountChange(item.ingredient, v)
                                                    }
                                                    placeholder={theoretical.toFixed(3)}
                                                    step="0.001"
                                                    min="0"
                                                    isInvalid={!!errors[`usage_${item.ingredient}`]}
                                                    errorMessage={
                                                        errors[`usage_${item.ingredient}`]
                                                    }
                                                    classNames={{
                                                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        {actualVal && parseFloat(actualVal) > 0 && (
                                            <div className="flex items-center gap-2 text-xs">
                                                {wastage > 0 ? (
                                                    <>
                                                        <AlertTriangle className="h-3 w-3 text-danger-500" />
                                                        <span className="text-danger-600 dark:text-danger-400 font-medium">
                                                            Wastage: +{wastage.toFixed(3)}
                                                        </span>
                                                    </>
                                                ) : wastage < 0 ? (
                                                    <span className="text-success-600 dark:text-success-400">
                                                        Saved: {Math.abs(wastage).toFixed(3)}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-500">
                                                        No wastage
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Notes */}
                <Textarea
                    label="Notes (Optional)"
                    value={formData.notes}
                    onValueChange={(v) => handleInputChange("notes", v)}
                    placeholder="Additional notes about this production run"
                    classNames={{
                        input: "!text-slate-900 dark:!text-zinc-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                    }}
                />
            </ModalBody>
            <ModalFooter>
                <Button
                    variant="flat"
                    onPress={onClose}
                    disabled={isCreating}
                    className="!text-zinc-700 dark:!text-zinc-300"
                >
                    Cancel
                </Button>
                <Button
                    color="primary"
                    onPress={handleSubmit}
                    isLoading={isCreating}
                    isDisabled={!recipe || !formData.quantity_produced}
                >
                    Record Production
                </Button>
            </ModalFooter>
        </>
    );
}

export function ProductionRunFormModal({
    isOpen,
    onClose,
    preselectedProduct,
}: ProductionRunFormModalProps) {
    // We use a key to ensure the form content is completely re-mounted
    // whenever the modal opens or the product changes. This resets all internal state.
    const formKey = preselectedProduct ? `run-${preselectedProduct.id}` : "run-new";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" backdrop="blur" scrollBehavior="inside">
            <ModalContent className="max-h-[90vh]">
                {(onCloseModal) => (
                    <ProductionRunFormContent
                        key={formKey}
                        preselectedProduct={preselectedProduct}
                        onClose={onCloseModal}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
