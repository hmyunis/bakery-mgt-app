import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { PageTitle } from "../components/ui/PageTitle";
import { DataTable } from "../components/ui/DataTable";
import { DataTablePagination } from "../components/ui/DataTablePagination";
import {
    useCreateEmployee,
    useDeleteEmployee,
    useEmployees,
    useUpdateEmployee,
} from "../hooks/useEmployees";
import type { Employee } from "../types/employee";
import { getEmployeeColumns } from "../components/employees/EmployeeColumns";
import { MemoEmployeeFilterCard } from "../components/employees/EmployeeFilterCard";
import { EmployeeFormModal } from "../components/employees/EmployeeFormModal";
import { DeleteEmployeeModal } from "../components/employees/DeleteEmployeeModal";
import { useDebounce } from "../hooks/useDebounce";

const PAGE_SIZE = 10;

export function EmployeesPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, 400);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const { data, isLoading } = useEmployees({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        ordering: "-created_at",
    });

    const createEmployee = useCreateEmployee();
    const updateEmployee = useUpdateEmployee();
    const deleteEmployee = useDeleteEmployee();

    const totalPages = data ? Math.ceil(data.count / pageSize) : 1;

    const openCreateModal = useCallback(() => {
        setSelectedEmployee(null);
        setIsFormOpen(true);
    }, []);

    const openEditModal = useCallback((employee: Employee) => {
        setSelectedEmployee(employee);
        setIsFormOpen(true);
    }, []);

    const openDeleteModal = useCallback((employee: Employee) => {
        setSelectedEmployee(employee);
        setIsDeleteOpen(true);
    }, []);

    const columns = useMemo(
        () =>
            getEmployeeColumns({
                onEdit: openEditModal,
                onDelete: openDeleteModal,
            }),
        [openDeleteModal, openEditModal]
    );

    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
        setPage(1);
    }, []);

    const handleCreate = async (payload: Parameters<typeof createEmployee.mutateAsync>[0]) => {
        await createEmployee.mutateAsync(payload);
        setIsFormOpen(false);
    };

    const handleUpdate = async (
        payload: Parameters<typeof updateEmployee.mutateAsync>[0]["data"]
    ) => {
        if (!selectedEmployee) return;
        await updateEmployee.mutateAsync({ id: selectedEmployee.id, data: payload });
        setIsFormOpen(false);
        setSelectedEmployee(null);
    };

    const handleDelete = async () => {
        if (!selectedEmployee) return;
        await deleteEmployee.mutateAsync(selectedEmployee.id);
        setIsDeleteOpen(false);
        if (data?.results.length === 1 && page > 1) setPage(page - 1);
        setSelectedEmployee(null);
    };

    return (
        <div className="space-y-6">
            <PageTitle
                title="Employees"
                subtitle="Manage employee profiles, roster, attendance and payroll."
                actions={
                    <Button
                        color="primary"
                        onPress={openCreateModal}
                        startContent={<Plus className="h-5 w-5" />}
                    >
                        Add Employee
                    </Button>
                }
            />

            <MemoEmployeeFilterCard
                searchQuery={searchInput}
                onSearchChange={handleSearchChange}
                isLoading={isLoading}
            />

            <DataTable
                columns={columns}
                data={data?.results || []}
                isLoading={isLoading}
                onRowClick={(row) => navigate(`/app/employees/${row.id}`)}
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

            <EmployeeFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedEmployee(null);
                }}
                employee={selectedEmployee}
                onSubmit={selectedEmployee ? handleUpdate : handleCreate}
                isLoading={createEmployee.isPending || updateEmployee.isPending}
            />

            <DeleteEmployeeModal
                isOpen={isDeleteOpen}
                onClose={() => {
                    setIsDeleteOpen(false);
                    setSelectedEmployee(null);
                }}
                employee={selectedEmployee}
                onConfirm={handleDelete}
                isLoading={deleteEmployee.isPending}
            />
        </div>
    );
}
