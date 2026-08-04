import { tr } from "../../locales";
import { useState, type ReactNode } from "react";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Skeleton } from "@heroui/react";
import { Grid2X2, List } from "lucide-react";
import { cn } from "../../lib/utils";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    isLoading?: boolean;
    onRowClick?: (row: TData) => void;
    getRowClassName?: (row: TData) => string | undefined;
}

type ViewMode = "grid" | "table";

function defaultView(): ViewMode {
    return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
        ? "table"
        : "grid";
}

function EmptyState() {
    return (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <div className="mb-3 text-5xl" aria-hidden="true">
                📂
            </div>
            <p className="font-medium text-slate-700 dark:text-slate-200">{tr("No Results")}</p>
            <p className="text-sm">{tr("There is no data to display.")}</p>
        </div>
    );
}

export function DataTable<TData, TValue>({
    columns,
    data,
    isLoading = false,
    onRowClick,
    getRowClassName,
}: DataTableProps<TData, TValue>) {
    const [view, setView] = useState<ViewMode>(defaultView);

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const headerByColumn = new Map(
        table.getFlatHeaders().map((header) => [header.column.id, header])
    );

    const getLabel = (columnId: string): ReactNode => {
        const header = headerByColumn.get(columnId);
        if (!header || header.isPlaceholder) return columnId === "actions" ? "Actions" : columnId;
        return (
            flexRender(header.column.columnDef.header, header.getContext()) ||
            (columnId === "actions" ? "Actions" : columnId)
        );
    };

    const rows = table.getRowModel().rows;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-end">
                <div
                    className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    role="group"
                    aria-label={tr("Choose data view")}
                >
                    <button
                        type="button"
                        aria-label={tr("Grid view")}
                        aria-pressed={view === "grid"}
                        onClick={() => setView("grid")}
                        className={cn(
                            "flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition",
                            view === "grid"
                                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        )}
                    >
                        <Grid2X2 className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr("Grid")}</span>
                    </button>
                    <button
                        type="button"
                        aria-label={tr("Table view")}
                        aria-pressed={view === "table"}
                        onClick={() => setView("table")}
                        className={cn(
                            "flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition",
                            view === "table"
                                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        )}
                    >
                        <List className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr("Table")}</span>
                    </button>
                </div>
            </div>

            {view === "grid" ? (
                isLoading ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={`card-skel-${i}`}
                                className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                            >
                                <Skeleton className="h-11 w-3/4 rounded-lg" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-12 rounded-lg" />
                                    <Skeleton className="h-12 rounded-lg" />
                                    <Skeleton className="h-12 rounded-lg" />
                                    <Skeleton className="h-12 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : rows.length ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {rows.map((row) => {
                            const cells = row.getVisibleCells();
                            const rowNumber = cells.find((cell) => cell.column.id === "rowNumber");
                            const actions = cells.find((cell) => cell.column.id === "actions");
                            const primary = cells.find(
                                (cell) =>
                                    cell.column.id !== "rowNumber" && cell.column.id !== "actions"
                            );
                            const details = cells.filter(
                                (cell) =>
                                    cell.column.id !== "rowNumber" &&
                                    cell.column.id !== "actions" &&
                                    cell.id !== primary?.id
                            );

                            return (
                                <article
                                    key={row.id}
                                    tabIndex={onRowClick ? 0 : undefined}
                                    onClick={() => onRowClick?.(row.original)}
                                    onKeyDown={(event) => {
                                        if (
                                            onRowClick &&
                                            (event.key === "Enter" || event.key === " ")
                                        ) {
                                            event.preventDefault();
                                            onRowClick(row.original);
                                        }
                                    }}
                                    className={cn(
                                        "group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-700 dark:bg-slate-900",
                                        onRowClick &&
                                            "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:border-slate-600",
                                        getRowClassName?.(row.original)
                                    )}
                                >
                                    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                                        <div className="min-w-0 flex-1">
                                            {primary && (
                                                <div className="[&>*]:max-w-full">
                                                    {flexRender(
                                                        primary.column.columnDef.cell,
                                                        primary.getContext()
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {rowNumber && (
                                            <div className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                {flexRender(
                                                    rowNumber.column.columnDef.cell,
                                                    rowNumber.getContext()
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {details.length > 0 && (
                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 py-4">
                                            {details.map((cell) => (
                                                <div key={cell.id} className="min-w-0">
                                                    <dt className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                        {getLabel(cell.column.id)}
                                                    </dt>
                                                    <dd className="min-w-0 break-words text-sm text-slate-800 dark:text-slate-100 [&>*]:max-w-full">
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    )}

                                    {actions && (
                                        <div
                                            className="-mx-1 flex min-h-11 items-center justify-end border-t border-slate-100 px-1 pt-3 dark:border-slate-800 [&_button]:!min-h-10 [&_button]:!min-w-10 [&_button]:!w-auto"
                                            onClick={(event) => event.stopPropagation()}
                                            onKeyDown={(event) => event.stopPropagation()}
                                        >
                                            {flexRender(
                                                actions.column.columnDef.cell,
                                                actions.getContext()
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState />
                )
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700">
                    <table className="w-full min-w-[600px] text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="px-4 py-3 text-left font-medium text-nowrap text-slate-600 dark:text-slate-400"
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext()
                                                  )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={`skel-${i}`}>
                                        {columns.map((_, j) => (
                                            <td key={`skel-cell-${i}-${j}`} className="p-4">
                                                <Skeleton className="h-6 w-full rounded" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => onRowClick?.(row.original)}
                                        className={cn(
                                            "transition-colors",
                                            onRowClick &&
                                                "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800",
                                            getRowClassName?.(row.original)
                                        )}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="p-4 align-middle">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="p-4">
                                        <EmptyState />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
