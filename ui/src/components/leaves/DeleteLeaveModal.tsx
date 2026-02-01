import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import type { LeaveRecord } from "../../types/leave";

interface DeleteLeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    leave: LeaveRecord | null;
    isLoading?: boolean;
}

export function DeleteLeaveModal({
    isOpen,
    onClose,
    onConfirm,
    leave,
    isLoading = false,
}: DeleteLeaveModalProps) {
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
                        <span>Delete Leave</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <p className="text-[var(--muted)]">
                        Are you sure you want to delete this leave record for{" "}
                        <span className="font-semibold text-[var(--fg)]">
                            {leave?.employeeName}
                        </span>
                        ? This action cannot be undone.
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
