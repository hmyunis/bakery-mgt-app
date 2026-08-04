import { tr } from "../../locales";
import { Button, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";
import type { LeaveRecord, LeaveType } from "../../types/leave";

function getLeaveTypeLabel(t: LeaveType): string {
    switch (t) {
        case "sick":
            return tr("Sick");
        case "annual":
            return tr("Annual");
        case "holiday":
            return tr("Holiday");
        case "other":
            return tr("Other");
        default:
            return t;
    }
}

function getLeaveTypeColor(t: LeaveType): "danger" | "primary" | "warning" | "default" {
    switch (t) {
        case "sick":
            return "danger";
        case "annual":
            return "primary";
        case "holiday":
            return "warning";
        case "other":
            return "default";
        default:
            return "default";
    }
}

export function getLeaveColumns({
    page,
    pageSize,
    onEdit,
    onDelete,
}: {
    page: number;
    pageSize: number;
    onEdit: (leave: LeaveRecord) => void;
    onDelete: (leave: LeaveRecord) => void;
}): ColumnDef<LeaveRecord>[] {
    return [
        {
            id: "rowNumber",
            header: "#",
            cell: ({ row }) => (page - 1) * pageSize + row.index + 1,
        },
        {
            accessorKey: "employeeName",
            header: tr("Employee"),
            cell: ({ row }) => <span className="font-medium">{row.original.employeeName}</span>,
        },
        {
            accessorKey: "leaveType",
            header: tr("Type"),
            cell: ({ row }) => (
                <Chip size="sm" variant="flat" color={getLeaveTypeColor(row.original.leaveType)}>
                    {getLeaveTypeLabel(row.original.leaveType)}
                </Chip>
            ),
        },
        {
            accessorKey: "startDate",
            header: tr("Start"),
        },
        {
            accessorKey: "endDate",
            header: tr("End"),
        },
        {
            accessorKey: "dayCount",
            header: tr("Days"),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                const leave = row.original;
                return (
                    <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                            <Button isIconOnly variant="light" size="sm">
                                <MoreVertical className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label={tr("Actions")}
                            onAction={(key) => {
                                if (key === "edit") onEdit(leave);
                                if (key === "delete") onDelete(leave);
                            }}
                        >
                            <DropdownItem key="edit">{tr("Edit")}</DropdownItem>
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
