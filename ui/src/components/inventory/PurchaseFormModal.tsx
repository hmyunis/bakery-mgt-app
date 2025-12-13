import { useState, useEffect } from "react";
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
    Chip,
} from "@heroui/react";
import { X } from "lucide-react";
import type {
    Ingredient,
    Purchase,
    CreatePurchaseData,
    UpdatePurchaseData,
} from "../../types/inventory";
import { useIngredients, useCreatePurchase, useUpdatePurchase } from "../../hooks/useInventory";

interface PurchaseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchase?: Purchase | null;
    preselectedIngredient?: Ingredient | null;
}

const RECENT_VENDORS_KEY = "bakery_recent_vendors";
const MAX_RECENT_VENDORS = 5;

// Helper functions for recent vendors
const getRecentVendors = (): string[] => {
    try {
        const stored = localStorage.getItem(RECENT_VENDORS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveRecentVendor = (vendor: string) => {
    if (!vendor.trim()) return;
    const vendors = getRecentVendors();
    // Remove if already exists, then add to front
    const filtered = vendors.filter((v) => v.toLowerCase() !== vendor.toLowerCase());
    const updated = [vendor.trim(), ...filtered].slice(0, MAX_RECENT_VENDORS);
    localStorage.setItem(RECENT_VENDORS_KEY, JSON.stringify(updated));
};

const removeRecentVendor = (vendor: string): string[] => {
    const vendors = getRecentVendors();
    const updated = vendors.filter((v) => v !== vendor);
    localStorage.setItem(RECENT_VENDORS_KEY, JSON.stringify(updated));
    return updated;
};

type CostInputMode = "total" | "unit";

export function PurchaseFormModal({
    isOpen,
    onClose,
    purchase,
    preselectedIngredient,
}: PurchaseFormModalProps) {
    const isEdit = !!purchase;

    const [formData, setFormData] = useState({
        ingredient: "",
        quantity: "",
        total_cost: "",
        unit_cost: "",
        vendor: "",
        notes: "",
    });

    const [costInputMode, setCostInputMode] = useState<CostInputMode>("total");
    const [recentVendors, setRecentVendors] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: ingredientsData } = useIngredients({ page_size: 100 });
    const { mutateAsync: createPurchase, isPending: isCreating } = useCreatePurchase();
    const { mutateAsync: updatePurchase, isPending: isUpdating } = useUpdatePurchase();

    const isLoading = isCreating || isUpdating;
    const ingredients = ingredientsData?.results || [];

    // Load recent vendors on mount
    useEffect(() => {
        setRecentVendors(getRecentVendors());
    }, []);

    // Reset form when modal opens/closes or purchase changes
    useEffect(() => {
        if (isOpen) {
            setRecentVendors(getRecentVendors());
            if (purchase) {
                setFormData({
                    ingredient: purchase.ingredient.toString(),
                    quantity: purchase.quantity.toString(),
                    total_cost: purchase.total_cost.toString(),
                    unit_cost: purchase.unit_cost.toString(),
                    vendor: purchase.vendor || "",
                    notes: purchase.notes || "",
                });
                setCostInputMode("total");
            } else if (preselectedIngredient) {
                setFormData({
                    ingredient: preselectedIngredient.id.toString(),
                    quantity: "",
                    total_cost: "",
                    unit_cost: "",
                    vendor: "",
                    notes: "",
                });
                setCostInputMode("total");
            } else {
                setFormData({
                    ingredient: "",
                    quantity: "",
                    total_cost: "",
                    unit_cost: "",
                    vendor: "",
                    notes: "",
                });
                setCostInputMode("total");
            }
            setErrors({});
        }
    }, [isOpen, purchase, preselectedIngredient]);

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

    const handleRemoveRecentVendor = (vendor: string) => {
        const updated = removeRecentVendor(vendor);
        setRecentVendors(updated);
    };

    const handleSelectRecentVendor = (vendor: string) => {
        handleInputChange("vendor", vendor);
    };

    // Calculate total cost from unit cost and quantity, or vice versa
    const calculateTotalCost = (): number => {
        if (costInputMode === "total") {
            return parseFloat(formData.total_cost) || 0;
        } else {
            const qty = parseFloat(formData.quantity) || 0;
            const unitCost = parseFloat(formData.unit_cost) || 0;
            return qty * unitCost;
        }
    };

    const calculateUnitCost = (): number => {
        if (costInputMode === "unit") {
            return parseFloat(formData.unit_cost) || 0;
        } else {
            const qty = parseFloat(formData.quantity) || 0;
            const totalCost = parseFloat(formData.total_cost) || 0;
            return qty > 0 ? totalCost / qty : 0;
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.ingredient) {
            newErrors.ingredient = "Ingredient is required";
        }

        if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
            newErrors.quantity = "Quantity must be greater than 0";
        }

        if (costInputMode === "total") {
            if (!formData.total_cost || parseFloat(formData.total_cost) < 0) {
                newErrors.total_cost = "Total cost must be 0 or greater";
            }
        } else {
            if (!formData.unit_cost || parseFloat(formData.unit_cost) < 0) {
                newErrors.unit_cost = "Unit cost must be 0 or greater";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        // Save vendor to recent vendors
        if (formData.vendor.trim()) {
            saveRecentVendor(formData.vendor);
        }

        const totalCost = calculateTotalCost();

        try {
            if (isEdit && purchase) {
                const updateData: UpdatePurchaseData = {
                    ingredient: parseInt(formData.ingredient),
                    quantity: parseFloat(formData.quantity),
                    total_cost: totalCost,
                    vendor: formData.vendor || undefined,
                    notes: formData.notes || undefined,
                };

                await updatePurchase({ id: purchase.id, data: updateData });
            } else {
                const createData: CreatePurchaseData = {
                    ingredient: parseInt(formData.ingredient),
                    quantity: parseFloat(formData.quantity),
                    total_cost: totalCost,
                    vendor: formData.vendor || undefined,
                    notes: formData.notes || undefined,
                };

                await createPurchase(createData);
            }
            onClose();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    // Preview values
    const previewTotalCost = calculateTotalCost().toFixed(2);
    const previewUnitCost = calculateUnitCost().toFixed(2);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur">
            <ModalContent className="max-h-screen overflow-y-auto">
                {(onCloseModal) => (
                    <>
                        <ModalHeader>
                            {isEdit
                                ? "Edit Purchase"
                                : preselectedIngredient
                                ? `Record Purchase for ${preselectedIngredient.name}`
                                : "Record New Purchase"}
                        </ModalHeader>
                        <ModalBody className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Show ingredient selector only when no preselected ingredient */}
                            {!preselectedIngredient ? (
                                <Select
                                    label="Ingredient"
                                    selectedKeys={formData.ingredient ? [formData.ingredient] : []}
                                    onSelectionChange={(keys) => {
                                        const selected = Array.from(keys)[0] as string;
                                        if (selected) handleInputChange("ingredient", selected);
                                    }}
                                    isRequired
                                    isInvalid={!!errors.ingredient}
                                    errorMessage={errors.ingredient}
                                    classNames={{
                                        trigger: "!w-full !text-left",
                                        label: "!w-full !text-left",
                                        base: "!w-full !text-left",
                                        value: "!text-slate-900 dark:!text-slate-100",
                                    }}
                                >
                                    {ingredients.map((ing) => (
                                        <SelectItem key={ing.id.toString()}>
                                            {ing.name} ({ing.unit})
                                        </SelectItem>
                                    ))}
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
                                </div>
                            )}

                            {/* Quantity input */}
                            <Input
                                label="Quantity"
                                type="number"
                                value={formData.quantity}
                                onValueChange={(v) => handleInputChange("quantity", v)}
                                isRequired
                                placeholder="0.000"
                                step="0.001"
                                min="0"
                                isInvalid={!!errors.quantity}
                                errorMessage={errors.quantity}
                                classNames={{
                                    input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                }}
                            />

                            {/* Cost input mode selector */}
                            <div className="space-y-3 lg:col-span-2">
                                <RadioGroup
                                    label="Cost Input Method"
                                    orientation="horizontal"
                                    value={costInputMode}
                                    onValueChange={(v) => setCostInputMode(v as CostInputMode)}
                                    classNames={{
                                        label: "text-sm text-zinc-600 dark:text-zinc-400",
                                    }}
                                >
                                    <Radio value="total">Total Cost</Radio>
                                    <Radio value="unit">Unit Cost</Radio>
                                </RadioGroup>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {costInputMode === "total" ? (
                                        <Input
                                            label="Total Cost (ETB)"
                                            type="number"
                                            value={formData.total_cost}
                                            onValueChange={(v) =>
                                                handleInputChange("total_cost", v)
                                            }
                                            isRequired
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            isInvalid={!!errors.total_cost}
                                            errorMessage={errors.total_cost}
                                            classNames={{
                                                input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                            }}
                                        />
                                    ) : (
                                        <Input
                                            label="Unit Cost (ETB)"
                                            type="number"
                                            value={formData.unit_cost}
                                            onValueChange={(v) => handleInputChange("unit_cost", v)}
                                            isRequired
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            isInvalid={!!errors.unit_cost}
                                            errorMessage={errors.unit_cost}
                                            classNames={{
                                                input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                            }}
                                        />
                                    )}

                                    {/* Calculated preview */}
                                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 flex flex-col justify-center">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {costInputMode === "total" ? "Unit Cost" : "Total Cost"}
                                        </p>
                                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {costInputMode === "total"
                                                ? previewUnitCost
                                                : previewTotalCost}{" "}
                                            ETB
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Vendor input with recent vendors */}
                            <div className="space-y-2">
                                <Input
                                    label="Vendor (Optional)"
                                    value={formData.vendor}
                                    onValueChange={(v) => handleInputChange("vendor", v)}
                                    placeholder="Enter vendor name"
                                    classNames={{
                                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                    }}
                                />

                                {recentVendors.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Recent Vendors
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {recentVendors.map((vendor) => (
                                                <Chip
                                                    key={vendor}
                                                    variant="flat"
                                                    size="sm"
                                                    className="cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                    onClick={() => handleSelectRecentVendor(vendor)}
                                                    endContent={
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveRecentVendor(vendor);
                                                            }}
                                                            className="ml-1 hover:text-danger focus:outline-none"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    }
                                                >
                                                    {vendor}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Textarea
                                label="Notes (Optional)"
                                value={formData.notes}
                                onValueChange={(v) => handleInputChange("notes", v)}
                                placeholder="Additional notes about this purchase"
                                classNames={{
                                    input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
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
                                {isEdit ? "Save Changes" : "Record Purchase"}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
