import { Card, Button } from "@heroui/react";
import { Plus, Minus } from "lucide-react";
import type { Product } from "../../types/production";
import { getImageBaseUrl } from "../../lib/apiClient";

interface ProductCardProps {
    product: Product;
    quantity: number;
    onIncrement: () => void;
    onDecrement: () => void;
}

export function ProductCard({ product, quantity, onIncrement, onDecrement }: ProductCardProps) {
    const getImageUrl = (image?: string): string | undefined => {
        if (!image) return undefined;
        if (image.startsWith("http")) return image;
        return `${getImageBaseUrl()}${image}`;
    };

    const imageUrl = getImageUrl(product.image);
    const isOutOfStock = product.stock_quantity <= 0;

    return (
        <Card
            className={`hover-lift shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden transition-all h-full flex flex-col ${
                isOutOfStock ? "opacity-50" : ""
            }`}
        >
            <div className="w-full h-36 p-2 bg-default-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full rounded-lg object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-default-200 rounded-lg flex items-center justify-center text-4xl font-bold text-gray-400">
                        {product.name[0]}
                    </div>
                )}
            </div>
            <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                            {product.name}
                        </h3>
                        {isOutOfStock && (
                            <span className="text-xs text-danger font-medium">Out of Stock</span>
                        )}
                        {!isOutOfStock && (
                            <span className="text-xs text-slate-500">
                                Stock: {product.stock_quantity} pcs
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-primary whitespace-nowrap">
                        ETB {product.selling_price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            variant="bordered"
                            size="sm"
                            onPress={onDecrement}
                            isDisabled={quantity <= 0 || isOutOfStock}
                            className="h-7 w-7 min-w-0 p-1"
                        >
                            <Minus className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                        </Button>
                        <span className="w-5 text-center font-medium text-sm">{quantity}</span>
                        <Button
                            variant="bordered"
                            size="sm"
                            onPress={onIncrement}
                            isDisabled={isOutOfStock || quantity >= product.stock_quantity}
                            className="h-7 w-7 min-w-0 p-1"
                        >
                            <Plus className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
