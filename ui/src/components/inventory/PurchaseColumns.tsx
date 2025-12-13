import { type ColumnDef } from "@tanstack/react-table";
import type { Purchase } from "../../types/inventory";
import { Button, Chip, Tooltip } from "@heroui/react";
import { Edit, Trash2, AlertTriangle } from "lucide-react";

// Helper function to format date
const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
};

export const getPurchaseColumns = ({
    onEdit,
    onDelete,
}: {
    onEdit?: (purchase: Purchase) => void;
    onDelete?: (purchase: Purchase) => void;
}): ColumnDef<Purchase>[] => [
    {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.index + 1}</span>,
        size: 50,
    },
    {
        accessorKey: "ingredient_name",
        header: "Ingredient",
        cell: ({ row }) => (
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {row.original.ingredient_name || `Ingredient #${row.original.ingredient}`}
            </span>
        ),
    },
    {
        accessorKey: "quantity",
        header: "Quantity",
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">
                {row.original.quantity.toFixed(3)}
            </span>
        ),
    },
    {
        accessorKey: "total_cost",
        header: "Total Cost",
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">
                {row.original.total_cost.toFixed(2)} ETB
            </span>
        ),
    },
    {
        accessorKey: "unit_cost",
        header: "Unit Cost",
        cell: ({ row }) => {
            const purchase = row.original;
            return (
                <div className="flex items-center gap-2">
                    {purchase.is_price_anomaly && (
                        <Tooltip content="Price anomaly detected (>30% above average)">
                            <AlertTriangle className="h-4 w-4 text-warning-500 flex-shrink-0" />
                        </Tooltip>
                    )}
                    <span
                        className={
                            purchase.is_price_anomaly
                                ? "text-warning-600 dark:text-warning-400 font-medium"
                                : "text-zinc-900 dark:text-zinc-100"
                        }
                    >
                        {purchase.unit_cost.toFixed(2)} ETB
                    </span>
                    {purchase.is_price_anomaly && (
                        <Chip color="warning" variant="flat" size="sm">
                            Anomaly
                        </Chip>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "vendor",
        header: "Vendor",
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">{row.original.vendor || "-"}</span>
        ),
    },
    {
        accessorKey: "purchaser_name",
        header: "Purchaser",
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">
                {row.original.purchaser_name || "-"}
            </span>
        ),
    },
    {
        accessorKey: "purchase_date",
        header: "Date",
        cell: ({ row }) => (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatDateTime(row.original.purchase_date)}
            </span>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const purchase = row.original;
            return (
                <div className="flex items-center gap-2 p-2">
                    {onEdit && (
                        <Tooltip content="Edit Purchase" placement="top">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                color="primary"
                                className="min-w-8 w-8 h-8 p-2"
                                onPress={() => onEdit(purchase)}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    )}
                    {onDelete && (
                        <Tooltip content="Delete Purchase" placement="top">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                color="danger"
                                className="min-w-8 w-8 h-8 p-2"
                                onPress={() => onDelete(purchase)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    )}
                </div>
            );
        },
    },
];
