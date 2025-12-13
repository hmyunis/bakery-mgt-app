import React from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Avatar,
    Chip,
} from "@heroui/react";
import { Edit, Trash2 } from "lucide-react";
import type { User } from "../../services/userService";
import { getRoleColor } from "../../constants/roles";

interface UserDetailModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
    user,
    isOpen,
    onClose,
    onEdit,
    onDelete,
}) => {
    if (!user) return null;

    const fallbackInitials =
        user.fullName
            ?.split(" ")
            .map((n) => n[0])
            .join("") ||
        user.username?.[0] ||
        "U";

    return (
        <Modal isOpen={isOpen} onOpenChange={onClose} size="xl">
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader>User Details</ModalHeader>
                        <ModalBody>
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="flex flex-col items-center pt-2">
                                    <Avatar
                                        src={user.avatar}
                                        fallback={fallbackInitials}
                                        className="w-24 h-24 text-4xl"
                                    />
                                    <h2 className="text-xl font-semibold mt-4">
                                        {user.fullName || user.username}
                                    </h2>
                                    <p className="text-sm text-slate-500">{user.email}</p>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="font-medium text-slate-500">
                                                Phone Number
                                            </p>
                                            <p className="text-slate-800 dark:text-slate-200">
                                                {user.phoneNumber || "-"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-500">Role</p>
                                            <Chip
                                                color={getRoleColor(user.role)}
                                                variant="flat"
                                                size="sm"
                                                className="capitalize"
                                            >
                                                {user.role}
                                            </Chip>
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-500">Status</p>
                                            <Chip
                                                color={user.isActive ? "success" : "warning"}
                                                variant="flat"
                                                size="sm"
                                            >
                                                {user.isActive ? "Active" : "Inactive"}
                                            </Chip>
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-500">Joined On</p>
                                            <p className="text-slate-800 dark:text-slate-200">
                                                {user.dateJoined
                                                    ? new Date(user.dateJoined).toLocaleDateString()
                                                    : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="light"
                                color="danger"
                                onPress={() => onDelete(user)}
                                startContent={<Trash2 className="h-4 w-4" />}
                            >
                                Delete
                            </Button>
                            <Button
                                color="primary"
                                onPress={() => onEdit(user)}
                                startContent={<Edit className="h-4 w-4" />}
                            >
                                Edit User
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
