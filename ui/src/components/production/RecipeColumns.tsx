import { type ColumnDef } from "@tanstack/react-table";
import type { Recipe } from "../../types/production";
import { Button, Tooltip } from "@heroui/react";
import { Edit, Trash2 } from "lucide-react";

export const getRecipeColumns = ({
    onEdit,
    onDelete,
}: {
    onEdit?: (recipe: Recipe) => void;
    onDelete?: (recipe: Recipe) => void;
}): ColumnDef<Recipe>[] => [
    {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.index + 1}</span>,
        size: 50,
    },
    {
        accessorKey: "product",
        header: "Product",
        cell: ({ row }) => {
            const recipe = row.original as Recipe & { productName?: string };
            return (
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {recipe.productName || (recipe.product ? `Product #${recipe.product}` : "N/A")}
                </span>
            );
        },
    },
    {
        accessorKey: "standard_yield",
        header: "Standard Yield",
        cell: ({ row }) => (
            <span className="text-zinc-900 dark:text-zinc-100">
                {parseFloat(row.original.standard_yield.toString()).toFixed(2)}
            </span>
        ),
    },
    {
        accessorKey: "items",
        header: "Ingredients",
        cell: ({ row }) => {
            const items = row.original.items || [];
            return (
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {items.length} ingredient{items.length !== 1 ? "s" : ""}
                </span>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const recipe = row.original;
            return (
                <div className="relative flex items-center gap-2 p-2">
                    {onEdit && (
                        <Tooltip content="Edit recipe">
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                className="min-w-8 w-8 h-8 p-2 text-zinc-900 dark:text-zinc-100"
                                onPress={() => onEdit(recipe)}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    )}
                    {onDelete && (
                        <Tooltip content="Delete recipe" color="danger">
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                color="danger"
                                className="min-w-8 w-8 h-8 p-2"
                                onPress={() => onDelete(recipe)}
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
