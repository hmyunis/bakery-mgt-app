import { tr } from "../../locales";
import { useMemo, useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Select,
    SelectItem,
    Textarea,
    Chip,
} from "@heroui/react";
import { ArrowRight, Warehouse } from "lucide-react";
import { useCreateKitchenTransfer, useIngredients } from "../../hooks/useInventory";
import type { Ingredient } from "../../types/inventory";
import { toast } from "sonner";

interface DispenseModalContentProps {
    onClose: () => void;
    preselectedIngredient?: Ingredient | null;
}

function DispenseModalContent({ onClose, preselectedIngredient }: DispenseModalContentProps) {
    const [selectedIngredientId, setSelectedIngredientId] = useState<string>(
        preselectedIngredient ? String(preselectedIngredient.id) : ""
    );
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");

    const { data: ingredientData, isLoading: isLoadingIngredients } = useIngredients({
        page_size: 100,
    });
    const { mutateAsync: createTransfer, isPending } = useCreateKitchenTransfer();

    const ingredients = useMemo(() => ingredientData?.results || [], [ingredientData]);

    const activeIngredient = useMemo(() => {
        if (preselectedIngredient && String(preselectedIngredient.id) === selectedIngredientId) {
            return (
                ingredients.find((i) => i.id === preselectedIngredient.id) || preselectedIngredient
            );
        }
        return (
            ingredients.find((i) => String(i.id) === selectedIngredientId) ||
            preselectedIngredient ||
            null
        );
    }, [ingredients, preselectedIngredient, selectedIngredientId]);

    const currentStock = activeIngredient?.current_stock ?? 0;
    const kitchenStock = activeIngredient?.kitchen_stock ?? 0;
    const unit = activeIngredient?.unit ?? "";
    const ingredientSelectedKeys = useMemo(
        () => (activeIngredient ? [String(activeIngredient.id)] : []),
        [activeIngredient]
    );

    const handleQuickAmount = (amount: number) => {
        const capped = Math.min(amount, currentStock);
        setQuantity(capped.toString());
        setError("");
    };

    const handleMaxAmount = () => {
        if (currentStock > 0) {
            setQuantity(currentStock.toString());
            setError("");
        }
    };

    const handleSubmit = async () => {
        if (!activeIngredient) {
            setError(tr("Please select an ingredient."));
            return;
        }

        const amount = Number.parseFloat(quantity);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError(tr("Please enter a valid quantity greater than 0."));
            return;
        }

        if (amount > currentStock) {
            setError(
                `${tr("Cannot transfer more than available in storehouse")} (${currentStock.toFixed(3)} ${unit}).`
            );
            return;
        }

        try {
            await createTransfer({
                ingredient: activeIngredient.id,
                quantity: amount,
                notes: notes.trim(),
            });
            toast.success(
                `${tr("Transferred")} ${amount} ${unit} ${tr("of")} ${activeIngredient.name} ${tr("to kitchen.")}`
            );
            onClose();
        } catch {
            // Error handled by mutation toast
        }
    };

    return (
        <>
            <ModalHeader className="flex items-center gap-2 border-b border-divider">
                <Warehouse className="h-5 w-5 text-secondary" />
                <span className="font-semibold">{tr("Transfer to Kitchen")}</span>
            </ModalHeader>

            <ModalBody className="py-4 space-y-4">
                {/* Ingredient selection */}
                <div>
                    <Select
                        label={tr("Ingredient")}
                        placeholder={tr("Select an ingredient to transfer")}
                        selectedKeys={ingredientSelectedKeys}
                        onSelectionChange={(keys) => {
                            const key = Array.from(keys)[0];
                            setSelectedIngredientId(key ? String(key) : "");
                            setError("");
                        }}
                        isLoading={isLoadingIngredients}
                        variant="bordered"
                        isRequired
                        disableAnimation
                        maxListboxHeight={320}
                        classNames={{
                            base: "!w-full !text-left",
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            value: "!text-slate-900 dark:!text-slate-100",
                        }}
                    >
                        {ingredients.map((ing) => (
                            <SelectItem key={String(ing.id)} textValue={ing.name}>
                                <div className="flex justify-between items-center w-full">
                                    <span className="font-medium">{ing.name}</span>
                                    <span className="text-xs text-default-500">
                                        {ing.current_stock.toFixed(2)} {ing.unit} {tr("available")}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </Select>
                </div>

                {/* Stock balances card */}
                {activeIngredient && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-default-100 dark:bg-default-50/10 border border-default-200">
                        <div className="space-y-1">
                            <div className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                                {tr("Storehouse Stock")}
                            </div>
                            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {currentStock.toFixed(3)}{" "}
                                <span className="text-sm font-normal text-default-500">{unit}</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                                {tr("Kitchen Stock")}
                            </div>
                            <div className="text-lg font-bold text-secondary">
                                {kitchenStock.toFixed(3)}{" "}
                                <span className="text-sm font-normal text-default-500">{unit}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quantity Input */}
                <div className="space-y-2">
                    <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max={currentStock > 0 ? currentStock : undefined}
                        label={tr("Transfer Quantity")}
                        placeholder="0.000"
                        value={quantity}
                        onValueChange={(val) => {
                            setQuantity(val);
                            setError("");
                        }}
                        endContent={
                            <span className="text-xs text-default-400 font-semibold">{unit}</span>
                        }
                        variant="bordered"
                        isRequired
                        isInvalid={!!error}
                        errorMessage={error}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 text-base font-semibold",
                        }}
                    />

                    {activeIngredient && currentStock > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-xs text-default-400 mr-1">
                                {tr("Quick fill:")}
                            </span>
                            {[1, 5, 10, 25]
                                .filter((amt) => amt < currentStock)
                                .map((amt) => (
                                    <Chip
                                        key={amt}
                                        size="sm"
                                        variant="flat"
                                        className="cursor-pointer hover:bg-default-200 transition-colors"
                                        onClick={() => handleQuickAmount(amt)}
                                    >
                                        +{amt} {unit}
                                    </Chip>
                                ))}
                            <Chip
                                size="sm"
                                color="secondary"
                                variant="flat"
                                className="cursor-pointer hover:opacity-80 transition-opacity font-medium"
                                onClick={handleMaxAmount}
                            >
                                {tr("All / Max")} ({currentStock.toFixed(1)})
                            </Chip>
                        </div>
                    )}
                </div>

                {/* Notes */}
                <Textarea
                    label={tr("Notes (Optional)")}
                    placeholder={tr("e.g., Requested for daily bread production")}
                    value={notes}
                    onValueChange={setNotes}
                    minRows={2}
                    variant="bordered"
                    classNames={{
                        input: "!text-slate-900 dark:!text-slate-100",
                    }}
                />

                {/* Visual flow indicator */}
                {activeIngredient && Number(quantity) > 0 && (
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary-50 dark:bg-secondary-900/20 text-secondary-800 dark:text-secondary-200">
                        <span>
                            {tr("Storehouse")}: {(currentStock - Number(quantity)).toFixed(3)}{" "}
                            {unit}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>
                            {tr("Kitchen")}: {(kitchenStock + Number(quantity)).toFixed(3)} {unit}
                        </span>
                    </div>
                )}
            </ModalBody>

            <ModalFooter className="border-t border-divider">
                <Button variant="light" onPress={onClose}>
                    {tr("Cancel")}
                </Button>
                <Button
                    color="secondary"
                    onPress={handleSubmit}
                    isLoading={isPending}
                    isDisabled={!activeIngredient || currentStock <= 0}
                    startContent={<ArrowRight className="h-4 w-4" />}
                >
                    {tr("Transfer to Kitchen")}
                </Button>
            </ModalFooter>
        </>
    );
}

interface DispenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedIngredient?: Ingredient | null;
}

export function DispenseModal({ isOpen, onClose, preselectedIngredient }: DispenseModalProps) {
    const formKey = preselectedIngredient ? `dispense-${preselectedIngredient.id}` : "dispense-new";

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={(open) => !open && onClose()}
            backdrop="blur"
            size="lg"
        >
            <ModalContent>
                {(onCloseModal) => (
                    <DispenseModalContent
                        key={formKey}
                        preselectedIngredient={preselectedIngredient}
                        onClose={onCloseModal}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
