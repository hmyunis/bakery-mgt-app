import { useCallback, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { DataTable } from "../ui/DataTable";
import { DataTablePagination } from "../ui/DataTablePagination";
import { useDebounce } from "../../hooks/useDebounce";
import type { ShiftTemplate } from "../../types/shift";
import {
    useCreateShiftTemplate,
    useDeleteShiftTemplate,
    useShiftTemplates,
    useUpdateShiftTemplate,
} from "../../hooks/useShiftTemplates";
import { getShiftTemplateColumns } from "./ShiftTemplateColumns";
import { MemoShiftTemplateFilterCard } from "./ShiftTemplateFilterCard";
import { ShiftTemplateFormModal } from "./ShiftTemplateFormModal";
import { DeleteShiftTemplateModal } from "./DeleteShiftTemplateModal";

const PAGE_SIZE = 10;

export function ShiftTemplatesTab() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, 400);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<ShiftTemplate | null>(null);

    const { data, isLoading } = useShiftTemplates({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        ordering: "name",
    });

    const createShift = useCreateShiftTemplate();
    const updateShift = useUpdateShiftTemplate();
    const deleteShift = useDeleteShiftTemplate();

    const totalPages = data ? Math.ceil(data.count / pageSize) : 1;

    const openCreateModal = () => {
        setSelectedShift(null);
        setIsFormOpen(true);
    };

    const openEditModal = (shift: ShiftTemplate) => {
        setSelectedShift(shift);
        setIsFormOpen(true);
    };

    const openDeleteModal = (shift: ShiftTemplate) => {
        setSelectedShift(shift);
        setIsDeleteOpen(true);
    };

    const columns = useMemo(
        () =>
            getShiftTemplateColumns({
                page,
                pageSize,
                onEdit: openEditModal,
                onDelete: openDeleteModal,
            }),
        [page, pageSize]
    );

    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
        setPage(1);
    }, []);

    const handleCreate = async (payload: Parameters<typeof createShift.mutateAsync>[0]) => {
        await createShift.mutateAsync(payload);
        setIsFormOpen(false);
    };

    const handleUpdate = async (payload: Parameters<typeof updateShift.mutateAsync>[0]["data"]) => {
        if (!selectedShift) return;
        await updateShift.mutateAsync({ id: selectedShift.id, data: payload });
        setIsFormOpen(false);
        setSelectedShift(null);
    };

    const handleDelete = async () => {
        if (!selectedShift) return;
        await deleteShift.mutateAsync(selectedShift.id);
        setIsDeleteOpen(false);
        if (data?.results.length === 1 && page > 1) setPage(page - 1);
        setSelectedShift(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <MemoShiftTemplateFilterCard
                    searchQuery={searchInput}
                    onSearchChange={handleSearchChange}
                />

                <Button
                    color="primary"
                    onPress={openCreateModal}
                    startContent={<Plus className="h-5 w-5" />}
                >
                    Add Shift Template
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

            <ShiftTemplateFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedShift(null);
                }}
                shift={selectedShift}
                onSubmit={selectedShift ? handleUpdate : handleCreate}
                isLoading={createShift.isPending || updateShift.isPending}
            />

            <DeleteShiftTemplateModal
                isOpen={isDeleteOpen}
                onClose={() => {
                    setIsDeleteOpen(false);
                    setSelectedShift(null);
                }}
                shift={selectedShift}
                onConfirm={handleDelete}
                isLoading={deleteShift.isPending}
            />
        </div>
    );
}
