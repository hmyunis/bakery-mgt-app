import { tr } from "../../locales";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import type { ShiftAssignment } from "../../types/shiftAssignment";

interface DeleteShiftAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    assignment: ShiftAssignment | null;
    isLoading?: boolean;
}

export function DeleteShiftAssignmentModal({
    isOpen,
    onClose,
    onConfirm,
    assignment,
    isLoading = false,
}: DeleteShiftAssignmentModalProps) {
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
                        <span>{tr("Delete Shift Assignment")}</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <p className="text-[var(--muted)]">
                        {tr("Are you sure you want to delete this assignment for")}{" "}
                        <span className="font-semibold text-[var(--fg)]">
                            {assignment?.employeeName}
                        </span>
                        {tr("? This action cannot be undone.")}
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={onClose} isDisabled={isLoading}>
                        {tr("Cancel")}
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
