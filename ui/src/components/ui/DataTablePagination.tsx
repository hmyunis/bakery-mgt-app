import { Button, Select, SelectItem } from "@heroui/react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationData {
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

interface DataTablePaginationProps {
    pagination: PaginationData;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

export function DataTablePagination({
    pagination,
    onPageChange,
    onPageSizeChange,
}: DataTablePaginationProps) {
    const hasPreviousPage = pagination.page > 1;
    const hasNextPage = pagination.page < pagination.totalPages;

    const firstItem = (pagination.page - 1) * pagination.pageSize + 1;
    const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.count);

    return (
        <nav
            className="flex flex-col gap-3 border-t py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:p-4"
            aria-label="Table pagination"
        >
            <div className="text-center text-xs text-slate-500 dark:text-slate-400 sm:text-left sm:text-sm">
                {pagination.count > 0
                    ? `Showing ${firstItem}-${lastItem} of ${pagination.count} results`
                    : "No results"}
            </div>

            <div className="flex w-full items-center justify-between gap-2 sm:w-fit sm:gap-6">
                <div className="flex shrink-0 items-center gap-2">
                    <Select
                        label="Rows"
                        labelPlacement="outside-left"
                        aria-label="Rows per page"
                        selectedKeys={[String(pagination.pageSize)]}
                        className="min-w-[72px] [&_button]:border-0 [&_button]:bg-transparent [&_button]:focus:ring-0 [&_button]:hover:bg-transparent"
                        onSelectionChange={(keys) => {
                            const newSize = Array.from(keys)[0];
                            if (newSize) {
                                onPageSizeChange(Number(newSize));
                            }
                        }}
                        popoverProps={{ className: "w-20" }}
                    >
                        {[10, 20, 30, 40, 50].map((size) => (
                            <SelectItem key={size} id={`${size}`} textValue={`${size}`}>
                                {size}
                            </SelectItem>
                        ))}
                    </Select>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <p className="whitespace-nowrap text-xs font-medium sm:text-sm">
                        Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            isIconOnly
                            onPress={() => onPageChange(1)}
                            isDisabled={!hasPreviousPage}
                            aria-label="First page"
                            className="h-10 min-w-9 rounded-lg px-0.5 text-slate-500 dark:text-slate-400 dark:hover:text-white"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            isIconOnly
                            onPress={() => onPageChange(pagination.page - 1)}
                            isDisabled={!hasPreviousPage}
                            aria-label="Previous page"
                            className="h-10 min-w-9 rounded-lg px-0.5 text-slate-500 dark:text-slate-400 dark:hover:text-white"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            isIconOnly
                            onPress={() => onPageChange(pagination.page + 1)}
                            isDisabled={!hasNextPage}
                            aria-label="Next page"
                            className="h-10 min-w-9 rounded-lg px-0.5 text-slate-500 dark:text-slate-400 dark:hover:text-white"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            isIconOnly
                            onPress={() => onPageChange(pagination.totalPages)}
                            isDisabled={!hasNextPage}
                            aria-label="Last page"
                            className="h-10 min-w-9 rounded-lg px-0.5 text-slate-500 dark:text-slate-400 dark:hover:text-white"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
