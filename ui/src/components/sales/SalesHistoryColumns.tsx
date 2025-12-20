import { type ColumnDef } from "@tanstack/react-table";
import type { Sale } from "../../types/sales";
import { Chip } from "@heroui/react";

// Helper function to format date
const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
};

export const getSalesHistoryColumns = (): ColumnDef<Sale>[] => [
    {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.index + 1}</span>,
        size: 50,
    },
    {
        accessorKey: "created_at",
        header: "Timestamp",
        cell: ({ row }) => (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatDateTime(row.original.created_at)}
            </span>
        ),
    },
    {
        accessorKey: "cashier_name",
        header: "Cashier",
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">
                {row.original.cashier_name || "-"}
            </span>
        ),
    },
    {
        id: "items",
        header: "Items",
        cell: ({ row }) => {
            const items = row.original.items || [];
            if (items.length === 0) return <span className="text-zinc-500">-</span>;

            return (
                <div className="flex flex-wrap gap-1">
                    {items.slice(0, 3).map((item, index) => (
                        <Chip key={index} variant="flat" size="sm">
                            {item.product_name} × {item.quantity}
                        </Chip>
                    ))}
                    {items.length > 3 && (
                        <Chip variant="flat" size="sm">
                            +{items.length - 3} more
                        </Chip>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "total_amount",
        header: "Total Amount",
        cell: ({ row }) => (
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                ETB {row.original.total_amount.toFixed(2)}
            </span>
        ),
    },
    {
        id: "payments",
        header: "Payment Methods",
        cell: ({ row }) => {
            const sale = row.original;
            if (!sale.payments || sale.payments.length === 0) {
                return <span className="text-zinc-500">-</span>;
            }

            return (
                <div className="flex flex-wrap gap-1">
                    {sale.payments.map((payment, index) => (
                        <Chip key={index} variant="flat" size="sm">
                            {payment.method__name}: ETB {payment.amount.toFixed(2)}
                        </Chip>
                    ))}
                </div>
            );
        },
    },
];
