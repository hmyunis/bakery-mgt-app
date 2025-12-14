import { type ColumnDef } from "@tanstack/react-table";
import type { StockAdjustment } from "../../types/inventory";
import { Button, Chip, Tooltip } from "@heroui/react";
import { Trash2, Plus, Minus } from "lucide-react";

// Helper function to format date
const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
};

// Helper function to get reason label
const getReasonLabel = (reason: string): string => {
    const labels: Record<string, string> = {
        waste: "Accidental Waste",
        theft: "Theft/Loss",
        audit: "Audit Correction",
        return: "Return to Vendor",
        packaging_usage: "Packaging Usage",
    };
    return labels[reason] || reason;
};

export const getStockAdjustmentColumns = ({
    onDelete,
}: {
    onDelete?: (adjustment: StockAdjustment) => void;
}): ColumnDef<StockAdjustment>[] => [
    {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">{row.index + 1}</span>
        ),
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
        accessorKey: "quantity_change",
        header: "Quantity Change",
        cell: ({ row }) => {
            const adjustment = row.original;
            const isAdd = adjustment.quantity_change > 0;
            const absValue = Math.abs(adjustment.quantity_change);

            return (
                <div className="flex items-center gap-2">
                    {isAdd ? (
                        <Plus className="h-4 w-4 text-success-500 flex-shrink-0" />
                    ) : (
                        <Minus className="h-4 w-4 text-danger-500 flex-shrink-0" />
                    )}
                    <span
                        className={
                            isAdd
                                ? "text-success-600 dark:text-success-400 font-medium"
                                : "text-danger-600 dark:text-danger-400 font-medium"
                        }
                    >
                        {isAdd ? "+" : ""}
                        {absValue.toFixed(3)}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
            <Chip variant="flat" size="sm" color="default">
                {getReasonLabel(row.original.reason)}
            </Chip>
        ),
    },
    {
        accessorKey: "actor_name",
        header: "Recorded By",
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">
                {row.original.actor_name || "-"}
            </span>
        ),
    },
    {
        accessorKey: "timestamp",
        header: "Date",
        cell: ({ row }) => (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatDateTime(row.original.timestamp)}
            </span>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const adjustment = row.original;
            return (
                <div className="flex items-center gap-2 p-2">
                    {onDelete && (
                        <Tooltip content="Delete Adjustment" placement="top" color="danger">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                color="danger"
                                className="min-w-8 w-8 h-8 p-2"
                                onPress={() => onDelete(adjustment)}
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

