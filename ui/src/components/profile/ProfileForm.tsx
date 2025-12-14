import React from "react";
import { User, Save } from "lucide-react";
import { Card, CardBody, Input } from "@heroui/react";
import { Button } from "@heroui/button";
import type { UserProfile } from "../../services/authService";

interface ProfileFormProps {
    isEditing: boolean;
    editForm: Partial<UserProfile>;
    setEditForm: React.Dispatch<React.SetStateAction<Partial<UserProfile>>>;
    passwordForm: { oldPassword: string; newPassword: string };
    setPasswordForm: React.Dispatch<
        React.SetStateAction<{ oldPassword: string; newPassword: string }>
    >;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    isLoading: boolean;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
    isEditing,
    editForm,
    setEditForm,
    passwordForm,
    setPasswordForm,
    onEdit,
    onSave,
    onCancel,
    isLoading,
}) => {
    return (
        <Card className="lg:col-span-2 shadow-warm border border-zinc-200 dark:border-zinc-800">
            <CardBody className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        Personal Information
                    </h3>
                    {!isEditing ? (
                        <Button onPress={onEdit} color="primary" startContent={<User className="h-4 w-4" />}>
                            Edit Profile
                        </Button>
                    ) : (
                        <div className="space-x-2">
                            <Button
                                variant="flat"
                                onPress={onCancel}
                                disabled={isLoading}
                                className="!text-zinc-700 dark:!text-zinc-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                onPress={onSave}
                                disabled={isLoading}
                                color="primary"
                                startContent={<Save className="h-4 w-4" />}
                            >
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="fullName" className="text-sm font-medium">
                                Full Name
                            </label>
                            <Input
                                id="fullName"
                                value={editForm.fullName || ""}
                                onValueChange={(value) =>
                                    setEditForm((p) => ({ ...p, fullName: value }))
                                }
                                disabled={!isEditing || isLoading}
                                className={!isEditing ? "bg-muted" : ""}
                                classNames={{
                                    input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email Address
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={editForm.email || ""}
                                onValueChange={(value) =>
                                    setEditForm((p) => ({ ...p, email: value }))
                                }
                                disabled={!isEditing || isLoading}
                                className={!isEditing ? "bg-muted" : ""}
                                classNames={{
                                    input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="phoneNumber" className="text-sm font-medium">
                                Phone Number
                            </label>
                            <Input
                                id="phoneNumber"
                                value={editForm.phoneNumber || ""}
                                onValueChange={(value) =>
                                    setEditForm((p) => ({ ...p, phoneNumber: value }))
                                }
                                disabled={!isEditing || isLoading}
                                className={!isEditing ? "bg-muted" : ""}
                                classNames={{
                                    input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm font-medium">
                                Username
                            </label>
                            <Input
                                id="username"
                                value={editForm.username || ""}
                                onValueChange={(value) =>
                                    setEditForm((p) => ({ ...p, username: value }))
                                }
                                disabled={!isEditing || isLoading}
                                className={!isEditing ? "bg-muted" : ""}
                                classNames={{
                                    input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="role" className="text-sm font-medium">
                                Role
                            </label>
                            <Input
                                id="role"
                                value={editForm.role || ""}
                                disabled
                                className="bg-muted capitalize"
                                classNames={{
                                    input: "!text-slate-900 dark:!text-slate-100",
                                }}
                            />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="pt-4 border-t">
                            <h4 className="font-medium mb-4">Change Password</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="current-password" className="text-sm font-medium">
                                        Current Password
                                    </label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        disabled={isLoading}
                                        value={passwordForm.oldPassword}
                                        onValueChange={(value) =>
                                            setPasswordForm((p) => ({
                                                ...p,
                                                oldPassword: value,
                                            }))
                                        }
                                        placeholder="Enter current password"
                                        classNames={{
                                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="new-password" className="text-sm font-medium">
                                        New Password
                                    </label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        disabled={isLoading}
                                        value={passwordForm.newPassword}
                                        onValueChange={(value) =>
                                            setPasswordForm((p) => ({
                                                ...p,
                                                newPassword: value,
                                            }))
                                        }
                                        placeholder="Enter new password"
                                        classNames={{
                                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};
