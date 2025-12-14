import { type ColumnDef } from "@tanstack/react-table";
import type { Product } from "../../types/production";
import { Button, Chip, Avatar, Tooltip } from "@heroui/react";
import { Edit, Trash2, Utensils, ChefHat } from "lucide-react";

// Get base URL without /api/v1 for image URLs
const getBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl) {
        return envUrl.replace(/\/api\/v1$/, "");
    }
    return "http://localhost:8001";
};
const API_BASE_URL = getBaseUrl();

export const getProductColumns = ({
    onEdit,
    onDelete,
    onBuildRecipe,
    onRecordProduction,
}: {
    onEdit?: (product: Product) => void;
    onDelete?: (product: Product) => void;
    onBuildRecipe?: (product: Product) => void;
    onRecordProduction?: (product: Product) => void;
}): ColumnDef<Product>[] => [
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
        header: "Product",
        cell: ({ row }) => {
            const product = row.original;
            const imageUrl = product.image
                ? product.image.startsWith("http")
                    ? product.image
                    : `${API_BASE_URL}${product.image}`
                : null;

            return (
                <div className="flex items-center gap-3">
                    <Avatar
                        src={imageUrl || undefined}
                        fallback={product.name[0].toUpperCase()}
                        className="h-10 w-10"
                    />
                    <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {product.name}
                        </span>
                        {product.description && (
                            <span className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
                                {product.description}
                            </span>
                        )}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "selling_price",
        header: "Selling Price",
        cell: ({ row }) => (
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                ETB {parseFloat(row.original.selling_price.toString()).toFixed(2)}
            </span>
        ),
    },
    {
        accessorKey: "stock_quantity",
        header: "Stock",
        cell: ({ row }) => {
            const stock = row.original.stock_quantity;
            const isLowStock = stock <= 0;

            return (
                <Chip
                    color={isLowStock ? "warning" : "success"}
                    variant="flat"
                    size="sm"
                >
                    {stock} pcs
                </Chip>
            );
        },
    },
    {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
            <Chip
                color={row.original.is_active ? "success" : "default"}
                variant="flat"
                size="sm"
            >
                {row.original.is_active ? "Active" : "Inactive"}
            </Chip>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const product = row.original;
            return (
                <div className="relative flex items-center gap-2 p-2">
                    {onRecordProduction && product.hasRecipe && (
                        <Tooltip content="Record Production">
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                color="success"
                                className="min-w-8 w-8 h-8 p-2"
                                onPress={() => onRecordProduction(product)}
                            >
                                <ChefHat className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    )}
                    {onBuildRecipe && (
                        <Tooltip content="Build Recipe">
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                color="primary"
                                className="min-w-8 w-8 h-8 p-2"
                                onPress={() => onBuildRecipe(product)}
                            >
                                <Utensils className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    )}
                    {onEdit && (
                        <Tooltip content="Edit product">
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                className="min-w-8 w-8 h-8 p-2 text-zinc-900 dark:text-zinc-100"
                                onPress={() => onEdit(product)}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    )}
                    {onDelete && (
                        <Tooltip content="Delete product" color="danger">
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                color="danger"
                                className="min-w-8 w-8 h-8 p-2"
                                onPress={() => onDelete(product)}
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

