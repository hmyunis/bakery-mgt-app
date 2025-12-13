import React, { useEffect, useState } from "react";
import { Tabs, Tab, Spinner } from "@heroui/react";
import { useAuth } from "../hooks/useAuth";
import { ProfileSummaryCard } from "../components/profile/ProfileSummaryCard";
import { ProfileForm } from "../components/profile/ProfileForm";
import type { UserProfile } from "../services/authService";
import { toast } from "sonner";

const SettingsPage: React.FC = () => {
    const { user, updateProfile, isUpdatingProfile, changePassword, isChangingPassword } =
        useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: "",
        newPassword: "",
    });

    useEffect(() => {
        if (user) {
            setEditForm({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
            });
        }
    }, [user]);

    const handleEdit = () => {
        if (user) {
            setEditForm({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
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
            toast.success("Profile updated successfully!");
        } catch (error: any) {
            console.error("Error saving profile:", error);

            // Extract error message from response
            const errorData = error.response?.data;
            let errorMessage = "Failed to update profile. Please try again.";

            if (errorData) {
                // Handle specific field errors
                if (errorData.old_password || errorData.oldPassword) {
                    errorMessage =
                        errorData.old_password?.[0] ||
                        errorData.oldPassword?.[0] ||
                        "Wrong password.";
                } else if (errorData.new_password || errorData.newPassword) {
                    errorMessage =
                        errorData.new_password?.[0] ||
                        errorData.newPassword?.[0] ||
                        "Invalid new password.";
                } else if (errorData.email) {
                    errorMessage = Array.isArray(errorData.email)
                        ? errorData.email[0]
                        : errorData.email;
                } else if (errorData.username) {
                    errorMessage = Array.isArray(errorData.username)
                        ? errorData.username[0]
                        : errorData.username;
                } else if (errorData.phone_number || errorData.phoneNumber) {
                    errorMessage =
                        errorData.phone_number?.[0] ||
                        errorData.phoneNumber?.[0] ||
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
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Settings</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Manage your profile information and account settings
                </p>
            </div>

            {/* Settings Content */}
            <Tabs aria-label="Settings" color="primary" variant="underlined">
                <Tab key="profile" title="Profile">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
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
                    </div>
                </Tab>

                <Tab key="preferences" title="Preferences">
                    <div className="mt-6">
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-slate-500/10 mb-4">
                                <svg
                                    className="size-8 text-slate-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                                    />
                                </svg>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-lg">
                                Preferences will be implemented here.
                            </p>
                            <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
                                Theme settings, notifications, and other preferences.
                            </p>
                        </div>
                    </div>
                </Tab>
            </Tabs>
        </div>
    );
};

export { SettingsPage };
