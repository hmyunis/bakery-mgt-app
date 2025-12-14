import { Card, Chip, Button } from "@heroui/react";
import { Plus, Minus } from "lucide-react";
import type { Product } from "../../types/production";
import { getImageBaseUrl } from "../../lib/apiClient";

interface ProductRowProps {
    product: Product;
    quantity: number;
    onIncrement: () => void;
    onDecrement: () => void;
    rowNumber: number;
}

export function ProductRow({
    product,
    quantity,
    onIncrement,
    onDecrement,
    rowNumber,
}: ProductRowProps) {
    const getImageUrl = (image?: string): string | undefined => {
        if (!image) return undefined;
        if (image.startsWith("http")) return image;
        return `${getImageBaseUrl()}${image}`;
    };

    const imageUrl = getImageUrl(product.image);
    const isOutOfStock = product.stock_quantity <= 0;

    return (
        <Card
            className={`shadow-lg transition-all ${
                isOutOfStock ? "opacity-50" : "hover:shadow-xl"
            }`}
        >
            <div className="p-3">
                <div className="flex items-center justify-between gap-2 md:gap-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary font-semibold text-sm rounded-full flex-shrink-0">
                            {rowNumber}
                        </div>
                        <div className="w-12 h-12 bg-default-100 rounded-lg overflow-hidden flex-shrink-0">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full bg-default-200 flex items-center justify-center text-lg font-bold text-gray-400">
                                    {product.name[0]}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                                    {product.name}
                                </h3>
                                {isOutOfStock ? (
                                    <Chip color="danger" variant="flat" size="sm">
                                        Out of Stock
                                    </Chip>
                                ) : (
                                    <Chip color="default" variant="flat" size="sm">
                                        {product.stock_quantity} pcs
                                    </Chip>
                                )}
                            </div>
                            {product.description && (
                                <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                    {product.description}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        <span className="text-sm font-bold text-primary whitespace-nowrap">
                            ETB {product.selling_price.toFixed(2)}
                        </span>
                        <Button
                            variant="bordered"
                            size="sm"
                            onPress={onDecrement}
                            isDisabled={quantity <= 0 || isOutOfStock}
                            className="h-7 w-7 p-1"
                        >
                            <Minus className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                        </Button>
                        <span className="w-4 text-center font-medium text-sm">{quantity}</span>
                        <Button
                            variant="bordered"
                            size="sm"
                            onPress={onIncrement}
                            isDisabled={isOutOfStock || quantity >= product.stock_quantity}
                            className="h-7 w-7 p-1"
                        >
                            <Plus className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

