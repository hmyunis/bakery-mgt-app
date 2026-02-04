import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Chip,
    DatePicker,
    Select,
    SelectItem,
    Spinner,
    Switch,
} from "@heroui/react";
import {
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    Landmark,
    Link2,
    Pencil,
    Plus,
    Trash2,
    Wallet,
} from "lucide-react";
import type { DateValue } from "@internationalized/date";
import { getImageBaseUrl } from "../../lib/apiClient";
import type { BankAccount, BankTransaction } from "../../types/treasury";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../ui/DataTable";
import { DataTablePagination } from "../ui/DataTablePagination";

interface TreasuryAccountsTabProps {
    totalBalance: number;
    accounts: BankAccount[];
    isLoadingAccounts: boolean;
    onCreateAccount: () => void;
    onEditAccount: (account: BankAccount) => void;
    onDeleteAccount: (account: BankAccount) => void;
    formatCurrency: (amount: number) => string;
    paymentMethodMap: Map<number, { name: string }>;
    salesBankSyncEnabled: boolean;
    isSavingSalesBankSync: boolean;
    onSalesBankSyncChange: (value: boolean) => void;
    openTransactionModal: (account: BankAccount, mode: "deposit" | "withdrawal") => void;
    transactionFilter: "all" | "deposit" | "withdrawal";
    onTransactionFilterChange: (value: "all" | "deposit" | "withdrawal") => void;
    transactionAccountId: number | null;
    onTransactionAccountChange: (value: number | null) => void;
    transactionStartDate: DateValue | null;
    onTransactionStartDateChange: (value: DateValue | null) => void;
    transactionEndDate: DateValue | null;
    onTransactionEndDateChange: (value: DateValue | null) => void;
    transactionColumns: ColumnDef<BankTransaction, unknown>[];
    transactions: BankTransaction[];
    isLoadingTransactions: boolean;
    transactionCount: number;
    transactionPage: number;
    transactionPageSize: number;
    onTransactionPageChange: (page: number) => void;
    onTransactionPageSizeChange: (pageSize: number) => void;
}

export function TreasuryAccountsTab({
    totalBalance,
    accounts,
    isLoadingAccounts,
    onCreateAccount,
    onEditAccount,
    onDeleteAccount,
    formatCurrency,
    paymentMethodMap,
    salesBankSyncEnabled,
    isSavingSalesBankSync,
    onSalesBankSyncChange,
    openTransactionModal,
    transactionFilter,
    onTransactionFilterChange,
    transactionAccountId,
    onTransactionAccountChange,
    transactionStartDate,
    onTransactionStartDateChange,
    transactionEndDate,
    onTransactionEndDateChange,
    transactionColumns,
    transactions,
    isLoadingTransactions,
    transactionCount,
    transactionPage,
    transactionPageSize,
    onTransactionPageChange,
    onTransactionPageSizeChange,
}: TreasuryAccountsTabProps) {
    return (
        <div className="space-y-6">
            {/* Top Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <CardHeader className="flex items-center justify-between px-5 py-3">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                Total Balance
                            </p>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(totalBalance)}
                            </p>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-emerald-100/80 dark:bg-emerald-500/20 flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                        </div>
                    </CardHeader>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <CardHeader className="flex items-center justify-between px-5 py-3">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                Accounts
                            </p>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {accounts.length}
                            </p>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-blue-100/80 dark:bg-blue-500/20 flex items-center justify-center">
                            <Banknote className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        </div>
                    </CardHeader>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <CardHeader className="flex items-center justify-between px-5 py-3">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                Linked Methods
                            </p>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {
                                    accounts.filter(
                                        (acct) => (acct.linkedPaymentMethodIds ?? []).length > 0
                                    ).length
                                }
                            </p>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-violet-100/80 dark:bg-violet-500/20 flex items-center justify-center">
                            <Link2 className="h-5 w-5 text-violet-600 dark:text-violet-300" />
                        </div>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Accounts Grid Section */}
                <div className="xl:col-span-7 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                Bank Accounts
                            </h3>
                            <p className="text-xs text-slate-500">
                                Manage your connected institutions
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-3 rounded-lg border border-slate-200/70 dark:border-slate-800/80 px-3 py-2">
                                <div>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                        Auto-post sales
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        Update bank balances from linked payments
                                    </p>
                                </div>
                                <Switch
                                    size="sm"
                                    color="primary"
                                    isSelected={salesBankSyncEnabled}
                                    isDisabled={isSavingSalesBankSync}
                                    onValueChange={onSalesBankSyncChange}
                                    aria-label="Auto-post sales to bank accounts"
                                />
                            </div>
                            <Button
                                color="primary"
                                size="sm"
                                startContent={<Plus className="h-4 w-4" />}
                                onPress={onCreateAccount}
                            >
                                Add Account
                            </Button>
                        </div>
                    </div>

                    {isLoadingAccounts ? (
                        <div className="py-20 flex justify-center">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {accounts.map((account) => {
                                const linkedMethods = (account.linkedPaymentMethodIds ?? [])
                                    .map((id) => paymentMethodMap.get(id)?.name)
                                    .filter(Boolean);

                                return (
                                    <Card
                                        key={account.id}
                                        className="border border-slate-200/60 dark:border-slate-800/80 shadow-sm overflow-hidden"
                                    >
                                        <CardHeader className="flex flex-row items-center gap-3 px-4 pt-4 pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                            <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                {account.logo ? (
                                                    <img
                                                        src={
                                                            account.logo.startsWith("http")
                                                                ? account.logo
                                                                : `${getImageBaseUrl()}${account.logo}`
                                                        }
                                                        alt={account.bankName}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <Landmark className="h-5 w-5 text-slate-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                                    {account.name}
                                                </p>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    {account.bankName}
                                                </p>
                                            </div>
                                            {/* Action icons with spacing */}
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    isIconOnly
                                                    variant="light"
                                                    size="sm"
                                                    className="h-8 w-8"
                                                    onPress={() => onEditAccount(account)}
                                                >
                                                    <Pencil className="h-4 w-4 text-slate-500" />
                                                </Button>
                                                <Button
                                                    isIconOnly
                                                    variant="light"
                                                    size="sm"
                                                    color="danger"
                                                    className="h-8 w-8"
                                                    onPress={() => onDeleteAccount(account)}
                                                >
                                                    <Trash2 className="h-4 w-4 opacity-70" />
                                                </Button>
                                            </div>
                                        </CardHeader>

                                        <CardBody className="px-4 py-3 space-y-3">
                                            <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-2.5 flex items-center justify-between">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                                    Balance
                                                </span>
                                                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                    {formatCurrency(account.balance)}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-mono text-slate-500">
                                                    {account.accountNumber || "—"}
                                                </span>
                                                <Chip
                                                    size="sm"
                                                    variant="flat"
                                                    color={account.isActive ? "success" : "default"}
                                                    className="h-5 text-[9px] font-bold"
                                                >
                                                    {account.isActive ? "ACTIVE" : "INACTIVE"}
                                                </Chip>
                                            </div>

                                            <div className="pt-1">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                                                    Linked Methods
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {linkedMethods.length > 0 ? (
                                                        linkedMethods.map((name, i) => (
                                                            <Chip
                                                                key={i}
                                                                size="sm"
                                                                variant="dot"
                                                                color="secondary"
                                                                className="h-5 text-[10px] bg-slate-100 dark:bg-slate-800 border-none"
                                                            >
                                                                {name}
                                                            </Chip>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">
                                                            None
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </CardBody>

                                        {/* Footer: Buttons at opposite ends */}
                                        <CardFooter className="px-4 py-3 bg-slate-50/30 dark:bg-slate-900/30 flex justify-between gap-4">
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                color="success"
                                                startContent={
                                                    <ArrowDownRight className="h-4 w-4" />
                                                }
                                                className="flex-1 font-semibold"
                                                onPress={() =>
                                                    openTransactionModal(account, "deposit")
                                                }
                                            >
                                                Deposit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                color="danger"
                                                startContent={<ArrowUpRight className="h-4 w-4" />}
                                                className="flex-1 font-semibold"
                                                onPress={() =>
                                                    openTransactionModal(account, "withdrawal")
                                                }
                                            >
                                                Withdraw
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Activity Section - RESTORED TO ORIGINAL DESIGN */}
                <div className="xl:col-span-5">
                    <Card className="border border-slate-200/60 dark:border-slate-800/80">
                        <CardHeader>
                            <div>
                                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Activity
                                </p>
                                <p className="text-sm text-slate-500">
                                    Deposits and withdrawals across all accounts.
                                </p>
                            </div>
                        </CardHeader>
                        <CardBody className="pt-0 space-y-4">
                            <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:items-end lg:flex lg:flex-row lg:flex-wrap">
                                <Select
                                    label="Account"
                                    variant="bordered"
                                    placeholder="All accounts"
                                    selectedKeys={
                                        transactionAccountId
                                            ? new Set([String(transactionAccountId)])
                                            : new Set([])
                                    }
                                    onSelectionChange={(keys) => {
                                        const selected = Array.from(keys)[0] as string | undefined;
                                        if (!selected || selected === "all") {
                                            onTransactionAccountChange(null);
                                            return;
                                        }
                                        const parsed = Number.parseInt(selected, 10);
                                        onTransactionAccountChange(
                                            Number.isNaN(parsed) ? null : parsed
                                        );
                                    }}
                                    selectionMode="single"
                                    classNames={{
                                        base: "!w-full md:!w-full lg:!w-44 !text-left",
                                        trigger: "!w-full md:!w-full lg:!w-44 !text-left",
                                        label: "!w-full md:!w-full lg:!w-44 !text-left",
                                        value: "!text-slate-900 dark:!text-slate-100",
                                    }}
                                    aria-label="Filter by account"
                                >
                                    <>
                                        <SelectItem key="all">All accounts</SelectItem>
                                        {accounts.map((account) => (
                                            <SelectItem
                                                key={String(account.id)}
                                                textValue={`${account.name}`}
                                            >
                                                {account.name}
                                            </SelectItem>
                                        ))}
                                    </>
                                </Select>
                                <Select
                                    label="Type"
                                    variant="bordered"
                                    selectedKeys={new Set([transactionFilter])}
                                    onSelectionChange={(keys) => {
                                        const key = Array.from(keys)[0] as
                                            | "all"
                                            | "deposit"
                                            | "withdrawal"
                                            | undefined;
                                        if (!key) return;
                                        onTransactionFilterChange(key);
                                    }}
                                    selectionMode="single"
                                    classNames={{
                                        base: "!w-full md:!w-full lg:!w-36 !text-left",
                                        trigger: "!w-full md:!w-full lg:!w-36 !text-left",
                                        label: "!w-full md:!w-full lg:!w-36 !text-left",
                                        value: "!text-slate-900 dark:!text-slate-100",
                                    }}
                                    aria-label="Filter by activity type"
                                >
                                    <SelectItem key="all">All</SelectItem>
                                    <SelectItem key="deposit">Deposit</SelectItem>
                                    <SelectItem key="withdrawal">Withdrawal</SelectItem>
                                </Select>
                                <div className="w-full md:!w-full lg:!w-40">
                                    <DatePicker
                                        label="Start Date"
                                        variant="bordered"
                                        showMonthAndYearPickers
                                        value={transactionStartDate}
                                        onChange={onTransactionStartDateChange}
                                    />
                                </div>
                                <div className="w-full md:!w-full lg:!w-40">
                                    <DatePicker
                                        label="End Date"
                                        variant="bordered"
                                        showMonthAndYearPickers
                                        value={transactionEndDate}
                                        onChange={onTransactionEndDateChange}
                                    />
                                </div>
                                <Button
                                    variant="light"
                                    color="danger"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onPress={() => {
                                        onTransactionAccountChange(null);
                                        onTransactionFilterChange("all");
                                        onTransactionStartDateChange(null);
                                        onTransactionEndDateChange(null);
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                            <DataTable
                                columns={transactionColumns}
                                data={transactions}
                                isLoading={isLoadingTransactions}
                            />
                            {transactionCount > 0 && (
                                <DataTablePagination
                                    pagination={{
                                        count: transactionCount,
                                        page: transactionPage,
                                        pageSize: transactionPageSize,
                                        totalPages: Math.ceil(
                                            transactionCount / transactionPageSize
                                        ),
                                    }}
                                    onPageChange={onTransactionPageChange}
                                    onPageSizeChange={onTransactionPageSizeChange}
                                />
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}
