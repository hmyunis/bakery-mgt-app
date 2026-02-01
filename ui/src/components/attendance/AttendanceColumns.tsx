import type { ColumnDef } from "@tanstack/react-table";
import { Button, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import { MoreVertical } from "lucide-react";
import type { AttendanceRecord } from "../../types/attendance";
import type { AttendanceStatus } from "../../types/attendance";

function getStatusChipColor(
    status: AttendanceStatus
): "success" | "warning" | "danger" | "primary" {
    switch (status) {
        case "present":
            return "success";
        case "late":
            return "warning";
        case "absent":
            return "danger";
        case "overtime":
            return "primary";
        default:
            return "primary";
    }
}

export function getAttendanceColumns(params?: {
    page?: number;
    pageSize?: number;
    onEdit?: (record: AttendanceRecord) => void;
    onDelete?: (record: AttendanceRecord) => void;
}): ColumnDef<AttendanceRecord>[] {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 10;
    const onEdit = params?.onEdit;
    const onDelete = params?.onDelete;

    return [
        {
            id: "rowNumber",
            header: "#",
            cell: ({ row }) => (page - 1) * pageSize + row.index + 1,
        },
        {
            accessorKey: "employeeName",
            header: "Employee",
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
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status;
                return (
                    <Chip
                        size="sm"
                        variant="flat"
                        color={getStatusChipColor(status)}
                        className="capitalize"
                    >
                        {status}
                    </Chip>
                );
            },
        },
        {
            accessorKey: "lateMinutes",
            header: "Late (min)",
        },
        {
            accessorKey: "overtimeMinutes",
            header: "OT (min)",
        },
        ...(onEdit || onDelete
            ? ([
                  {
                      id: "actions",
                      header: "",
                      cell: ({ row }) => {
                          const record = row.original;
                          return (
                              <div className="relative flex justify-end items-center">
                                  <Dropdown>
                                      <DropdownTrigger as={Button} variant="light">
                                          <MoreVertical className="h-5 w-5" />
                                      </DropdownTrigger>
                                      <DropdownMenu aria-label="Attendance Actions">
                                          {onEdit && (
                                              <DropdownItem
                                                  key="edit"
                                                  onAction={() => onEdit(record)}
                                              >
                                                  Edit
                                              </DropdownItem>
                                          )}
                                          {onDelete && (
                                              <DropdownItem
                                                  key="delete"
                                                  className="text-danger"
                                                  color="danger"
                                                  onAction={() => onDelete(record)}
                                              >
                                                  Delete
                                              </DropdownItem>
                                          )}
                                      </DropdownMenu>
                                  </Dropdown>
                              </div>
                          );
                      },
                  },
              ] as ColumnDef<AttendanceRecord>[])
            : []),
    ];
}
