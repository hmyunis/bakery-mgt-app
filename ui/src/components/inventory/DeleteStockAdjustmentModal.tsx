import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import type { StockAdjustment } from "../../types/inventory";

interface DeleteStockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    adjustment: StockAdjustment | null;
    isLoading?: boolean;
}

export function DeleteStockAdjustmentModal({
    isOpen,
    onClose,
    onConfirm,
    adjustment,
    isLoading = false,
}: DeleteStockAdjustmentModalProps) {
    const handleConfirm = async () => {
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-danger" />
                        <span>Delete Stock Adjustment</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Are you sure you want to delete this stock adjustment for{" "}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {adjustment?.ingredient_name || "Unknown"}
                        </span>
                        ? This action cannot be undone and will revert the stock change.
                    </p>
                    {adjustment && (
                        <div className="text-sm text-zinc-500 dark:text-zinc-500 space-y-1">
                            <p>
                                Quantity Change:{" "}
                                {adjustment.quantity_change > 0 ? "+" : ""}
                                {adjustment.quantity_change.toFixed(3)}
                            </p>
                            <p>Reason: {adjustment.reason}</p>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="flat"
                        onPress={onClose}
                        isDisabled={isLoading}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        Cancel
                    </Button>
                    <Button
                        color="danger"
                        onPress={handleConfirm}
                        isLoading={isLoading}
                        isDisabled={isLoading}
                    >
                        Delete
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

