import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";

interface DeleteTransactionModalProps {
    isOpen: boolean;
    transaction: { id: number; type: "deposit" | "withdrawal"; amount: number } | null;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteTransactionModal({
    isOpen,
    transaction,
    onClose,
    onConfirm,
}: DeleteTransactionModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">Delete activity?</ModalHeader>
                <ModalBody>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        This will remove the{" "}
                        <span className="font-semibold">
                            {transaction?.type === "deposit" ? "deposit" : "withdrawal"}
                        </span>{" "}
                        activity. This action cannot be undone.
                    </p>
                    {transaction ? (
                        <p className="text-sm text-slate-500">
                            Amount: ETB {transaction.amount.toLocaleString()}
                        </p>
                    ) : null}
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                        Cancel
                    </Button>
                    <Button color="danger" onPress={onConfirm}>
                        Delete
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
