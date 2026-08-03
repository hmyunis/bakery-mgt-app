import {
    Button,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Spinner,
} from "@heroui/react";
import { ArrowRight, Gauge } from "lucide-react";
import type { Recipe } from "../../types/production";
import { useProducts, useRecipe } from "../../hooks/useProduction";

interface RecipeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipe: Recipe | null;
    onEdit?: (recipe: Recipe) => void;
}

export function RecipeDetailModal({ isOpen, onClose, recipe, onEdit }: RecipeDetailModalProps) {
    const { data: latest, isLoading } = useRecipe(recipe?.id ?? null);
    const { data: productsData } = useProducts({ page_size: 100 });
    const estimate = latest || recipe;
    if (!estimate) return null;

    const product = productsData?.results.find((item) => item.id === estimate.product);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <ModalContent>
                <ModalHeader className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-primary" />
                    Full Batch Estimate
                </ModalHeader>
                <ModalBody>
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-500">
                                    Product
                                </p>
                                <p className="text-lg font-semibold">
                                    {product?.name || "Unknown product"}
                                </p>
                            </div>
                            {estimate.items.length ? (
                                <div className="grid grid-cols-1 items-center gap-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800 sm:grid-cols-[minmax(0,1fr)_auto_minmax(140px,0.45fr)]">
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                            Ingredients used together
                                        </p>
                                        {estimate.items.map((item) => (
                                            <div
                                                key={item.ingredient}
                                                className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900"
                                            >
                                                <span className="font-medium">
                                                    {item.ingredient_name ||
                                                        `Ingredient #${item.ingredient}`}
                                                </span>
                                                <Chip size="sm" variant="flat">
                                                    {item.quantity.toFixed(3)} {item.unit}
                                                </Chip>
                                            </div>
                                        ))}
                                    </div>
                                    <ArrowRight className="mx-auto h-5 w-5 rotate-90 text-zinc-400 sm:rotate-0" />
                                    <div className="text-center">
                                        <p className="text-3xl font-bold">
                                            {estimate.standard_yield.toFixed(2)}
                                        </p>
                                        <Chip size="sm" color="primary" variant="flat">
                                            pieces per full batch
                                        </Chip>
                                    </div>
                                </div>
                            ) : (
                                <p className="rounded-lg border border-dashed p-6 text-center text-zinc-500">
                                    No batch ingredients configured.
                                </p>
                            )}
                            <p className="text-sm text-zinc-500">
                                The kitchen records these familiar bulk amounts, not a calculated
                                one-piece recipe. Production history learns the working average from
                                what chefs actually use and produce.
                            </p>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="flat" onPress={onClose}>
                        Close
                    </Button>
                    {onEdit && (
                        <Button color="primary" onPress={() => onEdit(estimate)}>
                            Edit Estimate
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
