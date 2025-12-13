import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import { type User } from "../../services/userService";

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: User | null;
  isLoading?: boolean;
}

export function DeleteUserModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoading = false,
}: DeleteUserModalProps) {
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
            <span>Delete User</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-[var(--muted)]">
            Are you sure you want to delete the user{" "}
            <span className="font-semibold text-[var(--fg)]">
              {user?.username || "Unknown"}
            </span>
            ? This action cannot be undone.
          </p>
          {user?.fullName ? (
            <p className="text-sm text-[var(--muted)]">
              Name: {user.fullName}
            </p>
          ) : null}
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

