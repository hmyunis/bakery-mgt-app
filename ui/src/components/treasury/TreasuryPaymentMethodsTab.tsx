import { tr } from "../../locales";
import { useMemo, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { Plus } from "lucide-react";
import { DataTable } from "../ui/DataTable";
import { DataTablePagination } from "../ui/DataTablePagination";
import { getPaymentMethodColumns } from "../payment/PaymentMethodColumns";
import { PaymentMethodFormModal } from "../payment/PaymentMethodFormModal";
import { DeletePaymentMethodModal } from "../payment/DeletePaymentMethodModal";
import { usePaymentMethods, useUpdatePaymentMethod } from "../../hooks/usePayment";
import type { PaymentMethod } from "../../types/payment";

export function TreasuryPaymentMethodsTab() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<PaymentMethod | null>(null);
    const [deleting, setDeleting] = useState<PaymentMethod | null>(null);
    const { data, isLoading } = usePaymentMethods({ page, page_size: pageSize });
    const { mutateAsync: updatePaymentMethod } = useUpdatePaymentMethod();
    const rows = useMemo(() => data?.results ?? [], [data]);

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    color="primary"
                    startContent={<Plus className="h-4 w-4" />}
                    onPress={() => {
                        setEditing(null);
                        setIsFormOpen(true);
                    }}
                >
                    {tr("Add Payment Method")}
                </Button>
            </div>
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Spinner size="lg" />
                </div>
            ) : (
                <>
                    <DataTable
                        columns={getPaymentMethodColumns({
                            onEdit: (method) => {
                                setEditing(method);
                                setIsFormOpen(true);
                            },
                            onDelete: setDeleting,
                            onToggleActive: (method) =>
                                updatePaymentMethod({
                                    id: method.id,
                                    data: { is_active: !method.is_active },
                                }),
                        })}
                        data={rows}
                    />
                    {data && data.count > 0 && (
                        <DataTablePagination
                            pagination={{
                                count: data.count,
                                page,
                                pageSize,
                                totalPages: Math.ceil(data.count / pageSize),
                            }}
                            onPageChange={setPage}
                            onPageSizeChange={(size) => {
                                setPageSize(size);
                                setPage(1);
                            }}
                        />
                    )}
                </>
            )}
            <PaymentMethodFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditing(null);
                }}
                paymentMethod={editing}
            />
            <DeletePaymentMethodModal
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                paymentMethod={deleting}
            />
        </div>
    );
}
