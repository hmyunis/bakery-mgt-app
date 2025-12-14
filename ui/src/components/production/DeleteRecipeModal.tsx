import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from "@heroui/react";
import type { Recipe } from "../../types/production";
import { useDeleteRecipe } from "../../hooks/useProduction";

interface DeleteRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipe: Recipe | null;
}

export function DeleteRecipeModal({
    isOpen,
    onClose,
    recipe,
}: DeleteRecipeModalProps) {
    const { mutateAsync: deleteRecipe, isPending: isDeleting } = useDeleteRecipe();

    const handleDelete = async () => {
        if (!recipe) return;

        try {
            await deleteRecipe(recipe.id);
            onClose();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">Delete Recipe</ModalHeader>
                <ModalBody>
                    <p>
                        Are you sure you want to delete this recipe? This action cannot be undone.
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="light"
                        onPress={onClose}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        Cancel
                    </Button>
                    <Button color="danger" onPress={handleDelete} isLoading={isDeleting}>
                        Delete
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

