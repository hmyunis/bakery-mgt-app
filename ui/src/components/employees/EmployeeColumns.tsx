import { type ColumnDef } from "@tanstack/react-table";
import { Button, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import { Edit, MoreVertical, Trash2, Link2, Unlink2 } from "lucide-react";
import type { Employee } from "../../types/employee";

export const getEmployeeColumns = ({
    onEdit,
    onDelete,
}: {
    onEdit: (employee: Employee) => void;
    onDelete: (employee: Employee) => void;
}): ColumnDef<Employee>[] => [
    {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.index + 1}</span>,
        size: 50,
    },
    {
        accessorKey: "fullName",
        header: "Employee",
        cell: ({ row }) => {
            const e = row.original;
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{e.fullName || "-"}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        {e.phoneNumber || "-"}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "position",
        header: "Position",
        cell: ({ row }) => <span className="text-sm">{row.original.position || "-"}</span>,
    },
    {
        id: "linked",
        header: "Account",
        cell: ({ row }) => {
            const linked = !!row.original.userId;
            return (
                <Chip
                    size="sm"
                    variant="flat"
                    color={linked ? "success" : "default"}
                    startContent={
                        linked ? <Link2 className="h-3 w-3" /> : <Unlink2 className="h-3 w-3" />
                    }
                >
                    {linked ? "Linked" : "Manual"}
                </Chip>
            );
        },
    },
    {
        accessorKey: "monthlyBaseSalary",
        header: "Base Salary",
        cell: ({ row }) => <span className="text-sm">{row.original.monthlyBaseSalary}</span>,
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const employee = row.original;
            return (
                <div className="relative flex justify-end items-center">
                    <Dropdown>
                        <DropdownTrigger as={Button} variant="light">
                            <MoreVertical className="h-5 w-5" />
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Employee Actions">
                            <DropdownItem key="edit" onAction={() => onEdit(employee)}>
                                <div className="flex items-center gap-2">
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit Employee
                                </div>
                            </DropdownItem>
                            <DropdownItem
                                key="delete"
                                className="text-danger"
                                color="danger"
                                onAction={() => onDelete(employee)}
                            >
                                <div className="flex items-center gap-2">
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete Employee
                                </div>
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </div>
            );
        },
    },
];
