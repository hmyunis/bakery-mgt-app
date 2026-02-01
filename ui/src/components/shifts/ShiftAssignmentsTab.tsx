import { useCallback, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { DataTable } from "../ui/DataTable";
import { DataTablePagination } from "../ui/DataTablePagination";
import type { ShiftAssignment } from "../../types/shiftAssignment";
import { useEmployees } from "../../hooks/useEmployees";
import { useShiftTemplates } from "../../hooks/useShiftTemplates";
import {
    useBulkCreateShiftAssignments,
    useCreateShiftAssignment,
    useDeleteShiftAssignment,
    useShiftAssignments,
    useUpdateShiftAssignment,
} from "../../hooks/useShiftAssignments";
import { getShiftAssignmentColumns } from "./ShiftAssignmentColumns";
import { MemoShiftAssignmentFilterCard } from "./ShiftAssignmentFilterCard";
import { ShiftAssignmentFormModal } from "./ShiftAssignmentFormModal";
import { DeleteShiftAssignmentModal } from "./DeleteShiftAssignmentModal";
import {
    BulkShiftAssignmentModal,
    type BulkCreateAssignmentsPayload,
    type BulkCreateAssignmentsResult,
} from "./BulkShiftAssignmentModal";

const PAGE_SIZE = 10;

export function ShiftAssignmentsTab() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);

    const [employeeFilter, setEmployeeFilter] = useState<number | "">("");
    const [shiftFilter, setShiftFilter] = useState<number | "">("");
    const [shiftDateFilter, setShiftDateFilter] = useState<string>("");

    const { data: employeesData } = useEmployees({ page: 1, pageSize: 200, ordering: "full_name" });
    const employees = useMemo(() => employeesData?.results || [], [employeesData]);

    const { data: shiftsData } = useShiftTemplates({ page: 1, pageSize: 200, ordering: "name" });
    const shifts = useMemo(() => shiftsData?.results || [], [shiftsData]);
    const activeShifts = useMemo(() => shifts.filter((s) => s.isActive), [shifts]);

    const { data, isLoading } = useShiftAssignments({
        page,
        pageSize,
        employee: employeeFilter,
        shift: shiftFilter,
        shiftDate: shiftDateFilter || "",
        ordering: "-shift_date",
    });

    const createAssignment = useCreateShiftAssignment();
    const updateAssignment = useUpdateShiftAssignment();
    const deleteAssignment = useDeleteShiftAssignment();
    const bulkCreate = useBulkCreateShiftAssignments();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [selected, setSelected] = useState<ShiftAssignment | null>(null);

    const totalPages = data ? Math.ceil(data.count / pageSize) : 1;

    const openCreateModal = () => {
        setSelected(null);
        setIsFormOpen(true);
    };

    const openBulkModal = () => {
        setIsBulkOpen(true);
    };

    const openEditModal = (assignment: ShiftAssignment) => {
        setSelected(assignment);
        setIsFormOpen(true);
    };

    const openDeleteModal = (assignment: ShiftAssignment) => {
        setSelected(assignment);
        setIsDeleteOpen(true);
    };

    const columns = useMemo(
        () =>
            getShiftAssignmentColumns({
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

    const onShiftChange = useCallback((shift: number | "") => {
        setShiftFilter(shift);
        setPage(1);
    }, []);

    const onShiftDateChange = useCallback((dateStr: string) => {
        setShiftDateFilter(dateStr);
        setPage(1);
    }, []);

    const handleCreate = async (payload: Parameters<typeof createAssignment.mutateAsync>[0]) => {
        await createAssignment.mutateAsync(payload);
        setIsFormOpen(false);
    };

    const handleUpdate = async (
        payload: Parameters<typeof updateAssignment.mutateAsync>[0]["data"]
    ) => {
        if (!selected) return;
        await updateAssignment.mutateAsync({ id: selected.id, data: payload });
        setIsFormOpen(false);
        setSelected(null);
    };

    const handleDelete = async () => {
        if (!selected) return;
        await deleteAssignment.mutateAsync(selected.id);
        setIsDeleteOpen(false);
        if (data?.results.length === 1 && page > 1) setPage(page - 1);
        setSelected(null);
    };

    const handleBulkCreate = async (
        payload: BulkCreateAssignmentsPayload
    ): Promise<BulkCreateAssignmentsResult> => {
        const res = await bulkCreate.mutateAsync({
            employee: payload.employee,
            shift: payload.shift,
            startDate: payload.startDate,
            endDate: payload.endDate,
            skipWeekends: payload.skipWeekends,
            skipLeaveDays: payload.skipLeaveDays,
        });

        return {
            createdCount: res.createdCount,
            skippedExisting: res.skippedExisting,
            skippedWeekends: res.skippedWeekends,
            skippedLeaveDays: res.skippedLeaveDays,
        };
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <MemoShiftAssignmentFilterCard
                    employees={employees}
                    shifts={activeShifts}
                    employee={employeeFilter}
                    shift={shiftFilter}
                    shiftDate={shiftDateFilter}
                    onEmployeeChange={onEmployeeChange}
                    onShiftChange={onShiftChange}
                    onShiftDateChange={onShiftDateChange}
                />

                <div className="flex items-center gap-2">
                    <Button variant="flat" onPress={openBulkModal}>
                        Bulk Create
                    </Button>
                    <Button
                        color="primary"
                        onPress={openCreateModal}
                        startContent={<Plus className="h-5 w-5" />}
                    >
                        Add Assignment
                    </Button>
                </div>
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

            <ShiftAssignmentFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelected(null);
                }}
                assignment={selected}
                employees={employees}
                shifts={activeShifts}
                onSubmit={selected ? handleUpdate : handleCreate}
                isLoading={createAssignment.isPending || updateAssignment.isPending}
            />

            <DeleteShiftAssignmentModal
                isOpen={isDeleteOpen}
                onClose={() => {
                    setIsDeleteOpen(false);
                    setSelected(null);
                }}
                assignment={selected}
                onConfirm={handleDelete}
                isLoading={deleteAssignment.isPending}
            />

            <BulkShiftAssignmentModal
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                employees={employees}
                shifts={activeShifts}
                onSubmit={handleBulkCreate}
                isLoading={bulkCreate.isPending}
            />
        </div>
    );
}
