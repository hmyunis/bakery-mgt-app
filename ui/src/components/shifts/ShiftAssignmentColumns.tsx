import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";
import type { ShiftAssignment } from "../../types/shiftAssignment";

export function getShiftAssignmentColumns({
    page,
    pageSize,
    onEdit,
    onDelete,
}: {
    page: number;
    pageSize: number;
    onEdit: (assignment: ShiftAssignment) => void;
    onDelete: (assignment: ShiftAssignment) => void;
}): ColumnDef<ShiftAssignment>[] {
    return [
        {
            id: "rowNumber",
            header: "#",
            cell: ({ row }) => (page - 1) * pageSize + row.index + 1,
        },
        {
            accessorKey: "employeeName",
            header: "Employee",
            cell: ({ row }) => <span className="font-medium">{row.original.employeeName}</span>,
        },
        {
            accessorKey: "shiftName",
            header: "Shift",
        },
        {
            accessorKey: "shiftDate",
            header: "Date",
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                const assignment = row.original;
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
                                if (key === "edit") onEdit(assignment);
                                if (key === "delete") onDelete(assignment);
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
