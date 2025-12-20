import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Skeleton } from "@heroui/react";
import { cn } from "../../lib/utils";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    isLoading?: boolean;
    onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    isLoading = false,
    onRowClick,
}: DataTableProps<TData, TValue>) {
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="rounded-md border border-slate-300 dark:border-slate-700 overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 text-nowrap"
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
                        // Render skeleton inline or via helper to avoid defining components inside render
                        Array.from({ length: 5 }).map((_, i) => (
                            <tr key={`skel-${i}`} className="border-b dark:border-slate-700">
                                {columns.map((_, j) => (
                                    <td key={`skel-cell-${i}-${j}`} className="p-4">
                                        <Skeleton className="h-6 w-full rounded" />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                onClick={() => onRowClick && onRowClick(row.original)}
                                className={cn(
                                    "transition-colors",
                                    onRowClick &&
                                        "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="p-4 align-middle">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="h-24 text-center py-8">
                                <div className="flex flex-col items-center justify-center text-slate-500">
                                    <div className="text-6xl mb-4">📂</div>
                                    <p className="font-medium">No Results</p>
                                    <p className="text-sm">There is no data to display.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
