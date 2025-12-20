import { type ColumnDef } from "@tanstack/react-table";
import type { PaymentMethod } from "../../types/payment";
import { Button, Chip, Switch, Tooltip } from "@heroui/react";
import { Edit, Trash2 } from "lucide-react";

export const getPaymentMethodColumns = ({
    onEdit,
    onDelete,
    onToggleActive,
}: {
    onEdit?: (paymentMethod: PaymentMethod) => void;
    onDelete?: (paymentMethod: PaymentMethod) => void;
    onToggleActive?: (paymentMethod: PaymentMethod) => void;
}): ColumnDef<PaymentMethod>[] => [
    {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.index + 1}</span>,
        size: 50,
    },
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {row.original.name}
            </span>
        ),
    },
    {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
            const paymentMethod = row.original;
            return (
                <div className="flex items-center gap-2">
                    <Switch
                        isSelected={paymentMethod.is_active}
                        onValueChange={() => onToggleActive?.(paymentMethod)}
                        size="sm"
                        color="success"
                    />
                    <Chip
                        color={paymentMethod.is_active ? "success" : "default"}
                        variant="flat"
                        size="sm"
                    >
                        {paymentMethod.is_active ? "Active" : "Inactive"}
                    </Chip>
                </div>
            );
        },
    },
    {
        accessorKey: "config_details",
        header: "Config Details",
        cell: ({ row }) => (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {row.original.config_details || "-"}
            </span>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const paymentMethod = row.original;
            return (
                <div className="relative flex items-center gap-2 p-2">
                    <Tooltip content="Edit payment method">
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={() => onEdit?.(paymentMethod)}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                    <Tooltip content="Delete payment method" color="danger">
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            color="danger"
                            onPress={() => onDelete?.(paymentMethod)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                </div>
            );
        },
    },
];
