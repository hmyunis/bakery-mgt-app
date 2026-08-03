import { useMemo, useState } from "react";
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
} from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import type { CreateRecipeData, Recipe, UpdateRecipeData } from "../../types/production";
import { useIngredients } from "../../hooks/useInventory";
import {
    useCreateRecipe,
    useProducts,
    useProductsWithRecipes,
    useUpdateRecipe,
} from "../../hooks/useProduction";

interface RecipeBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    recipe?: Recipe | null;
    preselectedProductId?: number | null;
}

interface IngredientRow {
    key: number;
    ingredient: string;
    quantity: string;
}

const emptyRow = (key: number): IngredientRow => ({ key, ingredient: "", quantity: "" });

export function RecipeBuilder({
    isOpen,
    onClose,
    recipe,
    preselectedProductId,
}: RecipeBuilderProps) {
    const [product, setProduct] = useState("");
    const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([emptyRow(0)]);
    const [expectedOutput, setExpectedOutput] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formKey, setFormKey] = useState("");
    const [nextRowKey, setNextRowKey] = useState(1);

    const currentKey = `${isOpen}-${recipe?.id || "new"}-${preselectedProductId || "none"}`;
    if (currentKey !== formKey) {
        const rows = recipe?.items.length
            ? recipe.items.map((item, index) => ({
                  key: index,
                  ingredient: item.ingredient.toString(),
                  quantity: item.quantity.toString(),
              }))
            : [emptyRow(0)];
        setFormKey(currentKey);
        setProduct(recipe?.product?.toString() || preselectedProductId?.toString() || "");
        setIngredientRows(rows);
        setNextRowKey(rows.length);
        setExpectedOutput(recipe?.standard_yield.toString() || "");
        setErrors({});
    }

    const { data: productsData } = useProducts({ page_size: 100 });
    const { data: ingredientsData } = useIngredients({ page_size: 100 });
    const { data: configuredIds } = useProductsWithRecipes();
    const { mutateAsync: createEstimate, isPending: isCreating } = useCreateRecipe();
    const { mutateAsync: updateEstimate, isPending: isUpdating } = useUpdateRecipe();

    const products = useMemo(() => {
        const configured = Array.isArray(configuredIds) ? configuredIds : [];
        return (productsData?.results || []).filter(
            (item) => !configured.includes(item.id) || item.id === recipe?.product
        );
    }, [configuredIds, productsData, recipe?.product]);
    const ingredients = ingredientsData?.results || [];

    const updateRow = (key: number, changes: Partial<IngredientRow>) => {
        setIngredientRows((rows) =>
            rows.map((row) => (row.key === key ? { ...row, ...changes } : row))
        );
    };

    const addRow = () => {
        setIngredientRows((rows) => [...rows, emptyRow(nextRowKey)]);
        setNextRowKey((key) => key + 1);
    };

    const removeRow = (key: number) => {
        setIngredientRows((rows) => rows.filter((row) => row.key !== key));
    };

    const submit = async () => {
        const nextErrors: Record<string, string> = {};
        if (!product) nextErrors.product = "Product is required";
        if (!expectedOutput || Number(expectedOutput) <= 0) {
            nextErrors.expectedOutput = "Expected batch output must be greater than 0";
        }
        const selectedIds = ingredientRows.map((row) => row.ingredient).filter(Boolean);
        ingredientRows.forEach((row) => {
            if (!row.ingredient) nextErrors[`ingredient-${row.key}`] = "Choose an ingredient";
            if (!row.quantity || Number(row.quantity) <= 0) {
                nextErrors[`quantity-${row.key}`] = "Enter an amount greater than 0";
            }
        });
        if (new Set(selectedIds).size !== selectedIds.length) {
            nextErrors.ingredients = "Each ingredient can only be added once";
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;

        const data: CreateRecipeData = {
            product: Number(product),
            instructions: "",
            standard_yield: Number(expectedOutput),
            items: ingredientRows.map((row) => ({
                ingredient: Number(row.ingredient),
                quantity: Number(row.quantity),
            })),
        };
        if (recipe) {
            await updateEstimate({ id: recipe.id, data: data as UpdateRecipeData });
        } else {
            await createEstimate(data);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader>
                    {recipe ? "Edit Batch Estimate" : "Create Batch Estimate"}
                </ModalHeader>
                <ModalBody className="space-y-5">
                    <Alert color="primary" variant="flat">
                        Enter one familiar full batch—for example, the flour, salt, and water used
                        together to make 200 breads. There is no need to calculate one bread.
                    </Alert>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Select
                            label="Product"
                            selectedKeys={product ? [product] : []}
                            onSelectionChange={(keys) =>
                                setProduct(String(Array.from(keys)[0] || ""))
                            }
                            isInvalid={!!errors.product}
                            errorMessage={errors.product}
                            isDisabled={!!preselectedProductId}
                            classNames={{
                                base: "!w-full !text-left",
                                trigger: "!w-full !text-left",
                                label: "!w-full !text-left",
                                value: "!text-slate-900 dark:!text-slate-100",
                            }}
                        >
                            {products.map((item) => (
                                <SelectItem key={item.id.toString()}>{item.name}</SelectItem>
                            ))}
                        </Select>
                        <Input
                            label="This full batch usually makes"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={expectedOutput}
                            onValueChange={setExpectedOutput}
                            endContent={<span className="text-sm text-zinc-500">pcs</span>}
                            isInvalid={!!errors.expectedOutput}
                            errorMessage={errors.expectedOutput}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="font-medium">Ingredients for this full batch</p>
                                <p className="text-sm text-zinc-500">
                                    Use the totals the kitchen team already works with.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="flat"
                                startContent={<Plus size={16} />}
                                onPress={addRow}
                            >
                                Add ingredient
                            </Button>
                        </div>
                        {ingredientRows.map((row, index) => {
                            const selectedIngredient = ingredients.find(
                                (item) => item.id.toString() === row.ingredient
                            );
                            return (
                                <div
                                    key={row.key}
                                    className="grid grid-cols-1 items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                                >
                                    <Select
                                        label={`Ingredient ${index + 1}`}
                                        selectedKeys={row.ingredient ? [row.ingredient] : []}
                                        onSelectionChange={(keys) =>
                                            updateRow(row.key, {
                                                ingredient: String(Array.from(keys)[0] || ""),
                                            })
                                        }
                                        isInvalid={!!errors[`ingredient-${row.key}`]}
                                        errorMessage={errors[`ingredient-${row.key}`]}
                                        classNames={{
                                            base: "!w-full !min-w-0 !text-left",
                                            trigger: "!w-full !text-left",
                                            label: "!w-full !text-left",
                                            value: "!text-slate-900 dark:!text-slate-100",
                                        }}
                                    >
                                        {ingredients.map((item) => (
                                            <SelectItem key={item.id.toString()}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </Select>
                                    <Input
                                        label="Amount for the full batch"
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={row.quantity}
                                        onValueChange={(quantity) =>
                                            updateRow(row.key, { quantity })
                                        }
                                        endContent={
                                            selectedIngredient && (
                                                <Chip size="sm">{selectedIngredient.unit}</Chip>
                                            )
                                        }
                                        isInvalid={!!errors[`quantity-${row.key}`]}
                                        errorMessage={errors[`quantity-${row.key}`]}
                                    />
                                    <Button
                                        isIconOnly
                                        aria-label={`Remove ingredient ${index + 1}`}
                                        color="danger"
                                        variant="light"
                                        className="mt-2"
                                        isDisabled={ingredientRows.length === 1}
                                        onPress={() => removeRow(row.key)}
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            );
                        })}
                        {errors.ingredients && (
                            <p className="text-sm text-danger">{errors.ingredients}</p>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="flat" onPress={onClose}>
                        Cancel
                    </Button>
                    <Button color="primary" onPress={submit} isLoading={isCreating || isUpdating}>
                        {recipe ? "Save Estimate" : "Create Estimate"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
