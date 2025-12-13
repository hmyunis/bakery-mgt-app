import { type ColumnDef } from "@tanstack/react-table";
import type { Ingredient } from "../../types/inventory";
import { Button, Chip, Tooltip } from "@heroui/react";
import { Edit, Trash2, AlertTriangle, ShoppingCart } from "lucide-react";

export const getIngredientColumns = ({
    onEdit,
    onDelete,
    onAddPurchase,
}: {
    onEdit?: (ingredient: Ingredient) => void;
    onDelete?: (ingredient: Ingredient) => void;
    onAddPurchase?: (ingredient: Ingredient) => void;
}): ColumnDef<Ingredient>[] => [
    {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">{row.index + 1}</span>
        ),
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
        accessorKey: "unit",
        header: "Unit",
        cell: ({ row }) => (
            <Chip variant="flat" size="sm" className="uppercase">
                {row.original.unit}
            </Chip>
        ),
    },
    {
        accessorKey: "current_stock",
        header: "Current Stock",
        cell: ({ row }) => {
            const ingredient = row.original;
            const isLowStock = ingredient.current_stock <= ingredient.reorder_point;

            return (
                <div className="flex items-center gap-2">
                    {isLowStock && (
                        <AlertTriangle className="h-4 w-4 text-warning-500 flex-shrink-0" />
                    )}
                    <span
                        className={
                            isLowStock
                                ? "text-warning-600 dark:text-warning-400 font-medium"
                                : "text-zinc-900 dark:text-zinc-100"
                        }
                    >
                        {ingredient.current_stock.toFixed(3)} {ingredient.unit}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "reorder_point",
        header: "Reorder Point",
        cell: ({ row }) => {
            const ingredient = row.original;
            const isLowStock = ingredient.current_stock <= ingredient.reorder_point;

            return (
                <div className="flex items-center gap-2">
                    <span
                        className={
                            isLowStock
                                ? "text-warning-600 dark:text-warning-400 font-medium"
                                : "text-zinc-900 dark:text-zinc-100"
                        }
                    >
                        {ingredient.reorder_point.toFixed(3)} {ingredient.unit}
                    </span>
                    {isLowStock && (
                        <Chip color="warning" variant="flat" size="sm">
                            Low Stock
                        </Chip>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "average_cost_per_unit",
        header: "Avg Cost/Unit",
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">
                {row.original.average_cost_per_unit.toFixed(2)} ETB
            </span>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const ingredient = row.original;
            return (
                <div className="flex items-center gap-2">
                    {onAddPurchase && (
                        <Tooltip content="Record Purchase" placement="top">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                color="success"
                                className="min-w-8 w-8 h-8 p-2"
                                onPress={() => onAddPurchase(ingredient)}
                                >
                                <ShoppingCart className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    )}
                    {onEdit && (
                        <Tooltip content="Edit Ingredient" placement="top">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                color="primary"
                                className="min-w-8 w-8 h-8 p-2"
                                onPress={() => onEdit(ingredient)}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    )}
                    {onDelete && (
                        <Tooltip content="Delete Ingredient" placement="top">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                color="danger"
                                className="min-w-8 w-8 h-8 p-2"
                                onPress={() => onDelete(ingredient)}
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

