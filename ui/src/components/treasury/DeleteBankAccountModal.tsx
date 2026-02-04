import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import type { BankAccount } from "../../types/treasury";

interface DeleteBankAccountModalProps {
    isOpen: boolean;
    account:
        | {
              id: string;
              name: string;
              bankName: string;
              accountNumber: string;
          }
        | BankAccount
        | null;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteBankAccountModal({
    isOpen,
    account,
    onClose,
    onConfirm,
}: DeleteBankAccountModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">Delete bank account?</ModalHeader>
                <ModalBody>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        This will delete the selected bank account and remove its recorded
                        activities. This action cannot be undone.
                    </p>
                    {account ? (
                        <div className="text-sm text-slate-500">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                                {account.name}
                            </p>
                            <p>
                                {account.bankName} • {account.accountNumber || "—"}
                            </p>
                        </div>
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
