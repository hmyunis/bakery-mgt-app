import { useState, useEffect, useMemo } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Select,
    SelectItem,
    Textarea,
    RadioGroup,
    Radio,
} from "@heroui/react";
import type {
    Ingredient,
    StockAdjustment,
    CreateStockAdjustmentData,
    UpdateStockAdjustmentData,
    StockAdjustmentReason,
} from "../../types/inventory";
import {
    useIngredients,
    useCreateStockAdjustment,
    useUpdateStockAdjustment,
} from "../../hooks/useInventory";
import { toast } from "sonner";

interface StockAdjustmentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedIngredient?: Ingredient | null;
}

const REASON_OPTIONS: { value: StockAdjustmentReason; label: string }[] = [
    { value: "waste", label: "Accidental Waste" },
    { value: "theft", label: "Theft/Loss" },
    { value: "audit", label: "Audit Correction" },
];

export function StockAdjustmentFormModal({
    isOpen,
    onClose,
    preselectedIngredient,
}: StockAdjustmentFormModalProps) {

    const [formData, setFormData] = useState({
        ingredient: "",
        quantity_change: "",
        reason: "" as StockAdjustmentReason | "",
        notes: "",
    });

    const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("remove");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: ingredientsData } = useIngredients({ page_size: 100 });
    const { mutateAsync: createAdjustment, isPending: isCreating } = useCreateStockAdjustment();

    const isLoading = isCreating;
    const ingredients = ingredientsData?.results || [];

    // Memoize selectedKeys Sets for selects
    const ingredientSelectedKeys = useMemo(() => {
        return formData.ingredient ? new Set<string>([formData.ingredient]) : new Set<string>();
    }, [formData.ingredient]);

    const reasonSelectedKeys = useMemo(() => {
        return formData.reason ? new Set<string>([formData.reason]) : new Set<string>();
    }, [formData.reason]);

    // Transform ingredients to items format for Select
    const ingredientItems = useMemo(() => {
        return ingredients.map((ing) => ({
            key: ing.id.toString(),
            label: `${ing.name} (${ing.unit})`,
        }));
    }, [ingredients]);

    // Transform reason options to items format for Select
    const reasonItems = useMemo(() => {
        return REASON_OPTIONS.map((option) => ({
            key: option.value,
            label: option.label,
        }));
    }, []);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            if (preselectedIngredient) {
                setFormData({
                    ingredient: preselectedIngredient.id.toString(),
                    quantity_change: "",
                    reason: "",
                    notes: "",
                });
                setAdjustmentType("remove");
            } else {
                setFormData({
                    ingredient: "",
                    quantity_change: "",
                    reason: "",
                    notes: "",
                });
                setAdjustmentType("remove");
            }
            setErrors({});
        }
    }, [isOpen, preselectedIngredient]);

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

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.ingredient) {
            newErrors.ingredient = "Ingredient is required";
        }

        if (!formData.quantity_change || parseFloat(formData.quantity_change) <= 0) {
            newErrors.quantity_change = "Quantity must be greater than 0";
        }

        if (!formData.reason) {
            newErrors.reason = "Reason is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        const quantityChange =
            adjustmentType === "add"
                ? parseFloat(formData.quantity_change)
                : -parseFloat(formData.quantity_change);

        try {
            const createData: CreateStockAdjustmentData = {
                ingredient: parseInt(formData.ingredient),
                quantity_change: quantityChange,
                reason: formData.reason as StockAdjustmentReason,
                notes: formData.notes || undefined,
            };

            await createAdjustment(createData);
            toast.success("Stock adjustment recorded successfully");
            onClose();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    const selectedIngredient = ingredients.find(
        (ing) => ing.id.toString() === formData.ingredient
    ) || preselectedIngredient;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur">
            <ModalContent className="max-h-screen overflow-y-auto">
                {(onCloseModal) => (
                    <>
                        <ModalHeader>
                            {preselectedIngredient
                                ? `Adjust Stock for ${preselectedIngredient.name}`
                                : "Record Stock Adjustment"}
                        </ModalHeader>
                        <ModalBody className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Show ingredient selector only when no preselected ingredient */}
                            {!preselectedIngredient ? (
                                <Select
                                    label="Ingredient"
                                    placeholder="Select an ingredient"
                                    selectionMode="single"
                                    selectedKeys={ingredientSelectedKeys}
                                    onSelectionChange={(keys) => {
                                        const selected = Array.from(keys)[0] as string;
                                        if (selected) {
                                            handleInputChange("ingredient", selected);
                                        } else {
                                            handleInputChange("ingredient", "");
                                        }
                                    }}
                                    isRequired
                                    isInvalid={!!errors.ingredient}
                                    errorMessage={errors.ingredient}
                                    items={ingredientItems}
                                    classNames={{
                                        trigger: "!w-full !text-left",
                                        label: "!w-full !text-left",
                                        base: "!w-full !text-left",
                                        value: "!text-slate-900 dark:!text-slate-100",
                                    }}
                                >
                                    {(ingredient) => <SelectItem>{ingredient.label}</SelectItem>}
                                </Select>
                            ) : (
                                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Ingredient
                                    </p>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {preselectedIngredient.name}{" "}
                                        <span className="text-zinc-500">
                                            ({preselectedIngredient.unit})
                                        </span>
                                    </p>
                                    {selectedIngredient && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            Current Stock: {selectedIngredient.current_stock.toFixed(3)}{" "}
                                            {selectedIngredient.unit}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Adjustment type selector */}
                            <div className="space-y-3">
                                <RadioGroup
                                    label="Adjustment Type"
                                    orientation="horizontal"
                                    value={adjustmentType}
                                    onValueChange={(v) => setAdjustmentType(v as "add" | "remove")}
                                    isDisabled={false}
                                    classNames={{
                                        label: "text-sm text-zinc-600 dark:text-zinc-400",
                                    }}
                                >
                                    <Radio value="add">Add Stock</Radio>
                                    <Radio value="remove">Remove Stock</Radio>
                                </RadioGroup>

                                {/* Quantity input */}
                                <Input
                                    label={`Quantity to ${adjustmentType === "add" ? "Add" : "Remove"}`}
                                    type="number"
                                    value={formData.quantity_change}
                                    onValueChange={(v) => handleInputChange("quantity_change", v)}
                                    isRequired
                                    placeholder="0.000"
                                    step="0.001"
                                    min="0"
                                    isInvalid={!!errors.quantity_change}
                                    errorMessage={errors.quantity_change}
                                    description={
                                        selectedIngredient
                                            ? `Current stock: ${selectedIngredient.current_stock.toFixed(3)} ${selectedIngredient.unit}`
                                            : undefined
                                    }
                                    classNames={{
                                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                    }}
                                />

                                {/* Preview of new stock level */}
                                {selectedIngredient && formData.quantity_change && parseFloat(formData.quantity_change) > 0 && (
                                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            New Stock Level
                                        </p>
                                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {(
                                                selectedIngredient.current_stock +
                                                (adjustmentType === "add"
                                                    ? parseFloat(formData.quantity_change)
                                                    : -parseFloat(formData.quantity_change))
                                            ).toFixed(3)}{" "}
                                            {selectedIngredient.unit}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Reason selector */}
                            <Select
                                label="Reason"
                                placeholder="Select a reason"
                                selectionMode="single"
                                selectedKeys={reasonSelectedKeys}
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0] as string;
                                    if (selected) {
                                        handleInputChange("reason", selected as StockAdjustmentReason);
                                    } else {
                                        handleInputChange("reason", "" as StockAdjustmentReason);
                                    }
                                }}
                                isRequired
                                isInvalid={!!errors.reason}
                                errorMessage={errors.reason}
                                items={reasonItems}
                                classNames={{
                                    trigger: "!w-full !text-left",
                                    label: "!w-full !text-left",
                                    base: "!w-full !text-left",
                                    value: "!text-slate-900 dark:!text-slate-100",
                                }}
                            >
                                {(reason) => <SelectItem>{reason.label}</SelectItem>}
                            </Select>

                            <Textarea
                                label="Notes (Optional)"
                                value={formData.notes}
                                onValueChange={(v) => handleInputChange("notes", v)}
                                placeholder="Additional notes about this adjustment"
                                classNames={{
                                    input: "!text-slate-900 dark:!text-zinc-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                }}
                            />
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="flat"
                                onPress={onCloseModal}
                                disabled={isLoading}
                                className="!text-zinc-700 dark:!text-zinc-300"
                            >
                                Cancel
                            </Button>
                            <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
                                Record Adjustment
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}

