import { useCallback, useMemo, useState } from "react";
import { Tabs, Tab, Chip, Button } from "@heroui/react";
import { Landmark, FileClock } from "lucide-react";
import { type DateValue } from "@internationalized/date";
import { PageTitle } from "../components/ui/PageTitle";
import { BankAccountFormModal } from "../components/treasury/BankAccountFormModal";
import { DeleteBankAccountModal } from "../components/treasury/DeleteBankAccountModal";
import { ExpenseFormModal } from "../components/treasury/ExpenseFormModal";
import { DeleteExpenseModal } from "../components/treasury/DeleteExpenseModal";
import { DeleteTransactionModal } from "../components/treasury/DeleteTransactionModal";
import { usePaymentMethods } from "../hooks/usePayment";
import type {
    BankAccount,
    BankTransaction,
    CreateBankAccountData,
    CreateExpenseData,
    Expense,
} from "../types/treasury";
import { BankTransactionModal } from "../components/treasury/BankTransactionModal";
import { TreasuryAccountsTab } from "../components/treasury/TreasuryAccountsTab";
import { TreasuryExpensesTab } from "../components/treasury/TreasuryExpensesTab";
import {
    useBankAccounts,
    useBankTransactions,
    useCreateBankAccount,
    useCreateBankTransaction,
    useCreateExpense,
    useDeleteBankAccount,
    useDeleteBankTransaction,
    useDeleteExpense,
    useExpenses,
    useUpdateBankAccount,
    useUpdateBankTransaction,
    useUpdateExpense,
} from "../hooks/useTreasury";
import { useBakerySettings, useUpdateBakerySettings } from "../hooks/useBakery";

const formatCurrency = (amount: number) => {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "ETB",
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `ETB ${amount.toFixed(2)}`;
    }
};

export function TreasuryPage() {
    const [activeTab, setActiveTab] = useState("accounts");
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [activeAccount, setActiveAccount] = useState<BankAccount | null>(null);
    const [transactionMode, setTransactionMode] = useState<"deposit" | "withdrawal">("deposit");
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null);
    const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);
    const [deletingTransaction, setDeletingTransaction] = useState<BankTransaction | null>(null);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
    const [expenseFilter, setExpenseFilter] = useState<"all" | "paid" | "pending">("all");
    const [expenseSearch, setExpenseSearch] = useState("");
    const [expenseStartDate, setExpenseStartDate] = useState<DateValue | null>(null);
    const [expenseEndDate, setExpenseEndDate] = useState<DateValue | null>(null);
    const [expensePage, setExpensePage] = useState(1);
    const [expensePageSize, setExpensePageSize] = useState(10);
    const [transactionFilter, setTransactionFilter] = useState<"all" | "deposit" | "withdrawal">(
        "all"
    );
    const [transactionAccountId, setTransactionAccountId] = useState<number | null>(null);
    const [transactionStartDate, setTransactionStartDate] = useState<DateValue | null>(null);
    const [transactionEndDate, setTransactionEndDate] = useState<DateValue | null>(null);
    const [transactionPage, setTransactionPage] = useState(1);
    const [transactionPageSize, setTransactionPageSize] = useState(10);

    const { data: bakerySettings } = useBakerySettings();
    const updateBakerySettings = useUpdateBakerySettings();

    const { data: paymentMethodsData } = usePaymentMethods({
        page: 1,
        page_size: 100,
    });

    const paymentMethods = useMemo(() => paymentMethodsData?.results ?? [], [paymentMethodsData]);

    const paymentMethodMap = useMemo(
        () => new Map(paymentMethods.map((method) => [method.id, { name: method.name } as const])),
        [paymentMethods]
    );

    const { data: accountsData, isLoading: isLoadingAccounts } = useBankAccounts({
        page: 1,
        page_size: 100,
    });

    const accounts = useMemo(() => accountsData?.results ?? [], [accountsData]);

    const totalBalance = useMemo(
        () =>
            accounts
                .filter((account) => account.isActive)
                .reduce((sum, account) => sum + account.balance, 0),
        [accounts]
    );

    const transactionParams = useMemo(
        () => ({
            page: transactionPage,
            page_size: transactionPageSize,
            transaction_type: transactionFilter === "all" ? undefined : transactionFilter,
            account: transactionAccountId ?? undefined,
            start_date: transactionStartDate ? transactionStartDate.toString() : undefined,
            end_date: transactionEndDate ? `${transactionEndDate.toString()}T23:59:59` : undefined,
        }),
        [
            transactionAccountId,
            transactionEndDate,
            transactionFilter,
            transactionPage,
            transactionPageSize,
            transactionStartDate,
        ]
    );

    const { data: transactionsData, isLoading: isLoadingTransactions } =
        useBankTransactions(transactionParams);

    const transactions = useMemo(() => transactionsData?.results ?? [], [transactionsData]);

    const openCreateAccount = () => {
        setEditingAccount(null);
        setIsAccountModalOpen(true);
    };

    const openEditAccount = (account: BankAccount) => {
        setEditingAccount(account);
        setIsAccountModalOpen(true);
    };

    const createBankAccount = useCreateBankAccount();
    const updateBankAccount = useUpdateBankAccount();
    const deleteBankAccount = useDeleteBankAccount();
    const createTransaction = useCreateBankTransaction();
    const updateTransaction = useUpdateBankTransaction();
    const deleteTransaction = useDeleteBankTransaction();
    const createExpense = useCreateExpense();
    const updateExpense = useUpdateExpense();
    const deleteExpense = useDeleteExpense();

    const handleDeleteAccount = (accountId: number) => {
        deleteBankAccount.mutate(accountId);
        setActiveAccount((prev) => (prev?.id === accountId ? null : prev));
        setEditingAccount((prev) => (prev?.id === accountId ? null : prev));
    };

    const handleSaveAccount = async (payload: CreateBankAccountData) => {
        if (editingAccount) {
            await updateBankAccount.mutateAsync({ id: editingAccount.id, data: payload });
            return;
        }
        await createBankAccount.mutateAsync(payload);
    };

    const openTransactionModal = (account: BankAccount, mode: "deposit" | "withdrawal") => {
        setActiveAccount(account);
        setTransactionMode(mode);
        setEditingTransaction(null);
        setIsTransactionModalOpen(true);
    };

    const openEditTransaction = useCallback(
        (transaction: BankTransaction) => {
            const account = accounts.find((acct) => acct.id === transaction.accountId) || null;
            setActiveAccount(account);
            setTransactionMode(transaction.type);
            setEditingTransaction(transaction);
            setIsTransactionModalOpen(true);
        },
        [accounts]
    );

    const handleAddTransaction = async (
        payload: Omit<BankTransaction, "id" | "createdAt" | "recordedBy" | "recordedByName">
    ) => {
        await createTransaction.mutateAsync(payload);
        setTransactionPage(1);
    };

    const handleUpdateTransaction = async (
        transactionId: number,
        payload: Omit<BankTransaction, "id" | "createdAt" | "recordedBy" | "recordedByName">
    ) => {
        await updateTransaction.mutateAsync({ id: transactionId, data: payload });
    };

    const handleDeleteTransaction = (transactionId: number) => {
        deleteTransaction.mutate(transactionId);
    };

    const openCreateExpense = () => {
        setEditingExpense(null);
        setIsExpenseModalOpen(true);
    };

    const openEditExpense = useCallback((expense: Expense) => {
        setEditingExpense(expense);
        setIsExpenseModalOpen(true);
    }, []);

    const handleSaveExpense = (payload: CreateExpenseData) => {
        if (editingExpense) {
            updateExpense.mutate({ id: editingExpense.id, data: payload });
            return;
        }
        createExpense.mutate(payload);
    };

    const handleDeleteExpense = (expenseId: number) => {
        deleteExpense.mutate(expenseId);
    };

    const salesBankSyncEnabled = bakerySettings?.syncSalesToBankAccounts ?? false;

    const handleSalesBankSyncChange = async (value: boolean) => {
        const formData = new FormData();
        formData.append("sync_sales_to_bank_accounts", value ? "true" : "false");
        await updateBakerySettings.mutateAsync(formData);
    };

    const expenseParams = useMemo(
        () => ({
            page: expensePage,
            page_size: expensePageSize,
            status: expenseFilter === "all" ? undefined : expenseFilter,
            search: expenseSearch.trim() ? expenseSearch.trim() : undefined,
            start_date: expenseStartDate ? expenseStartDate.toString() : undefined,
            end_date: expenseEndDate ? `${expenseEndDate.toString()}T23:59:59` : undefined,
        }),
        [
            expenseEndDate,
            expenseFilter,
            expensePage,
            expensePageSize,
            expenseSearch,
            expenseStartDate,
        ]
    );

    const { data: expensesData, isLoading: isLoadingExpenses } = useExpenses(expenseParams);

    const expenses = useMemo(() => expensesData?.results ?? [], [expensesData]);

    const { data: expenseSummaryData } = useExpenses({ page: 1, page_size: 1000 });
    const expenseSummary = useMemo(() => expenseSummaryData?.results ?? [], [expenseSummaryData]);

    const totalExpenseAmount = useMemo(
        () => expenseSummary.reduce((sum, expense) => sum + expense.amount, 0),
        [expenseSummary]
    );

    const paidExpenseAmount = useMemo(
        () =>
            expenseSummary
                .filter((expense) => expense.status === "paid")
                .reduce((sum, expense) => sum + expense.amount, 0),
        [expenseSummary]
    );

    const pendingExpenseAmount = useMemo(
        () =>
            expenseSummary
                .filter((expense) => expense.status === "pending")
                .reduce((sum, expense) => sum + expense.amount, 0),
        [expenseSummary]
    );

    const expenseColumns = useMemo(
        () => [
            {
                id: "number",
                header: "#",
                cell: ({ row }: { row: { index: number } }) =>
                    (expensePage - 1) * expensePageSize + row.index + 1,
            },
            {
                accessorKey: "createdAt",
                header: "Date",
                cell: ({ row }: { row: { original: Expense } }) =>
                    new Date(row.original.createdAt).toLocaleDateString(),
            },
            {
                accessorKey: "title",
                header: "Expense",
                cell: ({ row }: { row: { original: Expense } }) => (
                    <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                            {row.original.title}
                        </p>
                    </div>
                ),
            },
            {
                accessorKey: "amount",
                header: "Amount",
                cell: ({ row }: { row: { original: Expense } }) =>
                    formatCurrency(row.original.amount),
            },
            {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }: { row: { original: Expense } }) => (
                    <Chip
                        size="sm"
                        variant="flat"
                        color={row.original.status === "paid" ? "success" : "warning"}
                    >
                        {row.original.status === "paid" ? "Paid" : "Pending"}
                    </Chip>
                ),
            },
            {
                accessorKey: "accountId",
                header: "Bank Account",
                cell: ({ row }: { row: { original: Expense } }) => {
                    if (!row.original.accountId) return "—";
                    if (row.original.accountName) return row.original.accountName;
                    const account = accounts.find((acct) => acct.id === row.original.accountId);
                    if (!account) return "Account removed";
                    return `${account.name} • ${account.bankName}`;
                },
            },
            {
                accessorKey: "notes",
                header: "Notes",
                cell: ({ row }: { row: { original: Expense } }) => row.original.notes || "—",
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }: { row: { original: Expense } }) => (
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="light"
                            onPress={() => openEditExpense(row.original)}
                            className="text-slate-700 dark:text-slate-200"
                        >
                            Edit
                        </Button>
                        <Button
                            size="sm"
                            variant="light"
                            onPress={() => setDeletingExpense(row.original)}
                            className="text-danger"
                        >
                            Delete
                        </Button>
                    </div>
                ),
            },
        ],
        [accounts, expensePage, expensePageSize, openEditExpense]
    );

    const transactionColumns = useMemo(
        () => [
            {
                id: "number",
                header: "#",
                cell: ({ row }: { row: { index: number } }) =>
                    (transactionPage - 1) * transactionPageSize + row.index + 1,
            },
            {
                accessorKey: "createdAt",
                header: "Date",
                cell: ({ row }: { row: { original: BankTransaction } }) =>
                    new Date(row.original.createdAt).toLocaleString(),
            },
            {
                accessorKey: "accountId",
                header: "Account",
                cell: ({ row }: { row: { original: BankTransaction } }) =>
                    row.original.accountName ||
                    accounts.find((acct) => acct.id === row.original.accountId)?.name ||
                    "—",
            },
            {
                accessorKey: "type",
                header: "Type",
                cell: ({ row }: { row: { original: BankTransaction } }) => (
                    <Chip
                        size="sm"
                        variant="flat"
                        color={row.original.type === "deposit" ? "success" : "danger"}
                    >
                        {row.original.type === "deposit" ? "Deposit" : "Withdrawal"}
                    </Chip>
                ),
            },
            {
                accessorKey: "amount",
                header: "Amount",
                cell: ({ row }: { row: { original: BankTransaction } }) =>
                    formatCurrency(row.original.amount),
            },
            {
                accessorKey: "recordedBy",
                header: "Recorded By",
                cell: ({ row }: { row: { original: BankTransaction } }) =>
                    row.original.recordedByName || "—",
            },
            {
                accessorKey: "notes",
                header: "Notes",
                cell: ({ row }: { row: { original: BankTransaction } }) =>
                    row.original.notes || "—",
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }: { row: { original: BankTransaction } }) => (
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="light"
                            onPress={() => openEditTransaction(row.original)}
                            className="text-slate-700 dark:text-slate-200"
                        >
                            Edit
                        </Button>
                        <Button
                            size="sm"
                            variant="light"
                            onPress={() => setDeletingTransaction(row.original)}
                            className="text-danger"
                        >
                            Delete
                        </Button>
                    </div>
                ),
            },
        ],
        [accounts, openEditTransaction, transactionPage, transactionPageSize]
    );

    return (
        <div className="space-y-6 lg:space-y-8">
            <PageTitle
                title="Treasury"
                subtitle="Configure bank accounts, monitor balances, and prepare expenses."
            />

            <Tabs
                aria-label="Treasury"
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(String(key))}
                color="primary"
                variant="underlined"
                classNames={{
                    tabList: "flex flex-wrap gap-2 sm:gap-3",
                    tab: "whitespace-nowrap",
                }}
            >
                <Tab
                    key="accounts"
                    title={
                        <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4" />
                            <span>Bank Accounts</span>
                        </div>
                    }
                >
                    <TreasuryAccountsTab
                        totalBalance={totalBalance}
                        accounts={accounts}
                        isLoadingAccounts={isLoadingAccounts}
                        onCreateAccount={openCreateAccount}
                        onEditAccount={openEditAccount}
                        onDeleteAccount={setDeletingAccount}
                        formatCurrency={formatCurrency}
                        paymentMethodMap={paymentMethodMap}
                        salesBankSyncEnabled={salesBankSyncEnabled}
                        isSavingSalesBankSync={updateBakerySettings.isPending}
                        onSalesBankSyncChange={handleSalesBankSyncChange}
                        openTransactionModal={openTransactionModal}
                        transactionFilter={transactionFilter}
                        onTransactionFilterChange={(value) => {
                            setTransactionFilter(value);
                            setTransactionPage(1);
                        }}
                        transactionAccountId={transactionAccountId}
                        onTransactionAccountChange={(value) => {
                            setTransactionAccountId(value);
                            setTransactionPage(1);
                        }}
                        transactionStartDate={transactionStartDate}
                        onTransactionStartDateChange={(value) => {
                            setTransactionStartDate(value);
                            setTransactionPage(1);
                        }}
                        transactionEndDate={transactionEndDate}
                        onTransactionEndDateChange={(value) => {
                            setTransactionEndDate(value);
                            setTransactionPage(1);
                        }}
                        transactionColumns={transactionColumns}
                        transactions={transactions}
                        isLoadingTransactions={isLoadingTransactions}
                        transactionCount={transactionsData?.count ?? 0}
                        transactionPage={transactionPage}
                        transactionPageSize={transactionPageSize}
                        onTransactionPageChange={(newPage) => setTransactionPage(newPage)}
                        onTransactionPageSizeChange={(newSize) => {
                            setTransactionPageSize(newSize);
                            setTransactionPage(1);
                        }}
                    />
                </Tab>

                <Tab
                    key="expenses"
                    title={
                        <div className="flex items-center gap-2">
                            <FileClock className="h-4 w-4" />
                            <span>Expenses</span>
                        </div>
                    }
                >
                    <TreasuryExpensesTab
                        totalExpenseAmount={totalExpenseAmount}
                        paidExpenseAmount={paidExpenseAmount}
                        pendingExpenseAmount={pendingExpenseAmount}
                        formatCurrency={formatCurrency}
                        expenseSearch={expenseSearch}
                        onExpenseSearchChange={(value) => {
                            setExpenseSearch(value);
                            setExpensePage(1);
                        }}
                        expenseStartDate={expenseStartDate}
                        onExpenseStartDateChange={(value) => {
                            setExpenseStartDate(value);
                            setExpensePage(1);
                        }}
                        expenseEndDate={expenseEndDate}
                        onExpenseEndDateChange={(value) => {
                            setExpenseEndDate(value);
                            setExpensePage(1);
                        }}
                        expenseFilter={expenseFilter}
                        onExpenseFilterChange={(value) => {
                            setExpenseFilter(value);
                            setExpensePage(1);
                        }}
                        onCreateExpense={openCreateExpense}
                        expenseColumns={expenseColumns}
                        expenses={expenses}
                        isLoadingExpenses={isLoadingExpenses}
                        expenseCount={expensesData?.count ?? 0}
                        expensePage={expensePage}
                        expensePageSize={expensePageSize}
                        onExpensePageChange={(newPage) => setExpensePage(newPage)}
                        onExpensePageSizeChange={(newSize) => {
                            setExpensePageSize(newSize);
                            setExpensePage(1);
                        }}
                    />
                </Tab>
            </Tabs>

            <BankAccountFormModal
                isOpen={isAccountModalOpen}
                onClose={() => {
                    setIsAccountModalOpen(false);
                    setEditingAccount(null);
                }}
                account={editingAccount}
                paymentMethods={paymentMethods}
                onSave={handleSaveAccount}
            />

            <DeleteBankAccountModal
                isOpen={!!deletingAccount}
                account={deletingAccount}
                onClose={() => setDeletingAccount(null)}
                onConfirm={() => {
                    if (!deletingAccount) return;
                    handleDeleteAccount(deletingAccount.id);
                    setDeletingAccount(null);
                }}
            />

            <BankTransactionModal
                key={editingTransaction?.id ?? `${transactionMode}-${activeAccount?.id ?? "new"}`}
                isOpen={isTransactionModalOpen}
                onClose={() => {
                    setIsTransactionModalOpen(false);
                    setActiveAccount(null);
                    setEditingTransaction(null);
                }}
                account={activeAccount}
                mode={transactionMode}
                transaction={editingTransaction}
                onSubmit={async (payload) => {
                    const fixedPayload = {
                        ...payload,
                        accountId:
                            typeof payload.accountId === "string"
                                ? Number(payload.accountId)
                                : payload.accountId,
                    };
                    if (editingTransaction) {
                        await handleUpdateTransaction(editingTransaction.id, fixedPayload);
                        return;
                    }
                    await handleAddTransaction(fixedPayload);
                }}
            />

            <DeleteTransactionModal
                isOpen={!!deletingTransaction}
                transaction={deletingTransaction}
                onClose={() => setDeletingTransaction(null)}
                onConfirm={() => {
                    if (!deletingTransaction) return;
                    handleDeleteTransaction(deletingTransaction.id);
                    setDeletingTransaction(null);
                }}
            />

            <ExpenseFormModal
                key={`${editingExpense?.id ?? "create"}-${isExpenseModalOpen ? "open" : "closed"}`}
                isOpen={isExpenseModalOpen}
                onClose={() => {
                    setIsExpenseModalOpen(false);
                    setEditingExpense(null);
                }}
                expense={editingExpense}
                accounts={accounts}
                onSave={handleSaveExpense}
            />

            <DeleteExpenseModal
                isOpen={!!deletingExpense}
                expense={deletingExpense}
                onClose={() => setDeletingExpense(null)}
                onConfirm={() => {
                    if (!deletingExpense) return;
                    handleDeleteExpense(deletingExpense.id);
                    setDeletingExpense(null);
                }}
            />
        </div>
    );
}
