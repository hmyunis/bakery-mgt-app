import { Chip } from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ProductionRun } from "../../types/production";

const formatDateTime = (value?: string) =>
    value
        ? `${new Date(value).toLocaleDateString()} ${new Date(value).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
          })}`
        : "-";

const statusPresentation = (status: ProductionRun["performance"]["status"]) => {
    if (status === "underproducing") return { label: "Underproducing", color: "danger" as const };
    if (status === "overproducing") return { label: "Overproducing", color: "primary" as const };
    if (status === "normal") return { label: "Within average", color: "success" as const };
    return { label: "Building average", color: "default" as const };
};

export const getProductionHistoryColumns = (): ColumnDef<ProductionRun>[] => [
    {
        accessorKey: "date_produced",
        header: "Date",
        cell: ({ row }) => (
            <span className="text-sm text-zinc-500">
                {formatDateTime(row.original.date_produced)}
            </span>
        ),
    },
    {
        accessorKey: "product_name",
        header: "Product",
        cell: ({ row }) => (
            <span className="font-medium">
                {row.original.product_name || row.original.composite_name || "-"}
            </span>
        ),
    },
    {
        accessorKey: "quantity_produced",
        header: "Output",
        cell: ({ row }) => <span>{row.original.quantity_produced.toFixed(2)} pcs</span>,
    },
    {
        id: "ingredient_used",
        header: "Ingredients Used",
        cell: ({ row }) => {
            const usages = row.original.usages;
            return usages.length ? (
                <div>
                    <span className="font-medium">
                        {usages.length} ingredient{usages.length === 1 ? "" : "s"}
                    </span>
                    <p className="max-w-56 truncate text-xs text-zinc-500">
                        {usages.map((usage) => usage.ingredient__name).join(", ")}
                    </p>
                </div>
            ) : (
                <span className="text-zinc-400">-</span>
            );
        },
    },
    {
        id: "performance",
        header: "Performance",
        cell: ({ row }) => {
            const performance = row.original.performance;
            const display = statusPresentation(performance.status);
            return (
                <div className="flex items-center gap-2">
                    <Chip color={display.color} variant="flat" size="sm">
                        {display.label}
                    </Chip>
                    {performance.status !== "baseline" && (
                        <span
                            className={
                                performance.status === "underproducing"
                                    ? "text-danger text-xs font-semibold"
                                    : "text-xs text-zinc-500"
                            }
                        >
                            {performance.deviation_percent && performance.deviation_percent > 0
                                ? "+"
                                : ""}
                            {(performance.deviation_percent || 0).toFixed(1)}%
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "chef_name",
        header: "Chef",
        cell: ({ row }) => <span>{row.original.chef_name || "-"}</span>,
    },
];
