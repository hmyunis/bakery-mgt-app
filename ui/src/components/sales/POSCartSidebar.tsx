import { Button, Input } from "@heroui/react";
import { ChevronRight, ShoppingCart, Plus, Minus, X, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Product } from "../../types/production";
import { getImageBaseUrl } from "../../lib/apiClient";

export interface CartItem {
    product: Product;
    quantity: number;
}

interface POSCartSidebarProps {
    items: CartItem[];
    onIncrement: (productId: number) => void;
    onDecrement: (productId: number) => void;
    onSetQuantity: (productId: number, quantity: number) => void;
    onRemove: (productId: number) => void;
    onCheckout: () => void;
    isCheckoutLoading?: boolean;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    className?: string;
}

interface SidebarContentProps {
    items: CartItem[];
    onIncrement: (productId: number) => void;
    onDecrement: (productId: number) => void;
    onSetQuantity: (productId: number, quantity: number) => void;
    onRemove: (productId: number) => void;
    onCheckout: () => void;
    isCheckoutLoading?: boolean;
}

const SidebarContent = ({
    items,
    onIncrement,
    onDecrement,
    onSetQuantity,
    onRemove,
    onCheckout,
    isCheckoutLoading = false,
}: SidebarContentProps) => {
    const getImageUrl = (image?: string): string | undefined => {
        if (!image) return undefined;
        if (image.startsWith("http")) return image;
        return `${getImageBaseUrl()}${image}`;
    };

    const total = items.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);

    return (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            {items.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 m-auto">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Your cart is empty</p>
                    <p className="text-sm">Add products to get started</p>
                </div>
            ) : (
                <>
                    {/* Cart Items */}
                    <div className="space-y-3 flex-grow overflow-y-auto pr-1">
                        {items.map((item) => {
                            const imageUrl = getImageUrl(item.product.image);
                            return (
                                <div
                                    key={item.product.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-16 h-16 bg-default-100 rounded-lg overflow-hidden flex-shrink-0">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={item.product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-default-200 flex items-center justify-center text-2xl font-bold text-gray-400">
                                                    {item.product.name[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold line-clamp-1 text-slate-900 dark:text-slate-100">
                                                {item.product.name}
                                            </h4>
                                            {item.product.description && (
                                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                                    {item.product.description}
                                                </p>
                                            )}
                                            <p className="text-sm font-medium text-primary mt-2">
                                                ETB {item.product.selling_price.toFixed(2)}
                                            </p>
                                        </div>
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            color="danger"
                                            onPress={() => onRemove(item.product.id)}
                                            aria-label={`Remove ${item.product.name} from cart`}
                                            className="flex-shrink-0 p-2"
                                        >
                                            <Trash2 className="h-4 w-4 text-danger-600 dark:text-danger-400" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="bordered"
                                                onPress={() => onDecrement(item.product.id)}
                                                isDisabled={item.quantity <= 1}
                                            >
                                                <Minus className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                            </Button>
                                            <Input
                                                type="number"
                                                value={String(item.quantity)}
                                                onValueChange={(v) => {
                                                    if (!v) return; // allow user to clear while typing
                                                    const parsed = Number.parseInt(v, 10);
                                                    if (Number.isNaN(parsed)) return;
                                                    onSetQuantity(item.product.id, parsed);
                                                }}
                                                min={1}
                                                max={item.product.stock_quantity}
                                                className="w-20"
                                                classNames={{
                                                    input: "text-center !text-slate-900 dark:!text-slate-100",
                                                    inputWrapper:
                                                        "!h-9 !min-h-9 !px-2 !bg-white dark:!bg-zinc-800",
                                                }}
                                            />
                                            <Button
                                                size="sm"
                                                variant="bordered"
                                                onPress={() => onIncrement(item.product.id)}
                                                isDisabled={
                                                    item.quantity >= item.product.stock_quantity
                                                }
                                            >
                                                <Plus className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                            </Button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                ETB{" "}
                                                {(
                                                    item.product.selling_price * item.quantity
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Order Summary */}
                    <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <div className="flex justify-between font-semibold text-lg">
                            <span>Total:</span>
                            <span>ETB {total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-end md:justify-start">
                            <Button
                                className="w-full mt-2"
                                size="lg"
                                color="primary"
                                onPress={onCheckout}
                                isDisabled={isCheckoutLoading}
                            >
                                {isCheckoutLoading ? "Processing..." : "Checkout"}
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export function POSCartSidebar({
    items,
    onIncrement,
    onDecrement,
    onSetQuantity,
    onRemove,
    onCheckout,
    isCheckoutLoading = false,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    className,
}: POSCartSidebarProps) {
    return (
        <>
            {/* --- Desktop Sidebar --- */}
            <div
                className={cn(
                    "hidden md:flex flex-col bg-background border-l border-gray-200 dark:border-gray-700 transition-all duration-300 max-w-full overflow-x-hidden",
                    isSidebarCollapsed ? "w-0" : "w-80",
                    className
                )}
            >
                <div
                    className={cn(
                        "flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700",
                        isSidebarCollapsed && "invisible"
                    )}
                >
                    <h3 className="font-semibold text-lg">Your Cart</h3>
                    <Button
                        variant="light"
                        size="sm"
                        className="p-2"
                        onPress={() => setIsSidebarCollapsed(true)}
                        isIconOnly
                    >
                        <ChevronRight className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </Button>
                </div>
                {!isSidebarCollapsed && (
                    <SidebarContent
                        items={items}
                        onIncrement={onIncrement}
                        onDecrement={onDecrement}
                        onSetQuantity={onSetQuantity}
                        onRemove={onRemove}
                        onCheckout={onCheckout}
                        isCheckoutLoading={isCheckoutLoading}
                    />
                )}
            </div>

            {/* --- Mobile Overlay --- */}
            {!isSidebarCollapsed && (
                <div className="md:hidden fixed inset-0 z-40 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsSidebarCollapsed(true)}
                    ></div>

                    {/* Content */}
                    <div className="relative w-80 max-w-[90vw] h-full bg-background flex flex-col border-l border-gray-200 dark:border-gray-700 shadow-lg">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-lg">Your Cart</h3>
                            <Button
                                variant="light"
                                size="sm"
                                onPress={() => setIsSidebarCollapsed(true)}
                                isIconOnly
                            >
                                <X className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                            </Button>
                        </div>
                        <SidebarContent
                            items={items}
                            onIncrement={onIncrement}
                            onDecrement={onDecrement}
                            onSetQuantity={onSetQuantity}
                            onRemove={onRemove}
                            onCheckout={onCheckout}
                            isCheckoutLoading={isCheckoutLoading}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
