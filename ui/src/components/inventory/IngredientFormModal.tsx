import { useState } from "react";
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
import type {
    Ingredient,
    CreateIngredientData,
    UpdateIngredientData,
    Unit,
} from "../../types/inventory";
import { useCreateIngredient, useUpdateIngredient } from "../../hooks/useInventory";

interface IngredientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    ingredient?: Ingredient | null;
    isLoading?: boolean;
}

const UNITS: Unit[] = ["kg", "g", "l", "ml", "pcs"];

// Internal component that handles the actual form logic and state.
// This component mounts when the modal opens, ensuring fresh state without useEffect.
function IngredientFormContent({
    ingredient,
    onClose,
    externalLoading,
}: {
    ingredient?: Ingredient | null;
    onClose: () => void;
    externalLoading: boolean;
}) {
    const isEdit = !!ingredient;

    // Initialize state directly from props.
    // Since this component is conditionally rendered or keyed, this runs fresh every time.
    const [formData, setFormData] = useState({
        name: ingredient?.name || "",
        unit: ingredient?.unit || ("kg" as Unit),
        reorder_point: ingredient?.reorder_point?.toString() || "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const { mutateAsync: createIngredient, isPending: isCreating } = useCreateIngredient();
    const { mutateAsync: updateIngredient, isPending: isUpdating } = useUpdateIngredient();

    const isLoading = externalLoading || isCreating || isUpdating;

    const handleInputChange = (field: string, value: string | boolean) => {
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
        } catch {
            // Error handling is managed by the hook/query client
        }
    };

    return (
        <>
            <ModalHeader>{isEdit ? "Edit Ingredient" : "Create New Ingredient"}</ModalHeader>
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
                    onPress={onClose}
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
    );
}

export function IngredientFormModal({
    isOpen,
    onClose,
    ingredient,
    isLoading = false,
}: IngredientFormModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} placement="top-center">
            <ModalContent>
                {(onCloseModal) => (
                    /* 
                       Using a key ensures React remounts the component when:
                       1. We switch from 'create' to 'edit' (or vice versa).
                       2. We switch between different ingredients.
                       This automatically resets the state inside IngredientFormContent.
                    */
                    <IngredientFormContent
                        key={ingredient ? ingredient.id : "new-ingredient"}
                        ingredient={ingredient}
                        onClose={onCloseModal}
                        externalLoading={isLoading}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
