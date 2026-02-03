import { Button, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";
import type { ShiftTemplate } from "../../types/shift";

export function getShiftTemplateColumns({
    page,
    pageSize,
    onEdit,
    onDelete,
}: {
    page?: number;
    pageSize?: number;
    onEdit: (shift: ShiftTemplate) => void;
    onDelete: (shift: ShiftTemplate) => void;
}): ColumnDef<ShiftTemplate>[] {
    return [
        {
            id: "rowNumber",
            header: "#",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {((page ?? 1) - 1) * (pageSize ?? 10) + row.index + 1}
                </span>
            ),
            size: 60,
        },
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: "startTime",
            header: "Start",
        },
        {
            accessorKey: "endTime",
            header: "End",
        },
        {
            accessorKey: "isActive",
            header: "Status",
            cell: ({ row }) => (
                <Chip
                    size="sm"
                    variant="flat"
                    color={row.original.isActive ? "success" : "default"}
                >
                    {row.original.isActive ? "Active" : "Inactive"}
                </Chip>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                const shift = row.original;
                return (
                    <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                            <Button isIconOnly variant="light" size="sm">
                                <MoreVertical className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="Actions"
                            onAction={(key) => {
                                if (key === "edit") onEdit(shift);
                                if (key === "delete") onDelete(shift);
                            }}
                        >
                            <DropdownItem key="edit">Edit</DropdownItem>
                            <DropdownItem key="delete" className="text-danger" color="danger">
                                Delete
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                );
            },
        },
    ];
}
