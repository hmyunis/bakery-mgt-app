import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import type { Expense } from "../../types/treasury";

interface DeleteExpenseModalProps {
    isOpen: boolean;
    expense: Expense | null;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteExpenseModal({
    isOpen,
    expense,
    onClose,
    onConfirm,
}: DeleteExpenseModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">Delete expense?</ModalHeader>
                <ModalBody>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        This will permanently remove the expense record. This action cannot be
                        undone.
                    </p>
                    {expense ? (
                        <p className="text-sm text-slate-500">
                            {expense.title} • ETB {expense.amount.toLocaleString()}
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
