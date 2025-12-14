import { useState, useEffect } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Textarea,
    Switch,
} from "@heroui/react";
import type {
    PaymentMethod,
    CreatePaymentMethodData,
    UpdatePaymentMethodData,
} from "../../types/payment";
import { useCreatePaymentMethod, useUpdatePaymentMethod } from "../../hooks/usePayment";

interface PaymentMethodFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentMethod?: PaymentMethod | null;
}

export function PaymentMethodFormModal({
    isOpen,
    onClose,
    paymentMethod,
}: PaymentMethodFormModalProps) {
    const isEdit = !!paymentMethod;

    const [formData, setFormData] = useState({
        name: "",
        is_active: true,
        config_details: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const { mutateAsync: createPaymentMethod, isPending: isCreating } =
        useCreatePaymentMethod();
    const { mutateAsync: updatePaymentMethod, isPending: isUpdating } =
        useUpdatePaymentMethod();

    const isLoading = isCreating || isUpdating;

    // Reset form when modal opens/closes or paymentMethod changes
    useEffect(() => {
        if (isOpen) {
            if (paymentMethod) {
                setFormData({
                    name: paymentMethod.name || "",
                    is_active: paymentMethod.is_active ?? true,
                    config_details: paymentMethod.config_details || "",
                });
            } else {
                setFormData({
                    name: "",
                    is_active: true,
                    config_details: "",
                });
            }
            setErrors({});
        }
    }, [isOpen, paymentMethod]);

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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            if (isEdit && paymentMethod) {
                const updateData: UpdatePaymentMethodData = {
                    name: formData.name,
                    is_active: formData.is_active,
                    config_details: formData.config_details || undefined,
                };
                await updatePaymentMethod({ id: paymentMethod.id, data: updateData });
            } else {
                const createData: CreatePaymentMethodData = {
                    name: formData.name,
                    is_active: formData.is_active,
                    config_details: formData.config_details || undefined,
                };
                await createPaymentMethod(createData);
            }
            onClose();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    {isEdit ? "Edit Payment Method" : "Create Payment Method"}
                </ModalHeader>
                <ModalBody>
                    <Input
                        label="Name"
                        placeholder="e.g., Cash, Telebirr, CBE"
                        value={formData.name}
                        onValueChange={(value) => handleInputChange("name", value)}
                        errorMessage={errors.name}
                        isInvalid={!!errors.name}
                        isRequired
                        classNames={{
                            input: "!text-zinc-900 dark:!text-zinc-100",
                            inputWrapper: "!placeholder:text-zinc-400 dark:!placeholder:text-zinc-500",
                        }}
                    />

                    <Textarea
                        label="Config Details"
                        placeholder="e.g., Pay to 0911..."
                        value={formData.config_details}
                        onValueChange={(value) => handleInputChange("config_details", value)}
                        minRows={2}
                        classNames={{
                            input: "!text-zinc-900 dark:!text-zinc-100",
                            inputWrapper: "!placeholder:text-zinc-400 dark:!placeholder:text-zinc-500",
                        }}
                    />

                    <Switch
                        isSelected={formData.is_active}
                        onValueChange={(value) => handleInputChange("is_active", value)}
                    >
                        Active
                    </Switch>
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

