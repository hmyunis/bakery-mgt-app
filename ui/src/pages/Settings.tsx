import React, { useEffect, useState, useMemo } from "react";
import { Tabs, Tab, Spinner, Button } from "@heroui/react";
import { CreditCard, Plus, Store, Trash2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ProfileSummaryCard } from "../components/profile/ProfileSummaryCard";
import { ProfileForm } from "../components/profile/ProfileForm";
import { PageTitle } from "../components/ui/PageTitle";
import { DataTable } from "../components/ui/DataTable";
import { DataTablePagination } from "../components/ui/DataTablePagination";
import { getPaymentMethodColumns } from "../components/payment/PaymentMethodColumns";
import { PaymentMethodFormModal } from "../components/payment/PaymentMethodFormModal";
import { DeletePaymentMethodModal } from "../components/payment/DeletePaymentMethodModal";
import { usePaymentMethods, useUpdatePaymentMethod } from "../hooks/usePayment";
import type { UserProfile } from "../services/authService";
import type { PaymentMethod } from "../types/payment";
import { toast } from "sonner";
import { useAppSelector } from "../store";
import { BakerySettingsForm } from "../components/settings/BakerySettingsForm";
import { FactoryResetForm } from "../components/settings/FactoryResetForm";
import { ReportsTab } from "../components/settings/ReportsTab";
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

    // Payment Methods state
    const [paymentPage, setPaymentPage] = useState(1);
    const [paymentPageSize, setPaymentPageSize] = useState(10);
    const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
    const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
    const [deletingPaymentMethod, setDeletingPaymentMethod] = useState<PaymentMethod | null>(null);

    const { data: paymentMethodsData, isLoading: isLoadingPaymentMethods } = usePaymentMethods({
        page: paymentPage,
        page_size: paymentPageSize,
    });

    const { mutateAsync: updatePaymentMethod } = useUpdatePaymentMethod();

    const paymentMethodRows = useMemo(
        () => paymentMethodsData?.results ?? [],
        [paymentMethodsData]
    );

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

    // Payment Methods handlers
    const handleAddPaymentMethod = () => {
        setEditingPaymentMethod(null);
        setIsPaymentFormOpen(true);
    };

    const handleEditPaymentMethod = (paymentMethod: PaymentMethod) => {
        setEditingPaymentMethod(paymentMethod);
        setIsPaymentFormOpen(true);
    };

    const handleDeletePaymentMethod = (paymentMethod: PaymentMethod) => {
        setDeletingPaymentMethod(paymentMethod);
    };

    const handleToggleActive = async (paymentMethod: PaymentMethod) => {
        try {
            await updatePaymentMethod({
                id: paymentMethod.id,
                data: { is_active: !paymentMethod.is_active },
            });
        } catch (error) {
            // Error handling is done in the hook
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
            <PageTitle
                title="Settings"
                subtitle="Manage your profile information and account settings"
            />

            {/* Settings Content */}
            <Tabs
                aria-label="Settings"
                color="primary"
                variant="underlined"
                classNames={{
                    tabList: "flex flex-wrap gap-2 sm:gap-3",
                    tab: "whitespace-nowrap",
                }}
            >
                <Tab key="profile" title="Profile">
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
                    </div>
                </Tab>

                {isAdmin && (
                    <Tab
                        key="payment-methods"
                        title={
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span>Payment Methods</span>
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <Button
                                    color="primary"
                                    startContent={<Plus className="h-4 w-4" />}
                                    onPress={handleAddPaymentMethod}
                                >
                                    Add Payment Method
                                </Button>
                            </div>

                            {isLoadingPaymentMethods ? (
                                <div className="flex justify-center py-12">
                                    <Spinner size="lg" />
                                </div>
                            ) : (
                                <>
                                    <DataTable
                                        columns={getPaymentMethodColumns({
                                            onEdit: handleEditPaymentMethod,
                                            onDelete: handleDeletePaymentMethod,
                                            onToggleActive: handleToggleActive,
                                        })}
                                        data={paymentMethodRows}
                                    />
                                    {paymentMethodsData && paymentMethodsData.count > 0 && (
                                        <DataTablePagination
                                            pagination={{
                                                count: paymentMethodsData.count,
                                                page: paymentPage,
                                                pageSize: paymentPageSize,
                                                totalPages: Math.ceil(
                                                    paymentMethodsData.count / paymentPageSize
                                                ),
                                            }}
                                            onPageChange={(newPage) => setPaymentPage(newPage)}
                                            onPageSizeChange={(newSize) => {
                                                setPaymentPageSize(newSize);
                                                setPaymentPage(1);
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </Tab>
                )}

                {isAdmin && (
                    <Tab
                        key="reports"
                        title={
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                <span>Reports</span>
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
                                <span>Bakery Information</span>
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
                                <span>Factory Reset</span>
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <FactoryResetForm />
                        </div>
                    </Tab>
                )}
            </Tabs>

            {/* Payment Method Modals */}
            <PaymentMethodFormModal
                isOpen={isPaymentFormOpen}
                onClose={() => {
                    setIsPaymentFormOpen(false);
                    setEditingPaymentMethod(null);
                }}
                paymentMethod={editingPaymentMethod}
            />

            <DeletePaymentMethodModal
                isOpen={!!deletingPaymentMethod}
                onClose={() => setDeletingPaymentMethod(null)}
                paymentMethod={deletingPaymentMethod}
            />
        </div>
    );
};

export { SettingsPage };
