import { useState, useMemo } from "react";
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
    Alert,
} from "@heroui/react";
import { X, AlertTriangle } from "lucide-react";
import type {
    Ingredient,
    Purchase,
    CreatePurchaseData,
    UpdatePurchaseData,
} from "../../types/inventory";
import { useIngredients, useCreatePurchase, useUpdatePurchase } from "../../hooks/useInventory";
import { useBankAccounts } from "../../hooks/useTreasury";

interface PurchaseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchase?: Purchase | null;
    preselectedIngredient?: Ingredient | null;
}

const RECENT_VENDORS_KEY = "bakery_recent_vendors";
const MAX_RECENT_VENDORS = 5;

// --- Helper functions for recent vendors ---

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

// --- Internal Form Component ---
// This component handles all state and logic. It is mounted freshly
// whenever the modal opens or the purchase/ingredient changes.
function PurchaseFormContent({
    purchase,
    preselectedIngredient,
    onClose,
}: {
    purchase?: Purchase | null;
    preselectedIngredient?: Ingredient | null;
    onClose: () => void;
}) {
    const isEdit = !!purchase;

    // Initialize state directly from props
    const [formData, setFormData] = useState({
        ingredient: purchase?.ingredient.toString() || preselectedIngredient?.id.toString() || "",
        quantity: purchase?.quantity.toString() || "",
        total_cost: purchase?.total_cost.toString() || "",
        unit_cost: purchase?.unit_cost.toString() || "",
        vendor: purchase?.vendor || "",
        notes: purchase?.notes || "",
        bank_account: purchase?.bank_account_id?.toString() || "",
    });

    const [costInputMode, setCostInputMode] = useState<CostInputMode>("total");
    const [recentVendors, setRecentVendors] = useState<string[]>(getRecentVendors());
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: ingredientsData } = useIngredients({ page_size: 100 });
    const { data: bankAccountsData, isLoading: isLoadingBankAccounts } = useBankAccounts({
        page_size: 200,
    });
    const { mutateAsync: createPurchase, isPending: isCreating } = useCreatePurchase();
    const { mutateAsync: updatePurchase, isPending: isUpdating } = useUpdatePurchase();

    const isLoading = isCreating || isUpdating;
    const ingredients = useMemo(() => ingredientsData?.results || [], [ingredientsData]);
    const bankAccounts = useMemo(() => bankAccountsData?.results || [], [bankAccountsData]);

    // Memoize selectedKeys Set for ingredient select
    const ingredientSelectedKeys = useMemo(() => {
        return formData.ingredient ? new Set<string>([formData.ingredient]) : new Set<string>();
    }, [formData.ingredient]);

    // Transform ingredients to items format for Select
    const ingredientItems = useMemo(() => {
        return ingredients.map((ing) => ({
            key: ing.id.toString(),
            label: `${ing.name} (${ing.unit})`,
        }));
    }, [ingredients]);

    const bankSelectedKeys = useMemo(() => {
        return formData.bank_account ? new Set<string>([formData.bank_account]) : new Set();
    }, [formData.bank_account]);

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

        const qty = parseFloat(formData.quantity);
        if (!formData.quantity || isNaN(qty) || qty <= 0) {
            newErrors.quantity = "Quantity must be greater than 0";
        }

        const totalCost = calculateTotalCost();
        if (isNaN(totalCost) || totalCost < 0) {
            newErrors.total_cost = "Total cost cannot be negative";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            const totalCost = calculateTotalCost();
            const unitCost = calculateUnitCost();

            if (isEdit && purchase) {
                const updateData: UpdatePurchaseData = {
                    ingredient: parseInt(formData.ingredient),
                    quantity: parseFloat(formData.quantity),
                    total_cost: totalCost,
                    unit_cost: unitCost,
                    vendor: formData.vendor.trim() || undefined,
                    notes: formData.notes.trim() || undefined,
                    bank_account: formData.bank_account ? Number(formData.bank_account) : null,
                };

                await updatePurchase({ id: purchase.id, data: updateData });
            } else {
                const createData: CreatePurchaseData = {
                    ingredient: parseInt(formData.ingredient),
                    quantity: parseFloat(formData.quantity),
                    total_cost: totalCost,
                    unit_cost: unitCost,
                    vendor: formData.vendor.trim() || undefined,
                    notes: formData.notes.trim() || undefined,
                    bank_account: formData.bank_account ? Number(formData.bank_account) : null,
                };

                await createPurchase(createData);
            }

            if (formData.vendor.trim()) {
                saveRecentVendor(formData.vendor.trim());
            }

            onClose();
        } catch {
            // Error handling is done in the hook
        }
    };

    const selectedIngredient = useMemo(
        () => ingredients.find((ing) => ing.id.toString() === formData.ingredient),
        [ingredients, formData.ingredient]
    );

    return (
        <>
            <ModalHeader className="flex flex-col gap-1">
                {isEdit ? "Edit Purchase Record" : "Record New Purchase"}
                {selectedIngredient && (
                    <p className="text-sm font-normal text-slate-500">
                        Purchasing {selectedIngredient.name}
                    </p>
                )}
            </ModalHeader>
            <ModalBody className="space-y-4">
                <Select
                    label="Ingredient"
                    placeholder="Select an ingredient"
                    selectedKeys={ingredientSelectedKeys}
                    onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        if (selected) {
                            handleInputChange("ingredient", selected);
                        }
                    }}
                    isRequired
                    isInvalid={!!errors.ingredient}
                    errorMessage={errors.ingredient}
                    isDisabled={isEdit || !!preselectedIngredient}
                    classNames={{
                        trigger: "!w-full !text-left",
                        label: "!w-full !text-left",
                        base: "!w-full !text-left",
                        value: "!text-slate-900 dark:!text-slate-100",
                    }}
                >
                    {ingredientItems.map((item) => (
                        <SelectItem key={item.key} textValue={item.label}>
                            {item.label}
                        </SelectItem>
                    ))}
                </Select>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Quantity"
                        type="number"
                        placeholder="0.000"
                        value={formData.quantity}
                        onValueChange={(v) => handleInputChange("quantity", v)}
                        isRequired
                        isInvalid={!!errors.quantity}
                        errorMessage={errors.quantity}
                        endContent={
                            <span className="text-xs text-slate-500">
                                {selectedIngredient?.unit || ""}
                            </span>
                        }
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />

                    <RadioGroup
                        label="Cost Input Mode"
                        orientation="horizontal"
                        value={costInputMode}
                        onValueChange={(v) => setCostInputMode(v as CostInputMode)}
                        classNames={{
                            label: "text-xs",
                        }}
                    >
                        <Radio value="total">Total Cost</Radio>
                        <Radio value="unit">Unit Cost</Radio>
                    </RadioGroup>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Total Cost"
                        type="number"
                        placeholder="0.00"
                        value={
                            costInputMode === "total"
                                ? formData.total_cost
                                : calculateTotalCost().toFixed(2)
                        }
                        onValueChange={(v) => handleInputChange("total_cost", v)}
                        isDisabled={costInputMode === "unit"}
                        isRequired={costInputMode === "total"}
                        isInvalid={!!errors.total_cost}
                        errorMessage={errors.total_cost}
                        startContent={<span className="text-xs text-slate-500">ETB</span>}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />

                    <Input
                        label="Unit Cost"
                        type="number"
                        placeholder="0.00"
                        value={
                            costInputMode === "unit"
                                ? formData.unit_cost
                                : calculateUnitCost().toFixed(2)
                        }
                        onValueChange={(v) => handleInputChange("unit_cost", v)}
                        isDisabled={costInputMode === "total"}
                        isRequired={costInputMode === "unit"}
                        startContent={<span className="text-xs text-slate-500">ETB</span>}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                </div>

                <Select
                    label="Deduct From Bank (Optional)"
                    placeholder="Don't deduct from bank"
                    selectedKeys={bankSelectedKeys}
                    onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string | undefined;
                        handleInputChange("bank_account", selected || "");
                    }}
                    isLoading={isLoadingBankAccounts}
                    classNames={{
                        trigger: "!w-full !text-left",
                        label: "!w-full !text-left",
                        base: "!w-full !text-left",
                        value: "!text-slate-900 dark:!text-slate-100",
                    }}
                >
                    {bankAccounts.map((account) => (
                        <SelectItem key={account.id.toString()} textValue={account.name}>
                            {account.name}
                        </SelectItem>
                    ))}
                </Select>

                {selectedIngredient &&
                    selectedIngredient.reorder_point > selectedIngredient.current_stock && (
                        <Alert
                            color="warning"
                            title="Low Stock Warning"
                            icon={<AlertTriangle className="h-4 w-4" />}
                        >
                            Current stock ({selectedIngredient.current_stock}{" "}
                            {selectedIngredient.unit}) is below reorder point (
                            {selectedIngredient.reorder_point} {selectedIngredient.unit}).
                        </Alert>
                    )}

                <div className="space-y-2">
                    <Input
                        label="Vendor"
                        placeholder="Enter vendor name"
                        value={formData.vendor}
                        onValueChange={(v) => handleInputChange("vendor", v)}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />

                    {recentVendors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-xs text-slate-500 self-center">Recent:</span>
                            {recentVendors.map((vendor) => (
                                <Chip
                                    key={vendor}
                                    size="sm"
                                    variant="flat"
                                    onPress={() => handleSelectRecentVendor(vendor)}
                                    onClose={() => handleRemoveRecentVendor(vendor)}
                                    className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                                    endContent={<X className="h-3 w-3" />}
                                >
                                    {vendor}
                                </Chip>
                            ))}
                        </div>
                    )}
                </div>

                <Textarea
                    label="Notes"
                    placeholder="Any additional details..."
                    value={formData.notes}
                    onValueChange={(v) => handleInputChange("notes", v)}
                    classNames={{
                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                    }}
                />
            </ModalBody>
            <ModalFooter>
                <Button variant="flat" onPress={onClose} isDisabled={isLoading}>
                    Cancel
                </Button>
                <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
                    {isEdit ? "Update Record" : "Record Purchase"}
                </Button>
            </ModalFooter>
        </>
    );
}

// --- Main Modal Component ---
export function PurchaseFormModal({
    isOpen,
    onClose,
    purchase,
    preselectedIngredient,
}: PurchaseFormModalProps) {
    // We generate a key based on the 'mode' (create vs edit) and the IDs involved.
    // This forces React to destroy and recreate PurchaseFormContent when the modal opens
    // for a different task, resetting all internal state automatically.
    const formKey = purchase
        ? `edit-${purchase.id}`
        : `create-${preselectedIngredient?.id ?? "new"}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalContent>
                {(onCloseModal) => (
                    <PurchaseFormContent
                        key={formKey}
                        purchase={purchase}
                        preselectedIngredient={preselectedIngredient}
                        onClose={onCloseModal}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
