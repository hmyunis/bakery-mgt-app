import { useState } from "react";
import { UserFormModal } from "../components/users/UserFormModal";
import { DeleteUserModal } from "../components/users/DeleteUserModal";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "../hooks/useUsers";
import { type User, type CreateUserData, type UpdateUserData } from "../services/userService";
import { DataTable } from "../components/ui/DataTable";
import { DataTablePagination } from "../components/ui/DataTablePagination";
import { getUserColumns } from "../components/users/UserColumns";
import { UserDetailModal } from "../components/users/UserDetailModal";
import { UserFilterCard } from "../components/users/UserFilterCard";
import { PageTitle } from "../components/ui/PageTitle";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";

const PAGE_SIZE = 10;

export function UsersPage() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const { data, isLoading } = useUsers({
        page,
        pageSize,
        search: search || undefined,
        isActive: isActiveFilter !== null ? isActiveFilter : undefined,
        ordering: "-date_joined",
    });

    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const deleteUser = useDeleteUser();

    const handleCreateUser = async (data: CreateUserData | UpdateUserData) => {
        await createUser.mutateAsync(data as CreateUserData);
        setIsFormModalOpen(false);
    };

    const handleUpdateUser = async (data: CreateUserData | UpdateUserData) => {
        if (selectedUser) {
            await updateUser.mutateAsync({ id: selectedUser.id, data: data as UpdateUserData });
            setIsFormModalOpen(false);
            setSelectedUser(null);
        }
    };

    const handleDeleteUser = async () => {
        if (selectedUser) {
            await deleteUser.mutateAsync(selectedUser.id);
            setIsDeleteModalOpen(false);
            setSelectedUser(null);
            // If deleting the last item on a page, go back one page
            if (data?.results.length === 1 && page > 1) {
                setPage(page - 1);
            }
        }
    };

    const openCreateModal = () => {
        setSelectedUser(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setIsFormModalOpen(true);
        setIsDetailModalOpen(false);
    };

    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
        setIsDetailModalOpen(false);
    };

    const openDetailModal = (user: User) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
    };

    const columns = getUserColumns({
        onEdit: openEditModal,
        onDelete: openDeleteModal,
    });

    const totalPages = data ? Math.ceil(data.count / pageSize) : 1;

    return (
        <div className="space-y-6">
            <PageTitle
                title="User Management"
                subtitle="Manage all users and their roles."
                actions={
                    <Button
                        color="primary"
                        onPress={openCreateModal}
                        startContent={<Plus className="h-5 w-5" />}
                    >
                        Add User
                    </Button>
                }
            />
            <UserFilterCard
                searchQuery={search}
                onSearchChange={(value) => {
                    setSearch(value);
                    setPage(1);
                }}
                isActiveFilter={isActiveFilter}
                onIsActiveFilterChange={(value) => {
                    setIsActiveFilter(value);
                    setPage(1);
                }}
                isLoading={isLoading}
            />
            <DataTable
                columns={columns}
                data={data?.results || []}
                isLoading={isLoading}
                onRowClick={openDetailModal}
            />
            {data && data.count > 0 && (
                <DataTablePagination
                    pagination={{
                        count: data.count,
                        page,
                        pageSize,
                        totalPages,
                    }}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                    }}
                />
            )}

            {/* Modals */}
            <UserFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setSelectedUser(null);
                }}
                onSubmit={selectedUser ? handleUpdateUser : handleCreateUser}
                user={selectedUser}
                isLoading={createUser.isPending || updateUser.isPending}
            />

            <DeleteUserModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedUser(null);
                }}
                onConfirm={handleDeleteUser}
                user={selectedUser}
                isLoading={deleteUser.isPending}
            />

            <UserDetailModal
                user={selectedUser}
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedUser(null);
                }}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
            />
        </div>
    );
}
