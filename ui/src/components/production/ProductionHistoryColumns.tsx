import { type ColumnDef } from "@tanstack/react-table";
import type { ProductionRun } from "../../types/production";
import { Chip } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

// Helper function to format date
const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Helper function to calculate wastage in terms of product pieces
// This calculates the impact on final product quantity, not summing different units
const calculateProductWastage = (
    usages: ProductionRun["usages"],
    quantityProduced: number
): { pieces: number; isWaste: boolean } => {
    if (!usages || usages.length === 0) {
        return { pieces: 0, isWaste: false };
    }

    const wastePercentages: number[] = [];
    const savingsPercentages: number[] = [];

    usages.forEach((usage) => {
        const theoretical = parseFloat(usage.theoretical_amount.toString());
        const wastage = parseFloat(usage.wastage.toString());

        if (theoretical > 0) {
            const percentage = (wastage / theoretical) * 100;
            if (percentage > 0) {
                wastePercentages.push(percentage);
            } else if (percentage < 0) {
                savingsPercentages.push(Math.abs(percentage));
            }
        }
    });

    // For waste: take the maximum (most limiting ingredient)
    // For savings: take the minimum (most limiting ingredient)
    if (wastePercentages.length > 0) {
        const maxWastePercentage = Math.max(...wastePercentages);
        const piecesWasted = (maxWastePercentage / 100) * quantityProduced;
        return { pieces: piecesWasted, isWaste: true };
    } else if (savingsPercentages.length > 0) {
        const minSavingsPercentage = Math.min(...savingsPercentages);
        const extraPiecesPossible = (minSavingsPercentage / 100) * quantityProduced;
        return { pieces: extraPiecesPossible, isWaste: false };
    }

    return { pieces: 0, isWaste: false };
};

export const getProductionHistoryColumns = (): ColumnDef<ProductionRun>[] => [
    {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">{row.index + 1}</span>
        ),
        size: 50,
    },
    {
        accessorKey: "date_produced",
        header: "Date",
        cell: ({ row }) => (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatDateTime(row.original.date_produced)}
            </span>
        ),
    },
    {
        accessorKey: "product_name",
        header: "Product",
        cell: ({ row }) => {
            const run = row.original;
            const productName = run.product_name || run.composite_name || "N/A";
            return (
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {productName}
                </span>
            );
        },
    },
    {
        accessorKey: "quantity_produced",
        header: "Quantity",
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">
                {row.original.quantity_produced.toFixed(2)} pcs
            </span>
        ),
    },
    {
        accessorKey: "chef_name",
        header: "Chef",
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">
                {row.original.chef_name || "-"}
            </span>
        ),
    },
    {
        id: "wastage",
        header: "Wastage",
        cell: ({ row }) => {
            const run = row.original;
            const wastage = calculateProductWastage(run.usages || [], run.quantity_produced);
            const hasWastage = wastage.pieces > 0;

            return (
                <div className="flex items-center gap-2">
                    {hasWastage && wastage.isWaste && (
                        <AlertTriangle className="h-4 w-4 text-danger-500 flex-shrink-0" />
                    )}
                    <span
                        className={
                            hasWastage && wastage.isWaste
                                ? "text-danger-600 dark:text-danger-400 font-semibold"
                                : hasWastage && !wastage.isWaste
                                ? "text-success-600 dark:text-success-400 font-semibold"
                                : "text-zinc-500 dark:text-zinc-400"
                        }
                    >
                        {hasWastage
                            ? wastage.isWaste
                                ? `-${wastage.pieces.toFixed(2)} pcs`
                                : `+${wastage.pieces.toFixed(2)} pcs`
                            : "0 pcs"}
                    </span>
                    {hasWastage && wastage.isWaste && (
                        <Chip color="danger" variant="flat" size="sm">
                            Waste
                        </Chip>
                    )}
                    {hasWastage && !wastage.isWaste && (
                        <Chip color="success" variant="flat" size="sm">
                            Savings
                        </Chip>
                    )}
                </div>
            );
        },
    },
];

