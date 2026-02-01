import { useCallback, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { DataTable } from "../ui/DataTable";
import { DataTablePagination } from "../ui/DataTablePagination";
import type { LeaveRecord } from "../../types/leave";
import { useEmployees } from "../../hooks/useEmployees";
import { useCreateLeave, useDeleteLeave, useLeaves, useUpdateLeave } from "../../hooks/useLeaves";
import { getLeaveColumns } from "./LeaveColumns";
import { MemoLeaveFilterCard } from "./LeaveFilterCard";
import { LeaveFormModal } from "./LeaveFormModal";
import { DeleteLeaveModal } from "./DeleteLeaveModal";

const PAGE_SIZE = 10;

export function LeavesTab() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);

    const [employeeFilter, setEmployeeFilter] = useState<number | "">("");
    const [leaveTypeFilter, setLeaveTypeFilter] = useState<
        "" | "sick" | "annual" | "holiday" | "other"
    >("");

    const { data: employeesData } = useEmployees({ page: 1, pageSize: 200, ordering: "full_name" });
    const employees = useMemo(() => employeesData?.results || [], [employeesData]);

    const { data, isLoading } = useLeaves({
        page,
        pageSize,
        employee: employeeFilter,
        leaveType: leaveTypeFilter,
        ordering: "-start_date",
    });

    const createLeave = useCreateLeave();
    const updateLeave = useUpdateLeave();
    const deleteLeave = useDeleteLeave();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<LeaveRecord | null>(null);

    const totalPages = data ? Math.ceil(data.count / pageSize) : 1;

    const openCreateModal = () => {
        setSelected(null);
        setIsFormOpen(true);
    };

    const openEditModal = (record: LeaveRecord) => {
        setSelected(record);
        setIsFormOpen(true);
    };

    const openDeleteModal = (record: LeaveRecord) => {
        setSelected(record);
        setIsDeleteOpen(true);
    };

    const columns = useMemo(
        () =>
            getLeaveColumns({
                page,
                pageSize,
                onEdit: openEditModal,
                onDelete: openDeleteModal,
            }),
        [page, pageSize]
    );

    const onEmployeeChange = useCallback((employee: number | "") => {
        setEmployeeFilter(employee);
        setPage(1);
    }, []);

    const onLeaveTypeChange = useCallback((leaveType: typeof leaveTypeFilter) => {
        setLeaveTypeFilter(leaveType);
        setPage(1);
    }, []);

    const handleCreate = async (payload: Parameters<typeof createLeave.mutateAsync>[0]) => {
        await createLeave.mutateAsync(payload);
        setIsFormOpen(false);
    };

    const handleUpdate = async (payload: Parameters<typeof updateLeave.mutateAsync>[0]["data"]) => {
        if (!selected) return;
        await updateLeave.mutateAsync({ id: selected.id, data: payload });
        setIsFormOpen(false);
        setSelected(null);
    };

    const handleDelete = async () => {
        if (!selected) return;
        await deleteLeave.mutateAsync(selected.id);
        setIsDeleteOpen(false);
        if (data?.results.length === 1 && page > 1) setPage(page - 1);
        setSelected(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <MemoLeaveFilterCard
                    employees={employees}
                    employee={employeeFilter}
                    leaveType={leaveTypeFilter}
                    onEmployeeChange={onEmployeeChange}
                    onLeaveTypeChange={onLeaveTypeChange}
                />

                <Button
                    color="primary"
                    onPress={openCreateModal}
                    startContent={<Plus className="h-5 w-5" />}
                >
                    Add Leave
                </Button>
            </div>

            <DataTable columns={columns} data={data?.results || []} isLoading={isLoading} />

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

            <LeaveFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelected(null);
                }}
                leave={selected}
                employees={employees}
                onSubmit={selected ? handleUpdate : handleCreate}
                isLoading={createLeave.isPending || updateLeave.isPending}
            />

            <DeleteLeaveModal
                isOpen={isDeleteOpen}
                onClose={() => {
                    setIsDeleteOpen(false);
                    setSelected(null);
                }}
                leave={selected}
                onConfirm={handleDelete}
                isLoading={deleteLeave.isPending}
            />
        </div>
    );
}
