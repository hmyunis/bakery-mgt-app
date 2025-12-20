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

// Internal component to handle form state and submission
// This component mounts freshly whenever the modal opens (due to the key prop in parent)
function PaymentMethodFormContent({
    paymentMethod,
    onClose,
}: {
    paymentMethod?: PaymentMethod | null;
    onClose: () => void;
}) {
    const isEdit = !!paymentMethod;

    // Initialize state directly from props
    const [formData, setFormData] = useState({
        name: paymentMethod?.name || "",
        is_active: paymentMethod?.is_active ?? true,
        config_details: paymentMethod?.config_details || "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const { mutateAsync: createPaymentMethod, isPending: isCreating } = useCreatePaymentMethod();
    const { mutateAsync: updatePaymentMethod, isPending: isUpdating } = useUpdatePaymentMethod();

    const isLoading = isCreating || isUpdating;

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
        } catch {
            // Error handling is done in the hook
        }
    };

    return (
        <>
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
        </>
    );
}

export function PaymentMethodFormModal({
    isOpen,
    onClose,
    paymentMethod,
}: PaymentMethodFormModalProps) {
    // Generate a unique key based on the mode (create vs edit) and ID.
    // This forces React to unmount the old form and mount a new one with fresh state
    // whenever the modal opens or the selected payment method changes.
    const formKey = paymentMethod ? `edit-${paymentMethod.id}` : "create-new";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalContent>
                {(onCloseModal) => (
                    <PaymentMethodFormContent
                        key={formKey}
                        paymentMethod={paymentMethod}
                        onClose={onCloseModal}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
