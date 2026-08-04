import { tr } from "../locales";
import React, { useState } from "react";
import { Tabs, Tab, Spinner } from "@heroui/react";
import { Store, Trash2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ProfileSummaryCard } from "../components/profile/ProfileSummaryCard";
import { ProfileForm } from "../components/profile/ProfileForm";
import { PageTitle } from "../components/ui/PageTitle";
import type { UserProfile } from "../services/authService";
import { toast } from "sonner";
import type { ApiError, ApiErrorResponse } from "../types/api";
import { useAppSelector } from "../store";
import { BakerySettingsForm } from "../components/settings/BakerySettingsForm";
import { FactoryResetForm } from "../components/settings/FactoryResetForm";
import { ReportsTab } from "../components/settings/ReportsTab";
import { NotificationSettingsCard } from "../components/settings/NotificationSettingsCard";
import { BarChart3 } from "lucide-react";

const SettingsPage: React.FC = () => {
    const { user, updateProfile, isUpdatingProfile, changePassword, isChangingPassword } =
        useAuth();
    const { user: authUser } = useAppSelector((state) => state.auth);
    const isAdmin = authUser?.role === "admin";

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: "",
        newPassword: "",
    });

    const [prevUser, setPrevUser] = useState(user);

    if (user !== prevUser) {
        setPrevUser(user);
        if (user) {
            setEditForm({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                pushNotificationsEnabled: user.pushNotificationsEnabled,
            });
        }
    }

    const handleEdit = () => {
        if (user) {
            setEditForm({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                pushNotificationsEnabled: user.pushNotificationsEnabled,
            });
            setIsEditing(true);
        }
    };

    const handleCancel = () => {
        if (user) {
            setEditForm({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                pushNotificationsEnabled: user.pushNotificationsEnabled,
            });
            setPasswordForm({ oldPassword: "", newPassword: "" });
            setIsEditing(false);
        }
    };

    const handleSave = async () => {
        try {
            const changedFields: Partial<UserProfile> = {};

            if (editForm.fullName !== user?.fullName) changedFields.fullName = editForm.fullName;
            if (editForm.email !== user?.email) changedFields.email = editForm.email;
            if (editForm.phoneNumber !== user?.phoneNumber)
                changedFields.phoneNumber = editForm.phoneNumber;
            if (editForm.username !== user?.username) changedFields.username = editForm.username;
            if (editForm.pushNotificationsEnabled !== user?.pushNotificationsEnabled)
                changedFields.pushNotificationsEnabled = editForm.pushNotificationsEnabled;

            // Update profile if there are changes
            if (Object.keys(changedFields).length > 0) {
                await updateProfile({ userData: changedFields });
            }

            // Change password if provided
            if (passwordForm.oldPassword && passwordForm.newPassword) {
                await changePassword({
                    old_password: passwordForm.oldPassword,
                    new_password: passwordForm.newPassword,
                });
            }

            // Success
            setIsEditing(false);
            setPasswordForm({ oldPassword: "", newPassword: "" });
            toast.success(tr("Profile updated successfully!"));
        } catch (error: unknown) {
            console.error("Error saving profile:", error);
            const apiError = error as ApiError;

            // Extract error message from response
            const errorData = apiError.response?.data as ApiErrorResponse;
            let errorMessage = tr("Failed to update profile. Please try again.");

            if (errorData) {
                // Handle specific field errors
                if (errorData.old_password || errorData.oldPassword) {
                    errorMessage =
                        (errorData.old_password as string[])?.[0] ||
                        (errorData.oldPassword as string[])?.[0] ||
                        "Wrong password.";
                } else if (errorData.new_password || errorData.newPassword) {
                    errorMessage =
                        (errorData.new_password as string[])?.[0] ||
                        (errorData.newPassword as string[])?.[0] ||
                        "Invalid new password.";
                } else if (errorData.email) {
                    errorMessage = Array.isArray(errorData.email)
                        ? errorData.email[0]
                        : (errorData.email as string);
                } else if (errorData.username) {
                    errorMessage = Array.isArray(errorData.username)
                        ? errorData.username[0]
                        : (errorData.username as string);
                } else if (errorData.phone_number || errorData.phoneNumber) {
                    errorMessage =
                        (errorData.phone_number as string[])?.[0] ||
                        (errorData.phoneNumber as string[])?.[0] ||
                        "Invalid phone number.";
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (typeof errorData === "string") {
                    errorMessage = errorData;
                }
            }

            toast.error(errorMessage);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageTitle
                title={tr("Settings")}
                subtitle={tr("Manage your profile information and account settings")}
            />

            {/* Settings Content */}
            <Tabs
                aria-label={tr("Settings")}
                color="primary"
                variant="underlined"
                classNames={{
                    tabList: "flex flex-wrap gap-2 sm:gap-3",
                    tab: "whitespace-nowrap",
                }}
            >
                <Tab key="profile" title={tr("Profile")}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <ProfileSummaryCard profile={user} />
                        <ProfileForm
                            isEditing={isEditing}
                            editForm={editForm}
                            setEditForm={setEditForm}
                            passwordForm={passwordForm}
                            setPasswordForm={setPasswordForm}
                            onEdit={handleEdit}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            isLoading={isUpdatingProfile || isChangingPassword}
                        />
                        <div className="lg:col-span-3">
                            <NotificationSettingsCard />
                        </div>
                    </div>
                </Tab>

                {isAdmin && (
                    <Tab
                        key="reports"
                        title={
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                <span>{tr("Reports")}</span>
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <ReportsTab />
                        </div>
                    </Tab>
                )}

                {isAdmin && (
                    <Tab
                        key="bakery-info"
                        title={
                            <div className="flex items-center gap-2">
                                <Store className="h-4 w-4" />
                                <span>{tr("Bakery Information")}</span>
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <BakerySettingsForm />
                        </div>
                    </Tab>
                )}

                {isAdmin && (
                    <Tab
                        key="factory-reset"
                        title={
                            <div className="flex items-center gap-2 text-danger">
                                <Trash2 className="h-4 w-4" />
                                <span>{tr("Factory Reset")}</span>
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <FactoryResetForm />
                        </div>
                    </Tab>
                )}
            </Tabs>
        </div>
    );
};

export { SettingsPage };
