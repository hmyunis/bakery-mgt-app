import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import type { Ingredient } from "../../types/inventory";

interface DeleteIngredientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    ingredient: Ingredient | null;
    isLoading?: boolean;
}

export function DeleteIngredientModal({
    isOpen,
    onClose,
    onConfirm,
    ingredient,
    isLoading = false,
}: DeleteIngredientModalProps) {
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
                        <span>Delete Ingredient</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Are you sure you want to delete the ingredient{" "}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {ingredient?.name || "Unknown"}
                        </span>
                        ? This action cannot be undone.
                    </p>
                    {ingredient && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-500">
                            Current Stock: {ingredient.current_stock.toFixed(3)} {ingredient.unit}
                        </p>
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

