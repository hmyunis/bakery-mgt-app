import { tr } from "../../locales";
import { type ColumnDef } from "@tanstack/react-table";
import type { Sale } from "../../types/sales";
import { Button, Chip } from "@heroui/react";

// Helper function to format date
const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
};

export const getSalesHistoryColumns = (options?: {
    onPaymentStatusClick?: (sale: Sale) => void;
}): ColumnDef<Sale>[] => [
    {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.index + 1}</span>,
        size: 50,
    },
    {
        accessorKey: "created_at",
        header: tr("Timestamp"),
        cell: ({ row }) => (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatDateTime(row.original.created_at)}
            </span>
        ),
    },
    {
        accessorKey: "cashier_name",
        header: tr("Cashier"),
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">
                {row.original.cashier_name || "-"}
            </span>
        ),
    },
    {
        id: "items",
        header: tr("Items"),
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
                            +{items.length - 3} {tr("more")}
                        </Chip>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "total_amount",
        header: tr("Total Amount"),
        cell: ({ row }) => (
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {tr("ETB")}
                {row.original.total_amount.toFixed(2)}
            </span>
        ),
    },
    {
        accessorKey: "payment_status",
        header: tr("Status"),
        cell: ({ row }) => {
            const sale = row.original;
            const isUnpaid = sale.payment_status === "unpaid_approved";
            return (
                <Chip
                    size="sm"
                    variant="flat"
                    color={isUnpaid ? "warning" : "success"}
                    className={isUnpaid ? "capitalize" : "capitalize"}
                >
                    {isUnpaid ? tr("Unpaid") : tr("Paid")}
                </Chip>
            );
        },
    },
    {
        id: "payments",
        header: tr("Payment Methods"),
        cell: ({ row }) => {
            const sale = row.original;
            if (!sale.payments || sale.payments.length === 0) {
                return <span className="text-zinc-500">-</span>;
            }

            return (
                <div className="flex flex-wrap gap-1">
                    {sale.payments.map((payment, index) => (
                        <Chip key={index} variant="flat" size="sm">
                            {payment.method__name}
                            {tr(": ETB")}
                            {payment.amount.toFixed(2)}
                        </Chip>
                    ))}
                </div>
            );
        },
    },
    {
        id: "actions",
        header: tr("Actions"),
        cell: ({ row }) => (
            <Button
                size="sm"
                variant="flat"
                className="!min-w-fit !w-auto px-3"
                onClick={(e) => {
                    e.stopPropagation();
                    options?.onPaymentStatusClick?.(row.original);
                }}
            >
                {tr("Payment Status")}
            </Button>
        ),
    },
];
