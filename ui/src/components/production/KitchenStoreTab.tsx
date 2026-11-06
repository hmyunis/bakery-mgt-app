import { tr } from "../../locales";
import { useMemo, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    Chip,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Spinner,
    Textarea,
} from "@heroui/react";
import {
    ArrowRight,
    History,
    Package,
    PackagePlus,
    Search,
    Utensils,
    Warehouse,
} from "lucide-react";
import {
    useCreateKitchenTransfer,
    useIngredients,
    useKitchenTransfers,
} from "../../hooks/useInventory";
import { DataTablePagination } from "../ui/DataTablePagination";

export function KitchenStoreTab({ canRestock }: { canRestock: boolean }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    const [isOpen, setIsOpen] = useState(false);
    const [ingredientId, setIngredientId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");

    const { data: ingredientData, isLoading } = useIngredients({ page_size: 100 });
    const { data: transferData, isLoading: isLoadingTransfers } = useKitchenTransfers({
        page_size: 10,
    });
    const { mutateAsync: createTransfer, isPending } = useCreateKitchenTransfer();

    const ingredients = useMemo(() => ingredientData?.results || [], [ingredientData]);
    const filtered = useMemo(
        () => ingredients.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
        [ingredients, search]
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginatedItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const selected = ingredients.find((item) => item.id.toString() === ingredientId);
    const ingredientSelectedKeys = useMemo(
        () => (ingredientId ? [String(ingredientId)] : []),
        [ingredientId]
    );

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const openTransfer = (id?: number) => {
        setIngredientId(id?.toString() || "");
        setQuantity("");
        setNotes("");
        setError("");
        setIsOpen(true);
    };

    const submit = async () => {
        const amount = Number(quantity);
        if (!selected) return setError("Select an ingredient");
        if (!amount || amount <= 0) return setError("Enter an amount greater than 0");
        if (amount > selected.current_stock) {
            return setError(
                `Only ${selected.current_stock.toFixed(3)} ${selected.unit} is available`
            );
        }
        try {
            await createTransfer({ ingredient: selected.id, quantity: amount, notes });
            setIsOpen(false);
        } catch {
            // The mutation displays the server error.
        }
    };

    return (
        <div className="space-y-6">
            {/* Header controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    aria-label={tr("Search kitchen ingredients")}
                    placeholder={tr("Search ingredients...")}
                    value={search}
                    onValueChange={handleSearchChange}
                    isClearable
                    onClear={() => handleSearchChange("")}
                    startContent={<Search className="h-4 w-4 text-zinc-400" />}
                    className="w-full sm:max-w-sm"
                />
                {canRestock && (
                    <Button
                        color="primary"
                        startContent={<PackagePlus className="h-4 w-4" />}
                        onPress={() => openTransfer()}
                    >
                        {tr("Restock Kitchen")}
                    </Button>
                )}
            </div>

            {/* Compact Cards Grid */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Spinner size="lg" />
                </div>
            ) : filtered.length ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {paginatedItems.map((item) => {
                            const isLowStock =
                                item.reorder_point > 0 &&
                                item.current_stock > 0 &&
                                item.current_stock <= item.reorder_point;
                            const isOutOfStock = item.current_stock <= 0;

                            return (
                                <Card
                                    key={item.id}
                                    className="flex flex-col justify-between border border-zinc-200 bg-white shadow-xs transition-all duration-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80"
                                >
                                    <CardBody className="space-y-3 p-3.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Package className="h-4 w-4 shrink-0 text-primary" />
                                                    <h4 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {item.name}
                                                    </h4>
                                                </div>
                                                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                    {tr("Unit")}:{" "}
                                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                        {item.unit}
                                                    </span>
                                                </p>
                                            </div>
                                            {isLowStock ? (
                                                <Chip
                                                    size="sm"
                                                    color="warning"
                                                    variant="flat"
                                                    className="h-6 shrink-0 text-xs"
                                                >
                                                    {tr("Low Stock")}
                                                </Chip>
                                            ) : isOutOfStock ? (
                                                <Chip
                                                    size="sm"
                                                    color="danger"
                                                    variant="flat"
                                                    className="h-6 shrink-0 text-xs"
                                                >
                                                    {tr("Out of Stock")}
                                                </Chip>
                                            ) : null}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
                                            <div>
                                                <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                                    <Warehouse className="h-3 w-3 text-zinc-400" />
                                                    <span className="truncate">
                                                        {tr("Storehouse")}
                                                    </span>
                                                </div>
                                                <p
                                                    className={`mt-0.5 text-sm font-bold sm:text-base ${
                                                        item.current_stock > 0
                                                            ? "text-zinc-900 dark:text-zinc-100"
                                                            : "text-danger"
                                                    }`}
                                                >
                                                    {item.current_stock.toFixed(2)}{" "}
                                                    <span className="text-[11px] font-normal text-zinc-500">
                                                        {item.unit}
                                                    </span>
                                                </p>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                                    <Utensils className="h-3 w-3 text-primary" />
                                                    <span className="truncate">
                                                        {tr("Kitchen")}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-sm font-bold text-primary sm:text-base">
                                                    {item.kitchen_stock.toFixed(2)}{" "}
                                                    <span className="text-[11px] font-normal text-zinc-500">
                                                        {item.unit}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </CardBody>

                                    {canRestock && (
                                        <CardFooter className="p-3 pt-0">
                                            <Button
                                                size="sm"
                                                color="primary"
                                                variant="flat"
                                                className="w-full font-medium"
                                                startContent={
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                }
                                                onPress={() => openTransfer(item.id)}
                                                isDisabled={item.current_stock <= 0}
                                            >
                                                {item.current_stock > 0
                                                    ? tr("Transfer to Kitchen")
                                                    : tr("Out of Stock")}
                                            </Button>
                                        </CardFooter>
                                    )}
                                </Card>
                            );
                        })}
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
                        <DataTablePagination
                            pagination={{
                                count: filtered.length,
                                page,
                                pageSize,
                                totalPages,
                            }}
                            onPageChange={setPage}
                            onPageSizeChange={(newSize) => {
                                setPageSize(newSize);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 p-10 text-center dark:border-zinc-800">
                    <Package className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        {tr("No ingredients found.")}
                    </p>
                </div>
            )}

            {/* Recent transfers history */}
            <div>
                <div className="mb-3 flex items-center gap-2">
                    <History className="h-4 w-4 text-zinc-500" />
                    <h3 className="font-semibold">{tr("Recent storehouse transfers")}</h3>
                </div>
                <div className="space-y-2">
                    {isLoadingTransfers ? (
                        <Spinner size="sm" />
                    ) : transferData?.results.length ? (
                        transferData.results.map((transfer) => (
                            <div
                                key={transfer.id}
                                className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
                            >
                                <div className="flex items-center gap-3">
                                    <Warehouse className="h-4 w-4 text-zinc-400" />
                                    <div>
                                        <p className="text-sm font-medium">
                                            {transfer.ingredient_name}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {transfer.transferred_by_name || tr("System")} ·{" "}
                                            {new Date(transfer.transferred_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span>{transfer.storehouse_balance_before.toFixed(3)}</span>
                                    <ArrowRight className="h-3 w-3 text-zinc-400" />
                                    <Chip color="primary" variant="flat">
                                        +{transfer.quantity.toFixed(3)} {transfer.unit}{" "}
                                        {tr("to kitchen")}
                                    </Chip>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
                            {tr("No kitchen restocks recorded yet.")}
                        </p>
                    )}
                </div>
            </div>

            {/* Transfer Modal */}
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <ModalContent>
                    <ModalHeader>{tr("Restock Kitchen Store")}</ModalHeader>
                    <ModalBody className="space-y-3">
                        <Select
                            label={tr("Ingredient")}
                            placeholder={tr("Select an ingredient")}
                            selectedKeys={ingredientSelectedKeys}
                            onSelectionChange={(keys) => {
                                setIngredientId(String(Array.from(keys)[0] || ""));
                                setError("");
                            }}
                            disableAnimation
                            maxListboxHeight={320}
                            classNames={{
                                base: "!w-full !text-left",
                                trigger: "!w-full !text-left",
                                label: "!w-full !text-left",
                                value: "!text-slate-900 dark:!text-slate-100",
                            }}
                        >
                            {ingredients.map((item) => (
                                <SelectItem key={item.id.toString()} textValue={item.name}>
                                    <div className="flex w-full items-center justify-between">
                                        <span className="font-medium">{item.name}</span>
                                        <span className="text-xs text-default-500">
                                            {item.current_stock.toFixed(3)} {item.unit}{" "}
                                            {tr("available")}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </Select>
                        <Input
                            label={tr("Amount to move")}
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={quantity}
                            onValueChange={(value) => {
                                setQuantity(value);
                                setError("");
                            }}
                            endContent={selected && <Chip size="sm">{selected.unit}</Chip>}
                            isInvalid={!!error}
                            errorMessage={error}
                        />
                        <Textarea
                            label={tr("Notes (optional)")}
                            value={notes}
                            onValueChange={setNotes}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={() => setIsOpen(false)}>
                            {tr("Cancel")}
                        </Button>
                        <Button color="primary" onPress={submit} isLoading={isPending}>
                            {tr("Move to Kitchen")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
