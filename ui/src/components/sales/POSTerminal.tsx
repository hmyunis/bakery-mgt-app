import { useEffect, useMemo, useRef, useState } from "react";
import { Input, Button } from "@heroui/react";
import { Search, Grid3X3, List, ShoppingCart } from "lucide-react";
import { useInfiniteProducts } from "../../hooks/useProduction";
import { ProductCard } from "./ProductCard";
import { ProductRow } from "./ProductRow";
import { POSCartSidebar, type CartItem } from "./POSCartSidebar";
import { useDebounce } from "../../hooks/useDebounce";
import { Spinner } from "@heroui/react";

export function POSTerminal() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

    const debouncedSearch = useDebounce(searchQuery, 300);
    const {
        data: productsData,
        isLoading,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage,
    } = useInfiniteProducts({
        page_size: 50,
        is_active: true,
        search: debouncedSearch || undefined,
    });

    const products = useMemo(() => {
        return productsData?.pages.flatMap((p) => p.results) ?? [];
    }, [productsData?.pages]);

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = scrollContainerRef.current;
        const target = loadMoreRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (!first?.isIntersecting) return;
                if (!hasNextPage || isFetchingNextPage) return;
                fetchNextPage();
            },
            {
                root,
                rootMargin: "200px",
            }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage, viewMode]);

    useEffect(() => {
        scrollContainerRef.current?.scrollTo({ top: 0 });
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

        const existingItem = cart.find((item) => item.product.id === productId);
        const canIncrement =
            !existingItem || existingItem.quantity < Math.max(0, product.stock_quantity);
        const isDesktopNow = window.matchMedia?.("(min-width: 768px)")?.matches ?? true;
        if (canIncrement && isDesktopNow) setIsSidebarCollapsed(false);

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
        const existingItem = cart.find((item) => item.product.id === productId);
        if (existingItem && existingItem.quantity === 1 && cart.length === 1) {
            setIsSidebarCollapsed(true);
        }
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

    const handleClearCart = () => {
        setCart([]);
        setIsSidebarCollapsed(true);
    };

    const handleRemoveFromCart = (productId: number) => {
        const isRemovingLastItem =
            cart.length === 1 && cart.some((i) => i.product.id === productId);
        if (isRemovingLastItem) setIsSidebarCollapsed(true);
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const quantities = Object.fromEntries(cart.map((item) => [item.product.id, item.quantity]));

    return (
        <div className="flex h-full">
            {/* Main Content */}
            <div ref={scrollContainerRef} className="flex-1 pr-4 space-y-6 overflow-y-auto">
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
                    <>
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
                        {hasNextPage && <div ref={loadMoreRef} className="h-1" />}
                        {isFetchingNextPage && (
                            <div className="flex justify-center py-8">
                                <Spinner size="lg" />
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="space-y-3">
                            {products.map((product, index) => (
                                <ProductRow
                                    key={product.id}
                                    product={product}
                                    quantity={quantities[product.id] || 0}
                                    onIncrement={() => handleIncrement(product.id)}
                                    onDecrement={() => handleDecrement(product.id)}
                                    rowNumber={index + 1}
                                />
                            ))}
                        </div>
                        {hasNextPage && <div ref={loadMoreRef} className="h-1" />}
                        {isFetchingNextPage && (
                            <div className="flex justify-center py-8">
                                <Spinner size="lg" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Desktop spacer so content doesn't go under the fixed cart */}
            <div
                aria-hidden
                className={`hidden md:block transition-all duration-300 shrink-0 ${
                    isSidebarCollapsed ? "w-0" : "w-80"
                }`}
            />

            {/* Cart Sidebar */}
            <div className="md:fixed md:top-20 md:right-4 lg:right-6 md:z-20">
                <POSCartSidebar
                    items={cart}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    onSetQuantity={handleSetQuantity}
                    onRemove={handleRemoveFromCart}
                    onSaleSuccess={handleClearCart}
                    isSidebarCollapsed={isSidebarCollapsed}
                    setIsSidebarCollapsed={setIsSidebarCollapsed}
                    className="h-[calc(100vh-8rem)]"
                />
            </div>
        </div>
    );
}
