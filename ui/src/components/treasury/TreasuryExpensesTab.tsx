import {
    Button,
    Card,
    CardBody,
    CardHeader,
    DatePicker,
    Input,
    Select,
    SelectItem,
} from "@heroui/react";
import { ArrowDownRight, FileClock, Plus, Receipt, Search } from "lucide-react";
import type { DateValue } from "@internationalized/date";
import type { Expense } from "../../types/treasury";
import { DataTable } from "../ui/DataTable";
import { DataTablePagination } from "../ui/DataTablePagination";

interface TreasuryExpensesTabProps {
    totalExpenseAmount: number;
    paidExpenseAmount: number;
    pendingExpenseAmount: number;
    formatCurrency: (amount: number) => string;
    expenseSearch: string;
    onExpenseSearchChange: (value: string) => void;
    expenseStartDate: DateValue | null;
    onExpenseStartDateChange: (value: DateValue | null) => void;
    expenseEndDate: DateValue | null;
    onExpenseEndDateChange: (value: DateValue | null) => void;
    expenseFilter: "all" | "paid" | "pending";
    onExpenseFilterChange: (value: "all" | "paid" | "pending") => void;
    onCreateExpense: () => void;
    expenseColumns: Array<Record<string, unknown>>;
    expenses: Expense[];
    isLoadingExpenses: boolean;
    expenseCount: number;
    expensePage: number;
    expensePageSize: number;
    onExpensePageChange: (page: number) => void;
    onExpensePageSizeChange: (pageSize: number) => void;
}

export function TreasuryExpensesTab({
    totalExpenseAmount,
    paidExpenseAmount,
    pendingExpenseAmount,
    formatCurrency,
    expenseSearch,
    onExpenseSearchChange,
    expenseStartDate,
    onExpenseStartDateChange,
    expenseEndDate,
    onExpenseEndDateChange,
    expenseFilter,
    onExpenseFilterChange,
    onCreateExpense,
    expenseColumns,
    expenses,
    isLoadingExpenses,
    expenseCount,
    expensePage,
    expensePageSize,
    onExpensePageChange,
    onExpensePageSizeChange,
}: TreasuryExpensesTabProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-slate-200/60 dark:border-slate-800/80">
                    <CardHeader className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-xs text-slate-500">Total Expenses</p>
                            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                {formatCurrency(totalExpenseAmount)}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-rose-100/80 dark:bg-rose-500/20 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-rose-600 dark:text-rose-300" />
                        </div>
                    </CardHeader>
                    <CardBody className="pt-0 px-5 pb-4 text-xs text-slate-500">
                        Sum of all recorded expenses.
                    </CardBody>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800/80">
                    <CardHeader className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-xs text-slate-500">Paid</p>
                            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                {formatCurrency(paidExpenseAmount)}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-emerald-100/80 dark:bg-emerald-500/20 flex items-center justify-center">
                            <ArrowDownRight className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                        </div>
                    </CardHeader>
                    <CardBody className="pt-0 px-5 pb-4 text-xs text-slate-500">
                        Expenses already settled.
                    </CardBody>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800/80">
                    <CardHeader className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-xs text-slate-500">Pending</p>
                            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                {formatCurrency(pendingExpenseAmount)}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-amber-100/80 dark:bg-amber-500/20 flex items-center justify-center">
                            <FileClock className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                        </div>
                    </CardHeader>
                    <CardBody className="pt-0 px-5 pb-4 text-xs text-slate-500">
                        Expenses awaiting payment.
                    </CardBody>
                </Card>
            </div>

            <Card className="border border-slate-200/60 dark:border-slate-800/80">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Expense Log
                        </p>
                        <p className="text-sm text-slate-500">
                            Track and manage business expenses.
                        </p>
                    </div>
                    <Button
                        color="primary"
                        startContent={<Plus className="h-4 w-4" />}
                        onPress={onCreateExpense}
                    >
                        Add Expense
                    </Button>
                </CardHeader>
                <CardBody className="pt-0 space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex flex-wrap gap-3">
                            <div className="w-full sm:w-64 self-end">
                                <Input
                                    placeholder="Search expenses..."
                                    value={expenseSearch}
                                    isClearable
                                    onValueChange={onExpenseSearchChange}
                                    startContent={<Search className="h-4 w-4 text-slate-400" />}
                                    classNames={{
                                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                    }}
                                />
                            </div>
                            <Select
                                selectedKeys={new Set([expenseFilter])}
                                onSelectionChange={(keys) => {
                                    if (keys === "all") return;
                                    const next = Array.from(keys)[0] as "all" | "paid" | "pending";
                                    onExpenseFilterChange(next);
                                }}
                                selectionMode="single"
                                classNames={{
                                    base: "!w-40 !text-left self-end",
                                    trigger: "!w-40 !text-left",
                                    label: "!w-40 !text-left",
                                    value: "!text-slate-900 dark:!text-slate-100",
                                }}
                                aria-label="Filter by status"
                            >
                                <SelectItem key="all">All</SelectItem>
                                <SelectItem key="paid">Paid</SelectItem>
                                <SelectItem key="pending">Pending</SelectItem>
                            </Select>
                            <div className="w-full sm:w-44">
                                <DatePicker
                                    label="Start Date"
                                    variant="bordered"
                                    showMonthAndYearPickers
                                    value={expenseStartDate}
                                    onChange={onExpenseStartDateChange}
                                />
                            </div>
                            <div className="w-full sm:w-44">
                                <DatePicker
                                    label="End Date"
                                    variant="bordered"
                                    showMonthAndYearPickers
                                    value={expenseEndDate}
                                    onChange={onExpenseEndDateChange}
                                />
                            </div>
                        </div>
                    </div>
                    <DataTable
                        columns={expenseColumns}
                        data={expenses}
                        isLoading={isLoadingExpenses}
                    />
                    {expenseCount > 0 && (
                        <DataTablePagination
                            pagination={{
                                count: expenseCount,
                                page: expensePage,
                                pageSize: expensePageSize,
                                totalPages: Math.ceil(expenseCount / expensePageSize),
                            }}
                            onPageChange={onExpensePageChange}
                            onPageSizeChange={onExpensePageSizeChange}
                        />
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
