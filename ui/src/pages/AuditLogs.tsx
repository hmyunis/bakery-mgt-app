import { useMemo, useState } from "react";
import { Input, Select, SelectItem, Spinner } from "@heroui/react";
import { Search } from "lucide-react";
import { PageTitle } from "../components/ui/PageTitle";
import { DataTable } from "../components/ui/DataTable";
import { DataTablePagination } from "../components/ui/DataTablePagination";
import { getAuditLogColumns } from "../components/audit/AuditLogColumns";
import { AuditLogDetailModal } from "../components/audit/AuditLogDetailModal";
import { useAuditLogs } from "../hooks/useAudit";
import { useDebounce } from "../hooks/useDebounce";
import type { AuditAction } from "../types/audit";
import type { AuditLog } from "../types/audit";

export function AuditLogsPage() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [action, setAction] = useState<AuditAction | "ALL">("DELETE"); // most important filter
    const [search, setSearch] = useState("");
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const debouncedSearch = useDebounce(search, 300);

    const params = useMemo(
        () => ({
            page,
            page_size: pageSize,
            action: action === "ALL" ? undefined : action,
            search: debouncedSearch?.trim() ? debouncedSearch.trim() : undefined,
            ordering: "-timestamp",
        }),
        [page, pageSize, action, debouncedSearch]
    );

    const { data, isLoading } = useAuditLogs(params);
    const rows = useMemo(() => data?.results ?? [], [data]);

    return (
        <div className="space-y-6">
            <PageTitle
                title="Audit Logs"
                subtitle="Searchable record of who did what. Start with Delete actions to catch fraud."
            />

            <div className="flex flex-col sm:flex-row gap-3">
                <div
                    className={`
          w-full sm:w-64 lg:w-72
          focus-within:sm:w-96
          transition-[width] duration-300 ease-in-out
        `}
                >
                    <Input
                        placeholder="Search by actor, table, record ID, IP…"
                        value={search}
                        isClearable
                        onValueChange={(v) => {
                            setSearch(v);
                            setPage(1);
                        }}
                        startContent={<Search className="h-5 w-5 text-slate-400" />}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                </div>

                <div className="w-full sm:w-48">
                    <Select
                        placeholder="Filter by action"
                        selectedKeys={action === "ALL" ? [] : [action]}
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string;
                            if (selected === "ALL" || !selected) {
                                setAction("ALL");
                            } else if (selected === "DELETE") {
                                setAction("DELETE");
                            } else if (selected === "UPDATE") {
                                setAction("UPDATE");
                            } else if (selected === "CREATE") {
                                setAction("CREATE");
                            }
                            setPage(1);
                        }}
                        classNames={{
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            base: "!w-full !text-left",
                            value: "!text-slate-800 dark:!text-slate-100",
                        }}
                    >
                        <SelectItem key="DELETE">Delete</SelectItem>
                        <SelectItem key="UPDATE">Update</SelectItem>
                        <SelectItem key="CREATE">Create</SelectItem>
                        <SelectItem key="ALL">All</SelectItem>
                    </Select>
                </div>
            </div>

            {isLoading && !data ? (
                <div className="flex justify-center py-12">
                    <Spinner size="lg" />
                </div>
            ) : (
                <>
                    <DataTable
                        columns={getAuditLogColumns()}
                        data={rows}
                        isLoading={isLoading}
                        onRowClick={(row) => setSelectedLog(row)}
                    />
                    {data && data.count > 0 && (
                        <DataTablePagination
                            pagination={{
                                count: data.count,
                                page,
                                pageSize,
                                totalPages: Math.max(1, Math.ceil(data.count / pageSize)),
                            }}
                            onPageChange={setPage}
                            onPageSizeChange={(newSize) => {
                                setPageSize(newSize);
                                setPage(1);
                            }}
                        />
                    )}
                </>
            )}

            <AuditLogDetailModal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                auditLog={selectedLog}
            />
        </div>
    );
}
