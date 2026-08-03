import { useState } from "react";
import {
    Alert,
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
    Textarea,
} from "@heroui/react";
import { Info } from "lucide-react";
import type { CreateProductionRunData, Product } from "../../types/production";
import { useIngredients } from "../../hooks/useInventory";
import { useCreateProductionRun, useProducts, useRecipeByProduct } from "../../hooks/useProduction";

interface ProductionRunFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedProduct?: Product | null;
}

function ProductionRunFormContent({
    preselectedProduct,
    onClose,
}: {
    preselectedProduct?: Product | null;
    onClose: () => void;
}) {
    const [product, setProduct] = useState(preselectedProduct?.id.toString() || "");
    const [quantityProduced, setQuantityProduced] = useState("");
    const [amountsUsed, setAmountsUsed] = useState<Record<number, string>>({});
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: productsData } = useProducts({ page_size: 100, is_active: true });
    const { data: ingredientsData } = useIngredients({ page_size: 100 });
    const { data: estimate } = useRecipeByProduct(product ? Number(product) : null);
    const { mutateAsync: createRun, isPending } = useCreateProductionRun();

    const ingredientsById = new Map(
        (ingredientsData?.results || []).map((ingredient) => [ingredient.id, ingredient])
    );
    const batchItems = estimate?.items || [];

    const submit = async () => {
        const nextErrors: Record<string, string> = {};
        if (!product) nextErrors.product = "Product is required";
        if (!estimate || !batchItems.length)
            nextErrors.product = "Configure a batch estimate first";
        if (!quantityProduced || Number(quantityProduced) <= 0) {
            nextErrors.quantityProduced = "Output must be greater than 0";
        }
        batchItems.forEach((item) => {
            const actual = Number(amountsUsed[item.ingredient]);
            const ingredient = ingredientsById.get(item.ingredient);
            if (!amountsUsed[item.ingredient] || actual <= 0) {
                nextErrors[`ingredient-${item.ingredient}`] = "Enter the amount actually used";
            } else if (ingredient && actual > ingredient.kitchen_stock) {
                nextErrors[`ingredient-${item.ingredient}`] =
                    `Only ${ingredient.kitchen_stock.toFixed(3)} ${ingredient.unit} is in the kitchen store`;
            }
        });
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length || !batchItems.length) return;

        const data: CreateProductionRunData = {
            product: Number(product),
            quantity_produced: Number(quantityProduced),
            usage_inputs: batchItems.map((item) => ({
                ingredient: item.ingredient,
                actual_amount: Number(amountsUsed[item.ingredient]),
            })),
            notes: notes || undefined,
        };
        await createRun(data);
        onClose();
    };

    return (
        <>
            <ModalHeader>
                {preselectedProduct
                    ? `Record Production: ${preselectedProduct.name}`
                    : "Record Baking Session"}
            </ModalHeader>
            <ModalBody className="space-y-5">
                {!preselectedProduct ? (
                    <Select
                        label="Product"
                        selectedKeys={product ? [product] : []}
                        onSelectionChange={(keys) => {
                            setProduct(String(Array.from(keys)[0] || ""));
                            setAmountsUsed({});
                        }}
                        isInvalid={!!errors.product}
                        errorMessage={errors.product}
                        classNames={{
                            base: "!w-full !text-left",
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            value: "!text-slate-900 dark:!text-slate-100",
                        }}
                    >
                        {(productsData?.results || []).map((item) => (
                            <SelectItem key={item.id.toString()}>{item.name}</SelectItem>
                        ))}
                    </Select>
                ) : (
                    <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
                        <p className="text-xs text-zinc-500">Product</p>
                        <p className="font-medium">{preselectedProduct.name}</p>
                    </div>
                )}

                {estimate && batchItems.length ? (
                    <Alert color="primary" variant="flat" icon={<Info className="h-4 w-4" />}>
                        <p className="font-medium">
                            Full batch estimate: {estimate.standard_yield.toFixed(2)} pcs
                        </p>
                        <p className="text-sm">
                            {batchItems
                                .map((item) => {
                                    const ingredient = ingredientsById.get(item.ingredient);
                                    return `${item.quantity.toFixed(3)} ${ingredient?.unit || item.unit || ""} ${ingredient?.name || item.ingredient_name || "ingredient"}`;
                                })
                                .join(" + ")}
                        </p>
                    </Alert>
                ) : product ? (
                    <Alert color="warning" variant="flat">
                        This product needs a batch estimate before production can be recorded.
                    </Alert>
                ) : null}

                <Input
                    label="Actual output from this baking session"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={quantityProduced}
                    onValueChange={setQuantityProduced}
                    endContent={<span className="text-sm text-zinc-500">pcs</span>}
                    isInvalid={!!errors.quantityProduced}
                    errorMessage={errors.quantityProduced}
                />

                {!!batchItems.length && (
                    <div className="space-y-3">
                        <div>
                            <p className="font-medium">What was actually taken from the kitchen</p>
                            <p className="text-sm text-zinc-500">
                                Enter the bulk amount used for each ingredient—no per-piece math.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {batchItems.map((item) => {
                                const ingredient = ingredientsById.get(item.ingredient);
                                const scaledEstimate =
                                    estimate && Number(quantityProduced) > 0
                                        ? (item.quantity * Number(quantityProduced)) /
                                          estimate.standard_yield
                                        : 0;
                                return (
                                    <Input
                                        key={item.ingredient}
                                        label={`${ingredient?.name || item.ingredient_name || "Ingredient"} actually used`}
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={amountsUsed[item.ingredient] || ""}
                                        onValueChange={(value) =>
                                            setAmountsUsed((current) => ({
                                                ...current,
                                                [item.ingredient]: value,
                                            }))
                                        }
                                        endContent={
                                            <Chip size="sm">{ingredient?.unit || item.unit}</Chip>
                                        }
                                        description={
                                            ingredient
                                                ? `Kitchen: ${ingredient.kitchen_stock.toFixed(3)} ${ingredient.unit}${scaledEstimate ? ` · rough amount: ${scaledEstimate.toFixed(3)} ${ingredient.unit}` : ""}`
                                                : undefined
                                        }
                                        isInvalid={!!errors[`ingredient-${item.ingredient}`]}
                                        errorMessage={errors[`ingredient-${item.ingredient}`]}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                <Textarea
                    label="Notes (optional)"
                    value={notes}
                    onValueChange={setNotes}
                    placeholder="Anything unusual about this run"
                />
            </ModalBody>
            <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                    Cancel
                </Button>
                <Button
                    color="primary"
                    onPress={submit}
                    isLoading={isPending}
                    isDisabled={!batchItems.length}
                >
                    Record Production
                </Button>
            </ModalFooter>
        </>
    );
}

export function ProductionRunFormModal({
    isOpen,
    onClose,
    preselectedProduct,
}: ProductionRunFormModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
            <ModalContent>
                {(closeModal) => (
                    <ProductionRunFormContent
                        key={`${isOpen}-${preselectedProduct?.id || "new"}`}
                        preselectedProduct={preselectedProduct}
                        onClose={closeModal}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
