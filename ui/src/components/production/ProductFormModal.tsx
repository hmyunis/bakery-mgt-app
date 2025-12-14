import { useState, useEffect, useRef } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Textarea,
    Switch,
    Avatar,
} from "@heroui/react";
import { Upload, X } from "lucide-react";
import type { Product, CreateProductData, UpdateProductData } from "../../types/production";
import { useCreateProduct, useUpdateProduct } from "../../hooks/useProduction";

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product | null;
}

// Get base URL without /api/v1 for image URLs
const getBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl) {
        return envUrl.replace(/\/api\/v1$/, "");
    }
    return "http://localhost:8001";
};
const API_BASE_URL = getBaseUrl();

export function ProductFormModal({ isOpen, onClose, product }: ProductFormModalProps) {
    const isEdit = !!product;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        selling_price: "",
        is_active: true,
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageRemoved, setImageRemoved] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct();
    const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct();

    const isLoading = isCreating || isUpdating;

    // Reset form when modal opens/closes or product changes
    useEffect(() => {
        if (isOpen) {
            if (product) {
                setFormData({
                    name: product.name || "",
                    description: product.description || "",
                    selling_price: product.selling_price?.toString() || "",
                    is_active: product.is_active ?? true,
                });
                if (product.image) {
                    const imageUrl = product.image.startsWith("http")
                        ? product.image
                        : `${API_BASE_URL}${product.image}`;
                    setImagePreview(imageUrl);
                } else {
                    setImagePreview(null);
                }
                setImageFile(null);
                setImageRemoved(false);
            } else {
                setFormData({
                    name: "",
                    description: "",
                    selling_price: "",
                    is_active: true,
                });
                setImageFile(null);
                setImagePreview(null);
                setImageRemoved(false);
            }
            setErrors({});
        }
    }, [isOpen, product]);

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImageRemoved(false); // Reset removal flag when new image is selected
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageRemoved(true); // Mark that image was intentionally removed
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Name is required";
        }

        if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
            newErrors.selling_price = "Selling price must be greater than 0";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            if (isEdit && product) {
                const updateData: UpdateProductData = {
                    name: formData.name,
                    description: formData.description || undefined,
                    selling_price: parseFloat(formData.selling_price),
                    is_active: formData.is_active,
                    // If image was removed, send null. If new file uploaded, send file. Otherwise undefined (no change).
                    image: imageRemoved ? null : imageFile || undefined,
                };
                await updateProduct({ id: product.id, data: updateData });
            } else {
                const createData: CreateProductData = {
                    name: formData.name,
                    description: formData.description || undefined,
                    selling_price: parseFloat(formData.selling_price),
                    is_active: formData.is_active,
                    image: imageFile || undefined,
                };
                await createProduct(createData);
            }
            onClose();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    {isEdit ? "Edit Product" : "Create Product"}
                </ModalHeader>
                <ModalBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Name"
                                placeholder="e.g., Burger Bread, Sponge Cake"
                                value={formData.name}
                                onValueChange={(value) => handleInputChange("name", value)}
                                errorMessage={errors.name}
                                isInvalid={!!errors.name}
                                isRequired
                                classNames={{
                                    input: "!text-zinc-900 dark:!text-zinc-100",
                                    inputWrapper: "!placeholder:text-zinc-400 dark:!placeholder:text-zinc-500",
                                }}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <Textarea
                                label="Description"
                                placeholder="Product description..."
                                value={formData.description}
                                onValueChange={(value) => handleInputChange("description", value)}
                                minRows={2}
                                classNames={{
                                    input: "!text-zinc-900 dark:!text-zinc-100",
                                    inputWrapper: "!placeholder:text-zinc-400 dark:!placeholder:text-zinc-500",
                                }}
                            />
                        </div>

                        <Input
                            label="Selling Price (ETB)"
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.selling_price}
                            onValueChange={(value) => handleInputChange("selling_price", value)}
                            errorMessage={errors.selling_price}
                            isInvalid={!!errors.selling_price}
                            isRequired
                            classNames={{
                                input: "!text-zinc-900 dark:!text-zinc-100",
                                inputWrapper: "!placeholder:text-zinc-400 dark:!placeholder:text-zinc-500",
                            }}
                        />

                        <div className="flex items-end">
                            <Switch
                                isSelected={formData.is_active}
                                onValueChange={(value) => handleInputChange("is_active", value)}
                            >
                                Active
                            </Switch>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Product Image</label>
                            <div className="flex items-center gap-4">
                                {imagePreview ? (
                                    <div className="relative">
                                        <Avatar
                                            src={imagePreview}
                                            className="h-24 w-24"
                                        />
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="flat"
                                            color="danger"
                                            className="absolute -top-2 -right-2"
                                            onPress={handleRemoveImage}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="h-24 w-24 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center justify-center">
                                        <Upload className="h-8 w-8 text-zinc-400" />
                                    </div>
                                )}
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        id="product-image-input"
                                    />
                                    <Button
                                        as="label"
                                        htmlFor="product-image-input"
                                        variant="flat"
                                        startContent={<Upload className="h-4 w-4" />}
                                    >
                                        {imagePreview ? "Change Image" : "Upload Image"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="light"
                        onPress={onClose}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        Cancel
                    </Button>
                    <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
                        {isEdit ? "Update" : "Create"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

