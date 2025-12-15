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
} from "@heroui/react";
import type { Ingredient, CreateIngredientData, UpdateIngredientData, Unit } from "../../types/inventory";
import {
    useCreateIngredient,
    useUpdateIngredient,
} from "../../hooks/useInventory";

interface IngredientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    ingredient?: Ingredient | null;
    isLoading?: boolean;
}

const UNITS: Unit[] = ["kg", "g", "l", "ml", "pcs"];

export function IngredientFormModal({
    isOpen,
    onClose,
    ingredient,
    isLoading: externalLoading = false,
}: IngredientFormModalProps) {
    const isEdit = !!ingredient;

    const [formData, setFormData] = useState({
        name: "",
        unit: "kg" as Unit,
        reorder_point: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const { mutateAsync: createIngredient, isPending: isCreating } = useCreateIngredient();
    const { mutateAsync: updateIngredient, isPending: isUpdating } = useUpdateIngredient();

    const isLoading = externalLoading || isCreating || isUpdating;

    // Reset form when modal opens/closes or ingredient changes
    useEffect(() => {
        if (isOpen) {
            if (ingredient) {
                setFormData({
                    name: ingredient.name || "",
                    unit: ingredient.unit || "kg",
                    reorder_point: ingredient.reorder_point?.toString() || "",
                });
            } else {
                setFormData({
                    name: "",
                    unit: "kg",
                    reorder_point: "",
                });
            }
            setErrors({});
        }
    }, [isOpen, ingredient]);

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field
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

        if (!formData.name.trim()) {
            newErrors.name = "Name is required";
        }

        if (!formData.reorder_point || parseFloat(formData.reorder_point) < 0) {
            newErrors.reorder_point = "Reorder point must be 0 or greater";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            if (isEdit && ingredient) {
                const updateData: UpdateIngredientData = {
                    name: formData.name.trim(),
                    unit: formData.unit,
                    reorder_point: parseFloat(formData.reorder_point),
                };

                await updateIngredient({ id: ingredient.id, data: updateData });
            } else {
                const createData: CreateIngredientData = {
                    name: formData.name.trim(),
                    unit: formData.unit,
                    reorder_point: parseFloat(formData.reorder_point),
                };

                await createIngredient(createData);
            }
            onClose();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" backdrop="blur">
            <ModalContent className="max-h-screen overflow-y-auto">
                {(onCloseModal) => (
                    <>
                        <ModalHeader>
                            {isEdit ? "Edit Ingredient" : "Create New Ingredient"}
                        </ModalHeader>
                        <ModalBody className="space-y-4">
                            <Input
                                label="Name"
                                value={formData.name}
                                onValueChange={(v) => handleInputChange("name", v)}
                                isRequired
                                isInvalid={!!errors.name}
                                errorMessage={errors.name}
                                classNames={{
                                    input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                }}
                            />

                            <Select
                                label="Unit"
                                selectionMode="single"
                                selectedKeys={new Set([formData.unit])}
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0] as Unit;
                                    if (selected) {
                                        handleInputChange("unit", selected);
                                    }
                                }}
                                isRequired
                                classNames={{
                                    trigger: "!w-full !text-left",
                                    label: "!w-full !text-left",
                                    base: "!w-full !text-left",
                                    value: "!text-slate-900 dark:!text-slate-100",
                                }}
                            >
                                {UNITS.map((unit) => (
                                    <SelectItem key={unit}>
                                        {unit === "kg"
                                            ? "Kilogram (kg)"
                                            : unit === "g"
                                            ? "Gram (g)"
                                            : unit === "l"
                                            ? "Liter (l)"
                                            : unit === "ml"
                                            ? "Milliliter (ml)"
                                            : "Pieces (pcs)"}
                                    </SelectItem>
                                ))}
                            </Select>

                            <Input
                                label="Reorder Point"
                                type="number"
                                value={formData.reorder_point}
                                onValueChange={(v) => handleInputChange("reorder_point", v)}
                                isRequired
                                placeholder="0.000"
                                step="0.001"
                                min="0"
                                isInvalid={!!errors.reorder_point}
                                errorMessage={errors.reorder_point}
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
                                {isEdit ? "Save Changes" : "Create Ingredient"}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}

