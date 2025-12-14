import { useEffect, useState } from "react";
import { Input, Button } from "@heroui/react";
import { Search, Grid3X3, List, ShoppingCart } from "lucide-react";
import { useProducts } from "../../hooks/useProduction";
import { ProductCard } from "./ProductCard";
import { ProductRow } from "./ProductRow";
import { POSCartSidebar, type CartItem } from "./POSCartSidebar";
import { useDebounce } from "../../hooks/useDebounce";
import { Spinner } from "@heroui/react";
import { DataTablePagination } from "../ui/DataTablePagination";

interface POSTerminalProps {
    onCheckout: (items: CartItem[]) => void;
}

export function POSTerminal({ onCheckout }: POSTerminalProps) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const debouncedSearch = useDebounce(searchQuery, 300);
    const { data: productsData, isLoading } = useProducts({
        page,
        page_size: pageSize,
        is_active: true,
        search: debouncedSearch || undefined,
    });

    const products = productsData?.results || [];
    const totalCount = productsData?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // When search changes, reset to first page to avoid empty pages.
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    const getKnownProduct = (productId: number) => {
        return (
            products.find((p) => p.id === productId) ??
            cart.find((c) => c.product.id === productId)?.product
        );
    };

    const handleIncrement = (productId: number) => {
        const product = getKnownProduct(productId);
        if (!product || product.stock_quantity <= 0) return;

        setCart((prev) => {
            const existingItem = prev.find((item) => item.product.id === productId);
            if (existingItem) {
                // Check if adding one more would exceed stock
                if (existingItem.quantity >= product.stock_quantity) {
                    return prev;
                }
                return prev.map((item) =>
                    item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prev, { product, quantity: 1 }];
            }
        });
    };

    const handleDecrement = (productId: number) => {
        setCart((prev) => {
            const existingItem = prev.find((item) => item.product.id === productId);
            if (existingItem && existingItem.quantity > 1) {
                return prev.map((item) =>
                    item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
                );
            } else if (existingItem && existingItem.quantity === 1) {
                return prev.filter((item) => item.product.id !== productId);
            }
            return prev;
        });
    };

    const handleSetQuantity = (productId: number, nextQty: number) => {
        const product = getKnownProduct(productId);
        if (!product) return;

        const maxQty = Math.max(0, product.stock_quantity);
        const clamped = Math.max(1, Math.min(maxQty, Math.floor(nextQty)));

        setCart((prev) => {
            const existingItem = prev.find((item) => item.product.id === productId);
            if (!existingItem) return prev;
            return prev.map((item) =>
                item.product.id === productId ? { ...item, quantity: clamped } : item
            );
        });
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;
        onCheckout(cart);
        setCart([]);
        setIsSidebarCollapsed(true);
    };

    const handleRemoveFromCart = (productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const quantities = Object.fromEntries(cart.map((item) => [item.product.id, item.quantity]));

    return (
        <div className="flex h-full">
            {/* Main Content */}
            <div className="flex-1 pr-4 space-y-6 overflow-y-auto">
                {/* Controls */}
                <div className="w-full space-y-4">
                    <div className="flex items-center gap-3 max-w-2xl mx-auto w-full">
                        <Input
                            placeholder="Search products..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            isClearable
                            onClear={() => setSearchQuery("")}
                            startContent={
                                <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                            }
                            radius="full"
                            classNames={{
                                base: "!w-full",
                                input: "!text-slate-900 dark:!text-slate-100",
                                inputWrapper: "!bg-white dark:!bg-zinc-800",
                            }}
                        />
                        <div
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="relative w-fit cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                        >
                            <ShoppingCart className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                    {cart.length}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant={viewMode === "grid" ? "solid" : "bordered"}
                            onPress={() => setViewMode("grid")}
                            size="sm"
                            className="h-8 w-8 p-2"
                            isIconOnly
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "table" ? "solid" : "bordered"}
                            onPress={() => setViewMode("table")}
                            size="sm"
                            className="h-8 w-8 p-2"
                            isIconOnly
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Product Display */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Spinner size="lg" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                        <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
                        <p>No products found</p>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                quantity={quantities[product.id] || 0}
                                onIncrement={() => handleIncrement(product.id)}
                                onDecrement={() => handleDecrement(product.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {products.map((product, index) => (
                            <ProductRow
                                key={product.id}
                                product={product}
                                quantity={quantities[product.id] || 0}
                                onIncrement={() => handleIncrement(product.id)}
                                onDecrement={() => handleDecrement(product.id)}
                                rowNumber={index + 1 + (page - 1) * pageSize}
                            />
                        ))}
                    </div>
                )}

                <DataTablePagination
                    pagination={{
                        count: totalCount,
                        page,
                        pageSize,
                        totalPages,
                    }}
                    onPageChange={(newPage) => setPage(newPage)}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setPage(1);
                    }}
                />
            </div>

            {/* Cart Sidebar */}
            <POSCartSidebar
                items={cart}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onSetQuantity={handleSetQuantity}
                onRemove={handleRemoveFromCart}
                onCheckout={handleCheckout}
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
                className="h-[calc(100vh-8rem)]"
            />
        </div>
    );
}
