import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import type { PaymentMethod } from "../../types/payment";
import { useDeletePaymentMethod } from "../../hooks/usePayment";

interface DeletePaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentMethod: PaymentMethod | null;
}

export function DeletePaymentMethodModal({
    isOpen,
    onClose,
    paymentMethod,
}: DeletePaymentMethodModalProps) {
    const { mutateAsync: deletePaymentMethod, isPending: isDeleting } = useDeletePaymentMethod();

    const handleDelete = async () => {
        if (!paymentMethod) return;

        try {
            await deletePaymentMethod(paymentMethod.id);
            onClose();
        } catch {
            // Error handling is done in the hook
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">Delete Payment Method</ModalHeader>
                <ModalBody>
                    <p>
                        Are you sure you want to delete <strong>{paymentMethod?.name}</strong>? This
                        action cannot be undone.
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="light"
                        onPress={onClose}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        Cancel
                    </Button>
                    <Button color="danger" onPress={handleDelete} isLoading={isDeleting}>
                        Delete
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
