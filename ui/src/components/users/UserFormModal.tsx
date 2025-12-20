import { useState } from "react";
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
    Avatar,
    Switch,
} from "@heroui/react";
import { User as UserIcon } from "lucide-react";
import { VALID_ROLES, type UserRole } from "../../constants/roles";
import { type User, type CreateUserData, type UpdateUserData } from "../../services/userService";

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>;
    user?: User | null;
    isLoading?: boolean;
}

type UserFormData = CreateUserData | UpdateUserData;

// Internal component handling form logic and state
// Mounts freshly when the modal opens due to the key prop in the parent
function UserFormContent({
    user,
    onSubmit,
    onClose,
    isLoading,
}: {
    user?: User | null;
    onSubmit: (data: UserFormData) => Promise<void>;
    onClose: () => void;
    isLoading: boolean;
}) {
    const isEdit = !!user;

    // Initialize state directly from props
    const [formData, setFormData] = useState({
        username: user?.username || "",
        fullName: user?.fullName || "",
        email: user?.email || "",
        phoneNumber: user?.phoneNumber || "",
        role: user?.role || ("cashier" as UserRole),
        address: user?.address || "",
        password: "",
        confirmPassword: "",
        isActive: user?.isActive ?? true,
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
    const [avatarRemoved, setAvatarRemoved] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                setErrors((prev) => ({
                    ...prev,
                    avatar: "Please select an image file",
                }));
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setErrors((prev) => ({
                    ...prev,
                    avatar: "Image size must be less than 5MB",
                }));
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
            setAvatarRemoved(false); // Reset removal flag when new file is selected
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors.avatar;
                return newErrors;
            });
        }
    };

    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
        setAvatarRemoved(true);
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.username.trim()) {
            newErrors.username = "Username is required";
        }

        if (!isEdit && !formData.password) {
            newErrors.password = "Password is required";
        }

        if (formData.password && formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            if (isEdit) {
                const updateData: UpdateUserData = {
                    username: formData.username,
                    fullName: formData.fullName || undefined,
                    email: formData.email || undefined,
                    phoneNumber: formData.phoneNumber || undefined,
                    role: formData.role,
                    address: formData.address || undefined,
                    isActive: formData.isActive,
                    ...(formData.password && {
                        password: formData.password,
                        confirmPassword: formData.confirmPassword,
                    }),
                };

                // Handle avatar: if user had avatar and we removed it, send null
                // If we uploaded a new file, send the file
                // Otherwise, don't include it (keeps current)
                if (avatarFile) {
                    updateData.avatar = avatarFile;
                } else if (avatarRemoved && user?.avatar) {
                    // User had avatar and explicitly removed it
                    updateData.avatar = null;
                }

                await onSubmit(updateData as UserFormData);
            } else {
                const createData: CreateUserData = {
                    username: formData.username,
                    fullName: formData.fullName || undefined,
                    email: formData.email || undefined,
                    phoneNumber: formData.phoneNumber || undefined,
                    role: formData.role,
                    address: formData.address || undefined,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword,
                    avatar: avatarFile || undefined,
                };
                await onSubmit(createData as UserFormData);
            }
            onClose();
        } catch {
            // Error handling is done in the parent/hook
        }
    };

    return (
        <>
            <ModalHeader>{isEdit ? "Edit User" : "Create New User"}</ModalHeader>
            <ModalBody className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center pt-4">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        id="avatar-upload"
                    />
                    <Avatar
                        src={avatarPreview || undefined}
                        fallback={
                            formData.fullName
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("") ||
                            formData.username?.[0] || <UserIcon className="size-12" />
                        }
                        className="w-24 h-24 text-4xl cursor-pointer"
                        onClick={() => document.getElementById("avatar-upload")?.click()}
                    />
                    <div className="flex gap-2 mt-2">
                        <Button
                            variant="light"
                            size="sm"
                            color="primary"
                            onPress={() => document.getElementById("avatar-upload")?.click()}
                        >
                            Change Photo
                        </Button>
                        {isEdit && (avatarPreview || user?.avatar) && (
                            <Button
                                variant="light"
                                size="sm"
                                color="danger"
                                onPress={handleRemoveAvatar}
                            >
                                Remove
                            </Button>
                        )}
                    </div>
                    {errors.avatar && <p className="text-sm text-danger mt-1">{errors.avatar}</p>}
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Full Name"
                        value={formData.fullName}
                        onValueChange={(v) => handleInputChange("fullName", v)}
                        isRequired
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                    <Input
                        label="Email (optional)"
                        type="email"
                        value={formData.email}
                        onValueChange={(v) => handleInputChange("email", v)}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                    <Input
                        label="Username"
                        value={formData.username}
                        onValueChange={(v) => handleInputChange("username", v)}
                        isRequired
                        isInvalid={!!errors.username}
                        errorMessage={errors.username}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                    <Input
                        label="Phone Number"
                        value={formData.phoneNumber}
                        onValueChange={(v) => handleInputChange("phoneNumber", v)}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                    <Input
                        label="Address (Optional)"
                        value={formData.address}
                        onValueChange={(v) => handleInputChange("address", v)}
                        placeholder="e.g., 2nd Floor, Room 201"
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                    <Select
                        label="Role"
                        selectedKeys={[formData.role]}
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as UserRole;
                            if (selected) handleInputChange("role", selected);
                        }}
                        isRequired
                        classNames={{
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            base: "!w-full !text-left",
                            value: "!text-slate-900 dark:!text-slate-100",
                        }}
                    >
                        {VALID_ROLES.map((role) => (
                            <SelectItem key={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                            </SelectItem>
                        ))}
                    </Select>

                    {!isEdit && (
                        <>
                            <Input
                                label="Password"
                                type="password"
                                value={formData.password}
                                onValueChange={(v) => handleInputChange("password", v)}
                                isRequired
                                placeholder="Minimum 8 characters"
                                isInvalid={!!errors.password}
                                errorMessage={errors.password}
                                classNames={{
                                    input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                }}
                            />
                            <Input
                                label="Confirm Password"
                                type="password"
                                value={formData.confirmPassword}
                                onValueChange={(v) => handleInputChange("confirmPassword", v)}
                                isRequired
                                placeholder="Confirm password"
                                isInvalid={!!errors.confirmPassword}
                                errorMessage={errors.confirmPassword}
                                classNames={{
                                    input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                }}
                            />
                        </>
                    )}
                    {isEdit && (
                        <div className="flex items-center pt-4 sm:col-span-2">
                            <Switch
                                isSelected={formData.isActive}
                                onValueChange={(v) => handleInputChange("isActive", v)}
                            >
                                User Active
                            </Switch>
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant="flat" onPress={onClose} disabled={isLoading}>
                    Cancel
                </Button>
                <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
                    {isEdit ? "Save Changes" : "Create User"}
                </Button>
            </ModalFooter>
        </>
    );
}

export function UserFormModal({
    isOpen,
    onClose,
    onSubmit,
    user,
    isLoading = false,
}: UserFormModalProps) {
    // Generate a unique key based on the mode (create vs edit) and user ID
    // This forces the form content to unmount and remount when the target user changes,
    // ensuring the state is always initialized with the correct data.
    const formKey = user ? `edit-${user.id}` : "create-new";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur">
            <ModalContent className="max-h-screen overflow-y-auto">
                {(onCloseModal) => (
                    <UserFormContent
                        key={formKey}
                        user={user}
                        onSubmit={onSubmit}
                        onClose={onCloseModal}
                        isLoading={isLoading}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
