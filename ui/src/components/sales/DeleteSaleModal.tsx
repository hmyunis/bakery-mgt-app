import { tr } from "../../locales";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Button } from "@heroui/react";
import type { Sale } from "../../types/sales";
import { AlertTriangle } from "lucide-react";

interface DeleteSaleModalProps {
    isOpen: boolean;
    sale: Sale | null;
    isDeleting?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteSaleModal({
    isOpen,
    sale,
    isDeleting = false,
    onClose,
    onConfirm,
}: DeleteSaleModalProps) {
    if (!sale) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalContent>
                <ModalHeader className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-danger-600 dark:text-danger-400" />
                    <span>{tr("Delete Sale")}</span>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-3">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            {tr("This will permanently delete")}
                            <strong>
                                {tr("Sale #")}
                                {sale.id}
                            </strong>{" "}
                            {tr("and")} <strong>{tr("undo its side effects")}</strong>{" "}
                            {tr("(product stock will be restored).")}
                        </p>
                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">
                                    {tr("Total")}
                                </span>
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {tr("ETB")}
                                    {sale.total_amount.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">
                                    {tr("Items")}
                                </span>
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {sale.items.length}
                                </span>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="flat"
                        onPress={onClose}
                        isDisabled={isDeleting}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        {tr("Cancel")}
                    </Button>
                    <Button color="danger" onPress={onConfirm} isLoading={isDeleting}>
                        Delete
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
