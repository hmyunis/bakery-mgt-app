import { tr } from "../../locales";
import { useMemo, useState } from "react";
import {
    Button,
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
import { ArrowRight, History, PackagePlus, Search, Warehouse } from "lucide-react";
import {
    useCreateKitchenTransfer,
    useIngredients,
    useKitchenTransfers,
} from "../../hooks/useInventory";

export function KitchenStoreTab({ canRestock }: { canRestock: boolean }) {
    const [search, setSearch] = useState("");
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
    const selected = ingredients.find((item) => item.id.toString() === ingredientId);

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    aria-label={tr("Search kitchen ingredients")}
                    placeholder={tr("Search ingredients...")}
                    value={search}
                    onValueChange={setSearch}
                    isClearable
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

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="grid grid-cols-[minmax(140px,1fr)_110px_110px_90px] gap-3 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60">
                    <span>{tr("Ingredient")}</span>
                    <span className="text-right">{tr("Storehouse")}</span>
                    <span className="text-right">{tr("Kitchen")}</span>
                    <span />
                </div>
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Spinner />
                    </div>
                ) : filtered.length ? (
                    filtered.map((item) => (
                        <div
                            key={item.id}
                            className="grid grid-cols-[minmax(140px,1fr)_110px_110px_90px] items-center gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800"
                        >
                            <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {item.name}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {tr("Measured in")}
                                    {item.unit}
                                </p>
                            </div>
                            <span className="text-right text-sm">
                                {item.current_stock.toFixed(3)}
                            </span>
                            <span className="text-right font-semibold text-primary">
                                {item.kitchen_stock.toFixed(3)}
                            </span>
                            <div className="text-right">
                                {canRestock && (
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={() => openTransfer(item.id)}
                                    >
                                        {tr("Move")}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="py-10 text-center text-sm text-zinc-500">
                        {tr("No ingredients found.")}
                    </p>
                )}
            </div>

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

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <ModalContent>
                    <ModalHeader>{tr("Restock Kitchen Store")}</ModalHeader>
                    <ModalBody className="space-y-3">
                        <Select
                            label={tr("Ingredient")}
                            selectedKeys={ingredientId ? [ingredientId] : []}
                            onSelectionChange={(keys) => {
                                setIngredientId(String(Array.from(keys)[0] || ""));
                                setError("");
                            }}
                            classNames={{
                                base: "!w-full !text-left",
                                trigger: "!w-full !text-left",
                                label: "!w-full !text-left",
                                value: "!text-slate-900 dark:!text-slate-100",
                            }}
                        >
                            {ingredients.map((item) => (
                                <SelectItem key={item.id.toString()}>
                                    {item.name} · {item.current_stock.toFixed(3)} {item.unit}{" "}
                                    {tr("available")}
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
