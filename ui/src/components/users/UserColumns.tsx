import { type ColumnDef } from "@tanstack/react-table";
import type { User } from "../../services/userService";
import {
    Avatar,
    Button,
    Chip,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownTrigger,
    Tooltip,
} from "@heroui/react";
import { MoreVertical, Edit, Trash2, Info } from "lucide-react";
import { getRoleColor } from "../../constants/roles";

// Helper function to format date with time
const formatDateTime = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const getUserColumns = ({
    onEdit,
    onDelete,
}: {
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
}): ColumnDef<User>[] => [
    {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.index + 1}</span>,
        size: 50,
    },
    {
        accessorKey: "fullName",
        header: "User",
        cell: ({ row }) => {
            const user = row.original;
            return (
                <div className="flex items-center gap-3">
                    <div className="w-10">
                        <Avatar
                            src={user.avatar}
                            fallback={
                                user.fullName
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("") ||
                                user.username?.[0] ||
                                "U"
                            }
                            className="h-10 w-10"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium">{user.fullName || user.username}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {user.phoneNumber || "-"}
                        </span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
            const role = row.original.role;
            return (
                <Chip color={getRoleColor(role)} variant="flat" size="sm" className="capitalize">
                    {role}
                </Chip>
            );
        },
    },
    {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
            const isActive = row.original.isActive;
            return (
                <div className="flex items-center gap-2">
                    <Chip color={isActive ? "success" : "warning"} variant="flat" size="sm">
                        {isActive ? "Active" : "Inactive"}
                    </Chip>
                    {!isActive && (
                        <Tooltip content="This user cannot log in until active" placement="top">
                            <Info className="h-4 w-4 text-warning" />
                        </Tooltip>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "lastLogin",
        header: "Last Login",
        cell: ({ row }) => (
            <span className="text-sm min-w-28 inline-block">
                {formatDateTime(row.original.lastLogin)}
            </span>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const user = row.original;
            return (
                <div className="relative flex justify-end items-center">
                    <Dropdown>
                        <DropdownTrigger as={Button} isIconOnly variant="light">
                            <MoreVertical className="h-5 w-5" />
                        </DropdownTrigger>
                        <DropdownMenu aria-label="User Actions">
                            <DropdownItem key="edit" onAction={() => onEdit(user)}>
                                <div className="flex items-center gap-2">
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit User
                                </div>
                            </DropdownItem>
                            <DropdownItem
                                key="delete"
                                className="text-danger"
                                color="danger"
                                onAction={() => onDelete(user)}
                            >
                                <div className="flex items-center gap-2">
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete User
                                </div>
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </div>
            );
        },
    },
];
