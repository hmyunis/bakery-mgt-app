import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from "@heroui/react";
import type { Product } from "../../types/production";
import { useDeleteProduct } from "../../hooks/useProduction";

interface DeleteProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

export function DeleteProductModal({
    isOpen,
    onClose,
    product,
}: DeleteProductModalProps) {
    const { mutateAsync: deleteProduct, isPending: isDeleting } = useDeleteProduct();

    const handleDelete = async () => {
        if (!product) return;

        try {
            await deleteProduct(product.id);
            onClose();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">Delete Product</ModalHeader>
                <ModalBody>
                    <p>
                        Are you sure you want to delete <strong>{product?.name}</strong>? This
                        action cannot be undone.
                    </p>
                    {product && product.stock_quantity > 0 && (
                        <p className="text-warning text-sm mt-2">
                            Warning: This product has {product.stock_quantity} units in stock.
                        </p>
                    )}
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

