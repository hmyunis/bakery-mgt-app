import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Button } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import type { Employee } from "../../types/employee";

interface DeleteEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    employee: Employee | null;
    isLoading?: boolean;
}

export function DeleteEmployeeModal({
    isOpen,
    onClose,
    onConfirm,
    employee,
    isLoading = false,
}: DeleteEmployeeModalProps) {
    const handleConfirm = async () => {
        try {
            await onConfirm();
            onClose();
        } catch {
            // Ignore errors; the caller typically shows a toast.
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-danger" />
                        <span>Delete Employee</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <p className="text-[var(--muted)]">
                        Are you sure you want to delete the employee{" "}
                        <span className="font-semibold text-[var(--fg)]">
                            {employee?.fullName || "Unknown"}
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
