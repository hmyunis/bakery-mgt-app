import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import type { ShiftTemplate } from "../../types/shift";

interface DeleteShiftTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    shift: ShiftTemplate | null;
    isLoading?: boolean;
}

export function DeleteShiftTemplateModal({
    isOpen,
    onClose,
    onConfirm,
    shift,
    isLoading = false,
}: DeleteShiftTemplateModalProps) {
    const handleConfirm = async () => {
        try {
            await onConfirm();
            onClose();
        } catch {
            // Error handling is done in the hook
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-danger" />
                        <span>Delete Shift Template</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <p className="text-[var(--muted)]">
                        Are you sure you want to delete the shift template{" "}
                        <span className="font-semibold text-[var(--fg)]">{shift?.name}</span>? This
                        action cannot be undone.
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={onClose} isDisabled={isLoading}>
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
