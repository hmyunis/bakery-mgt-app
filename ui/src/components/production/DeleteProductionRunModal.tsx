import { tr } from "../../locales";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Alert,
} from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import type { ProductionRun } from "../../types/production";

interface DeleteProductionRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    productionRun: ProductionRun | null;
    isLoading?: boolean;
}

export function DeleteProductionRunModal({
    isOpen,
    onClose,
    onConfirm,
    productionRun,
    isLoading = false,
}: DeleteProductionRunModalProps) {
    const handleConfirm = async () => {
        try {
            await onConfirm();
            onClose();
        } catch {
            // Error handling is done in the hook
        }
    };

    if (!productionRun) return null;

    const productName = productionRun.product_name || productionRun.composite_name || "Unknown";
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-danger" />
                        <span>{tr("Delete Production Run")}</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <Alert color="warning" variant="flat" className="mb-4">
                        <p className="text-sm">
                            {tr("This will undo all side effects from this production run:")}
                        </p>
                        <ul className="list-disc list-inside mt-2 text-xs space-y-1">
                            <li>
                                {tr("Decrease product stock by")}{" "}
                                {productionRun.quantity_produced.toFixed(2)} {tr("pcs")}
                            </li>
                            <li>{tr("Restore the actual usage to the kitchen store")}</li>
                            <li>{tr("Remove all usage records")}</li>
                        </ul>
                    </Alert>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        {tr("Are you sure you want to delete this production run for")}{" "}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {productName}
                        </span>
                        {tr("? This action cannot be undone.")}
                    </p>
                    {productionRun && (
                        <div className="text-sm text-zinc-500 dark:text-zinc-500 space-y-1 mt-4">
                            <p>
                                {tr("Quantity Produced:")}
                                {productionRun.quantity_produced.toFixed(2)} {tr("pcs")}
                            </p>
                            <p>
                                {tr("Date:")}
                                {new Date(productionRun.date_produced).toLocaleString()}
                            </p>
                            <p>
                                {tr("Chef:")}
                                {productionRun.chef_name || "-"}
                            </p>
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
                        {tr("Cancel")}
                    </Button>
                    <Button
                        color="danger"
                        onPress={handleConfirm}
                        isLoading={isLoading}
                        isDisabled={isLoading}
                    >
                        {tr("Delete Production Run")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
