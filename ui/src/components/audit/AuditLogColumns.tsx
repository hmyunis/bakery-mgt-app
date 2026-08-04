import { tr } from "../../locales";
import type { ColumnDef } from "@tanstack/react-table";
import { Chip } from "@heroui/react";
import type { AuditLog } from "../../types/audit";

function formatDateTime(iso: string) {
    try {
        const d = new Date(iso);
        return d.toLocaleString();
    } catch {
        return iso;
    }
}

function actionColor(action: AuditLog["action"]) {
    switch (action) {
        case "DELETE":
            return "danger" as const;
        case "UPDATE":
            return "warning" as const;
        case "CREATE":
            return "success" as const;
        default:
            return "default" as const;
    }
}

export function getAuditLogColumns(): ColumnDef<AuditLog>[] {
    return [
        {
            accessorKey: "timestamp",
            header: tr("When"),
            cell: ({ row }) => (
                <span className="text-nowrap text-slate-700 dark:text-slate-300">
                    {formatDateTime(row.original.timestamp)}
                </span>
            ),
        },
        {
            accessorKey: "actorName",
            header: tr("Who"),
            cell: ({ row }) => {
                const full = row.original.actorFullName?.trim();
                const user = row.original.actorName?.trim();
                return (
                    <div className="min-w-[140px]">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                            {full || user || tr("System")}
                        </div>
                        {!!full && !!user && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                @{user}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "action",
            header: tr("Action"),
            cell: ({ row }) => (
                <Chip size="sm" color={actionColor(row.original.action)} variant="flat">
                    {row.original.action}
                </Chip>
            ),
        },
        {
            accessorKey: "tableName",
            header: tr("Table"),
            cell: ({ row }) => (
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {row.original.tableName}
                </span>
            ),
        },
        {
            accessorKey: "recordId",
            header: tr("Record"),
            cell: ({ row }) => (
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {row.original.recordId}
                </span>
            ),
        },
        {
            accessorKey: "ipAddress",
            header: tr("IP"),
            cell: ({ row }) => (
                <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                    {row.original.ipAddress || "-"}
                </span>
            ),
        },
    ];
}
