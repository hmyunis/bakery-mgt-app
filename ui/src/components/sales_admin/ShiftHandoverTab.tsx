import { useMemo, useState } from "react";
import { Button, Input, Select, SelectItem, Spinner } from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import {
    Banknote,
    CircleAlert,
    HandCoins,
    Pencil,
    Smartphone,
    UserRound,
    Wallet,
    X,
} from "lucide-react";
import {
    useAcceptShiftSession,
    useActiveShiftSession,
    useCloseShiftSession,
    useOpenShiftSession,
    useReopenShiftSession,
    useShiftSessionReconciliation,
    useShiftSessions,
    useUpdateShiftSessionReconciliation,
} from "../../hooks/useSales";
import { useUsers } from "../../hooks/useUsers";
import { useProducts } from "../../hooks/useProduction";
import { useAppSelector } from "../../store";
import type { Product } from "../../types/production";
import type { ShiftSessionReconciliationProduct } from "../../types/sales";
import { DataTable } from "../ui/DataTable";

const toWholeNumber = (value: string | undefined, fallback = 0) => {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const reconciliationColumns: ColumnDef<ShiftSessionReconciliationProduct>[] = [
    { accessorKey: "productName", header: "Product" },
    { accessorKey: "openingCount", header: "Open" },
    {
        accessorKey: "openingStockBeforeOverride",
        header: "Open Audit",
        cell: ({ row }) => (
            <span
                className={
                    row.original.openingStockMismatch
                        ? "font-semibold text-red-600 dark:text-red-400"
                        : undefined
                }
            >
                {row.original.openingStockBeforeOverride ?? "-"}
            </span>
        ),
    },
    { accessorKey: "producedInShift", header: "Produced" },
    { accessorKey: "paidSoldQty", header: "Paid Sold" },
    { accessorKey: "unpaidQty", header: "Unpaid" },
    { accessorKey: "expectedClosingCount", header: "Expected" },
    {
        accessorKey: "countedClosingCount",
        header: "Counted",
        cell: ({ row }) => row.original.countedClosingCount ?? "-",
    },
    {
        accessorKey: "closingStockBeforeOverride",
        header: "Close Audit",
        cell: ({ row }) => (
            <span
                className={
                    row.original.closingStockMismatch
                        ? "font-semibold text-red-600 dark:text-red-400"
                        : undefined
                }
            >
                {row.original.closingStockBeforeOverride ?? "-"}
            </span>
        ),
    },
    {
        accessorKey: "varianceQty",
        header: "Variance",
        cell: ({ row }) => row.original.varianceQty ?? "-",
    },
];

export function ShiftHandoverTab() {
    const { user } = useAppSelector((state) => state.auth);
    const isAdmin = user?.role === "admin";
    const currentUserId = user?.id !== undefined ? Number(user.id) : null;

    const [openNotes, setOpenNotes] = useState("");
    const [closeNotesBySession, setCloseNotesBySession] = useState<Record<number, string>>({});
    const [acceptanceNotes, setAcceptanceNotes] = useState("");
    const [cashDeclaredBySession, setCashDeclaredBySession] = useState<Record<number, string>>({});
    const [digitalDeclaredBySession, setDigitalDeclaredBySession] = useState<
        Record<number, string>
    >({});
    const [openingCounts, setOpeningCounts] = useState<Record<number, string>>({});
    const [selectedCashierId, setSelectedCashierId] = useState<number | null>(null);
    const [closingCountOverrides, setClosingCountOverrides] = useState<
        Record<number, Record<number, string>>
    >({});
    const [selectedSessionIdOverride, setSelectedSessionIdOverride] = useState<number | null>(null);
    const [isEditingReconciliation, setIsEditingReconciliation] = useState(false);
    const [reconciliationDraft, setReconciliationDraft] = useState<{
        openNotes: string;
        closeNotes: string;
        cashDeclared: string;
        digitalDeclared: string;
        counts: Record<number, { opening: string; closing: string }>;
    } | null>(null);

    const { data: productsData, isLoading: isLoadingProducts } = useProducts({
        page: 1,
        page_size: 500,
        is_active: true,
    });
    const products = useMemo(() => productsData?.results || [], [productsData]);

    const { data: activeData, isLoading: isLoadingActive } = useActiveShiftSession();
    const openedSession = activeData?.openedSession || null;
    const pendingSession = activeData?.pendingSession || null;

    const { data: sessionsData } = useShiftSessions({
        page: 1,
        page_size: 100,
    });
    const { data: cashiersData, isLoading: isLoadingCashiers } = useUsers(
        {
            page: 1,
            pageSize: 200,
            role: "staff",
            ordering: "full_name",
        },
        { enabled: isAdmin }
    );
    const sessions = useMemo(() => sessionsData?.results || [], [sessionsData]);
    const pendingSessionCount = useMemo(
        () => sessions.filter((session) => session.status === "pending_handover_acceptance").length,
        [sessions]
    );
    const cashiers = useMemo(
        () => (cashiersData?.results || []).filter((staff) => staff.permissions.includes("sales")),
        [cashiersData]
    );
    const lastClosed = useMemo(
        () => sessions.find((s) => s.status === "closed") || null,
        [sessions]
    );
    const openingComparisonSource = useMemo(
        () =>
            sessions.find(
                (session) =>
                    session.status !== "opened" &&
                    session.productCounts.some((countRow) => countRow.closingCount !== null)
            ) || null,
        [sessions]
    );
    const resolvedCashierId = useMemo(() => {
        if (!isAdmin) return currentUserId;
        if (selectedCashierId && cashiers.some((cashier) => cashier.id === selectedCashierId)) {
            return selectedCashierId;
        }
        return cashiers[0]?.id ?? null;
    }, [cashiers, currentUserId, isAdmin, selectedCashierId]);

    const openShiftMutation = useOpenShiftSession();
    const closeShiftMutation = useCloseShiftSession();
    const acceptShiftMutation = useAcceptShiftSession();
    const reopenShiftMutation = useReopenShiftSession();
    const updateReconciliationMutation = useUpdateShiftSessionReconciliation();

    const defaultOpeningCounts = useMemo(() => {
        const previousCounts = new Map<number, number>();
        (lastClosed?.productCounts || []).forEach((countRow) => {
            previousCounts.set(
                countRow.product,
                countRow.closingCount ?? countRow.expectedClosingCount ?? countRow.openingCount
            );
        });

        const initial: Record<number, string> = {};
        products.forEach((product) => {
            const count = previousCounts.get(product.id) ?? product.stock_quantity ?? 0;
            initial[product.id] = String(Math.max(0, count));
        });
        return initial;
    }, [lastClosed, products]);

    const resolvedOpeningCounts = useMemo(() => {
        const initial: Record<number, string> = {};
        products.forEach((product) => {
            initial[product.id] =
                openingCounts[product.id] ?? defaultOpeningCounts[product.id] ?? "0";
        });
        return initial;
    }, [products, openingCounts, defaultOpeningCounts]);

    const resolvedClosingCounts = useMemo(() => {
        if (!openedSession) {
            return {} as Record<number, string>;
        }
        const overrides = closingCountOverrides[openedSession.id] || {};
        const initial: Record<number, string> = {};
        products.forEach((product) => {
            initial[product.id] =
                overrides[product.id] ?? String(Math.max(0, product.stock_quantity ?? 0));
        });
        return initial;
    }, [openedSession, products, closingCountOverrides]);
    const resolvedCloseNotes = openedSession
        ? (closeNotesBySession[openedSession.id] ?? openedSession.closeNotes ?? "")
        : "";
    const resolvedCashDeclared = openedSession
        ? (cashDeclaredBySession[openedSession.id] ??
          (openedSession.totalCashDeclared !== null && openedSession.totalCashDeclared !== undefined
              ? openedSession.totalCashDeclared.toFixed(2)
              : ""))
        : "";
    const resolvedDigitalDeclared = openedSession
        ? (digitalDeclaredBySession[openedSession.id] ??
          (openedSession.totalDigitalDeclared !== null &&
          openedSession.totalDigitalDeclared !== undefined
              ? openedSession.totalDigitalDeclared.toFixed(2)
              : ""))
        : "";

    const selectedSessionId =
        selectedSessionIdOverride ??
        pendingSession?.id ??
        openedSession?.id ??
        lastClosed?.id ??
        null;
    const openingComparisonRows = useMemo(() => {
        if (!openingComparisonSource) return [];

        return products.map((product) => {
            const previousCountRow = openingComparisonSource.productCounts.find(
                (countRow) => countRow.product === product.id
            );
            const previousClosingCount =
                previousCountRow?.closingCount ??
                previousCountRow?.expectedClosingCount ??
                previousCountRow?.openingCount ??
                0;
            const enteredOpeningCount = toWholeNumber(resolvedOpeningCounts[product.id], 0);
            const variance = enteredOpeningCount - previousClosingCount;

            return {
                productId: product.id,
                productName: product.name,
                previousClosingCount,
                enteredOpeningCount,
                variance,
                hasMismatch: variance !== 0,
            };
        });
    }, [openingComparisonSource, products, resolvedOpeningCounts]);
    const openingMismatchSummary = useMemo(() => {
        const mismatches = openingComparisonRows.filter((row) => row.hasMismatch);
        return {
            mismatchCount: mismatches.length,
            shortageUnits: mismatches
                .filter((row) => row.variance < 0)
                .reduce((sum, row) => sum + Math.abs(row.variance), 0),
            excessUnits: mismatches
                .filter((row) => row.variance > 0)
                .reduce((sum, row) => sum + row.variance, 0),
        };
    }, [openingComparisonRows]);

    const { data: reconciliationData, isLoading: isLoadingReconciliation } =
        useShiftSessionReconciliation(selectedSessionId, {
            enabled: !!selectedSessionId,
        });

    const canCloseOpenedSession =
        !!openedSession &&
        (isAdmin || (currentUserId !== null && openedSession.openedBy === currentUserId));

    const reconciliationCashierLabel = useMemo(() => {
        const fullName = (reconciliationData?.session.openedByFullName || "").trim();
        const username = (reconciliationData?.session.openedByName || "").trim();
        if (fullName && username) return `${fullName} . ${username}`;
        return fullName || username || "Unknown";
    }, [reconciliationData?.session.openedByFullName, reconciliationData?.session.openedByName]);
    const hasDeclaredTotalMismatch = useMemo(() => {
        if (!reconciliationData) return false;
        const declaredTotal =
            reconciliationData.money.cashDeclared + reconciliationData.money.digitalDeclared;
        return Math.abs(declaredTotal - reconciliationData.money.collectedTotal) > 0.009;
    }, [reconciliationData]);

    const visibleInputClassNames = {
        input: "!text-slate-900 dark:!text-slate-100",
        label: "!text-slate-700 dark:!text-slate-300",
    };
    const parseDeclaredAmount = (value: string): number | null => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const parsed = Number.parseFloat(trimmed);
        if (!Number.isFinite(parsed) || parsed < 0) return null;
        return parsed;
    };
    const parsedCashDeclared = parseDeclaredAmount(resolvedCashDeclared);
    const parsedDigitalDeclared = parseDeclaredAmount(resolvedDigitalDeclared);
    const cashDeclaredInvalid =
        resolvedCashDeclared.trim().length > 0 && parsedCashDeclared === null;
    const digitalDeclaredInvalid =
        resolvedDigitalDeclared.trim().length > 0 && parsedDigitalDeclared === null;
    const canSubmitCloseShift =
        parsedCashDeclared !== null &&
        parsedDigitalDeclared !== null &&
        !closeShiftMutation.isPending;

    const handleOpenShift = async () => {
        if (isAdmin && !resolvedCashierId) return;

        const payload: {
            open_notes: string;
            counts: Array<{ product_id: number; opening_count: number }>;
            cashier?: number;
        } = {
            open_notes: openNotes,
            counts: products.map((product) => ({
                product_id: product.id,
                opening_count: toWholeNumber(resolvedOpeningCounts[product.id], 0),
            })),
        };
        if (isAdmin && resolvedCashierId) {
            payload.cashier = resolvedCashierId;
        }
        await openShiftMutation.mutateAsync(payload);
        setOpenNotes("");
    };

    const handleCloseShift = async () => {
        if (!openedSession) return;
        if (parsedCashDeclared === null || parsedDigitalDeclared === null) return;
        const payload = {
            close_notes: resolvedCloseNotes,
            total_cash_declared: parsedCashDeclared,
            total_digital_declared: parsedDigitalDeclared,
            counts: products.map((product) => ({
                product_id: product.id,
                closing_count: toWholeNumber(resolvedClosingCounts[product.id], 0),
            })),
        };
        await closeShiftMutation.mutateAsync({
            id: openedSession.id,
            data: payload,
        });
    };

    const handleAcceptShift = async () => {
        if (!pendingSession) return;
        await acceptShiftMutation.mutateAsync({
            id: pendingSession.id,
            data: { acceptance_notes: acceptanceNotes },
        });
        setAcceptanceNotes("");
    };

    const handleReopenShift = async () => {
        if (!pendingSession) return;
        await reopenShiftMutation.mutateAsync({ id: pendingSession.id });
    };

    const startEditingReconciliation = () => {
        if (!reconciliationData) return;
        setReconciliationDraft({
            openNotes: reconciliationData.session.openNotes || "",
            closeNotes: reconciliationData.session.closeNotes || "",
            cashDeclared: String(reconciliationData.money.cashDeclared),
            digitalDeclared: String(reconciliationData.money.digitalDeclared),
            counts: Object.fromEntries(
                reconciliationData.products.map((row) => [
                    row.productId,
                    {
                        opening: String(row.openingCount),
                        closing: String(row.countedClosingCount ?? row.expectedClosingCount),
                    },
                ])
            ),
        });
        setIsEditingReconciliation(true);
    };

    const saveReconciliation = async () => {
        if (!selectedSessionId || !reconciliationDraft) return;
        await updateReconciliationMutation.mutateAsync({
            id: selectedSessionId,
            data: {
                open_notes: reconciliationDraft.openNotes,
                close_notes: reconciliationDraft.closeNotes,
                total_cash_declared: Number(reconciliationDraft.cashDeclared) || 0,
                total_digital_declared: Number(reconciliationDraft.digitalDeclared) || 0,
                counts: Object.entries(reconciliationDraft.counts).map(([productId, counts]) => ({
                    product_id: Number(productId),
                    opening_count: toWholeNumber(counts.opening),
                    closing_count: toWholeNumber(counts.closing),
                })),
            },
        });
        setIsEditingReconciliation(false);
        setReconciliationDraft(null);
    };

    const openingColumns: ColumnDef<Product>[] = [
        { accessorKey: "name", header: "Product" },
        ...(isAdmin && openingComparisonSource
            ? [
                  {
                      id: "lastClose",
                      header: "Last Close",
                      cell: ({ row }: { row: { original: Product } }) =>
                          openingComparisonRows.find(
                              (comparison) => comparison.productId === row.original.id
                          )?.previousClosingCount ?? "-",
                  } as ColumnDef<Product>,
              ]
            : []),
        {
            id: "openingCount",
            header: "Opening Count",
            cell: ({ row }) => {
                const comparison = openingComparisonRows.find(
                    (item) => item.productId === row.original.id
                );
                return (
                    <Input
                        type="number"
                        min={0}
                        aria-label={`Opening count for ${row.original.name}`}
                        value={resolvedOpeningCounts[row.original.id] ?? "0"}
                        onValueChange={(value) =>
                            setOpeningCounts((prev) => ({ ...prev, [row.original.id]: value }))
                        }
                        classNames={{
                            input: `text-right ${
                                comparison?.hasMismatch
                                    ? "!text-danger-700 dark:!text-danger-300"
                                    : "!text-slate-900 dark:!text-slate-100"
                            }`,
                            label: "!text-slate-700 dark:!text-slate-300",
                        }}
                    />
                );
            },
        },
        ...(isAdmin && openingComparisonSource
            ? [
                  {
                      id: "mismatch",
                      header: "Mismatch",
                      cell: ({ row }: { row: { original: Product } }) => {
                          const comparison = openingComparisonRows.find(
                              (item) => item.productId === row.original.id
                          );
                          const value = comparison?.variance;
                          return (
                              <span
                                  className={
                                      comparison?.hasMismatch
                                          ? "font-semibold text-danger-700 dark:text-danger-300"
                                          : "font-semibold text-emerald-700 dark:text-emerald-300"
                                  }
                              >
                                  {value === undefined ? "-" : value > 0 ? `+${value}` : value}
                              </span>
                          );
                      },
                  } as ColumnDef<Product>,
              ]
            : []),
    ];

    const closingColumns: ColumnDef<Product>[] = [
        { accessorKey: "name", header: "Product" },
        {
            id: "closingCount",
            header: "Closing Count",
            cell: ({ row }) => (
                <Input
                    type="number"
                    min={0}
                    aria-label={`Closing count for ${row.original.name}`}
                    value={resolvedClosingCounts[row.original.id] ?? "0"}
                    onValueChange={(value) =>
                        setClosingCountOverrides((prev) => {
                            if (!openedSession) return prev;
                            return {
                                ...prev,
                                [openedSession.id]: {
                                    ...(prev[openedSession.id] || {}),
                                    [row.original.id]: value,
                                },
                            };
                        })
                    }
                    classNames={{
                        input: "text-right !text-slate-900 dark:!text-slate-100",
                        label: "!text-slate-700 dark:!text-slate-300",
                    }}
                />
            ),
        },
    ];

    const reconciliationEditColumns: ColumnDef<ShiftSessionReconciliationProduct>[] = [
        { accessorKey: "productName", header: "Product" },
        ...(["opening", "closing"] as const).map(
            (field): ColumnDef<ShiftSessionReconciliationProduct> => ({
                id: field,
                header: field === "opening" ? "Opening" : "Closing",
                cell: ({ row }) => (
                    <Input
                        type="number"
                        min={0}
                        aria-label={`${field} count for ${row.original.productName}`}
                        value={reconciliationDraft?.counts[row.original.productId]?.[field] || "0"}
                        onValueChange={(value) =>
                            setReconciliationDraft((draft) =>
                                draft
                                    ? {
                                          ...draft,
                                          counts: {
                                              ...draft.counts,
                                              [row.original.productId]: {
                                                  ...draft.counts[row.original.productId],
                                                  [field]: value,
                                              },
                                          },
                                      }
                                    : draft
                            )
                        }
                    />
                ),
            })
        ),
    ];

    if (isLoadingProducts || isLoadingActive || (isAdmin && isLoadingCashiers)) {
        return (
            <div className="flex justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Shift State
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Opened: {openedSession ? `#${openedSession.id}` : "None"} | Pending Acceptance:{" "}
                    {pendingSession ? `#${pendingSession.id}` : "None"}
                </p>
            </div>

            {!openedSession && (user?.role === "staff" || isAdmin) && (
                <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Open Shift
                    </h3>
                    {pendingSessionCount >= 3 && (
                        <p className="text-sm text-danger-600 dark:text-danger-400">
                            You cannot open a new shift while 3 sessions are pending handover
                            acceptance.
                        </p>
                    )}
                    {isAdmin && openingComparisonSource && (
                        <div
                            className={`rounded-md border px-3 py-2 text-sm ${
                                openingMismatchSummary.mismatchCount > 0
                                    ? "border-danger-300 bg-danger-50 text-danger-700 dark:border-danger-800 dark:bg-danger-950/30 dark:text-danger-300"
                                    : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                            }`}
                        >
                            <p className="font-semibold">
                                Opening handover check against session #{openingComparisonSource.id}{" "}
                                (
                                {openingComparisonSource.status === "pending_handover_acceptance"
                                    ? "pending acceptance"
                                    : "closed"}
                                )
                            </p>
                            {openingMismatchSummary.mismatchCount > 0 ? (
                                <p className="mt-1">
                                    {openingMismatchSummary.mismatchCount} product
                                    {openingMismatchSummary.mismatchCount === 1 ? "" : "s"} do not
                                    match the previous closing count. Missing units:{" "}
                                    {openingMismatchSummary.shortageUnits}. Extra units:{" "}
                                    {openingMismatchSummary.excessUnits}.
                                </p>
                            ) : (
                                <p className="mt-1">
                                    Every opening count matches the previous cashier&apos;s closing
                                    count.
                                </p>
                            )}
                        </div>
                    )}
                    {isAdmin && (
                        <Select
                            label="Assign Cashier"
                            selectedKeys={
                                resolvedCashierId ? new Set([String(resolvedCashierId)]) : new Set()
                            }
                            onSelectionChange={(keys) => {
                                const key = Array.from(keys)[0] as string | undefined;
                                if (!key) return;
                                setSelectedCashierId(Number(key));
                            }}
                            classNames={{
                                base: "!w-full md:!w-full lg:!w-80 !text-left",
                                trigger: "!w-full md:!w-full lg:!w-80 !text-left",
                                label: "!w-full md:!w-full lg:!w-80 !text-left",
                                value: "!text-slate-900 dark:!text-slate-100",
                            }}
                            isDisabled={!cashiers.length}
                        >
                            {cashiers.map((cashier) => (
                                <SelectItem key={String(cashier.id)}>
                                    {cashier.fullName || cashier.username}
                                </SelectItem>
                            ))}
                        </Select>
                    )}
                    <Input
                        label="Open Notes"
                        value={openNotes}
                        onValueChange={setOpenNotes}
                        placeholder="Optional notes"
                        classNames={visibleInputClassNames}
                    />
                    <div className="max-h-96 overflow-y-auto">
                        <DataTable
                            columns={openingColumns}
                            data={products}
                            getRowClassName={(product) =>
                                openingComparisonRows.find((row) => row.productId === product.id)
                                    ?.hasMismatch
                                    ? "bg-danger-50/70 dark:bg-danger-950/20"
                                    : undefined
                            }
                        />
                    </div>
                    <Button
                        color="primary"
                        onPress={handleOpenShift}
                        isLoading={openShiftMutation.isPending}
                        isDisabled={
                            !products.length ||
                            (isAdmin && !resolvedCashierId) ||
                            pendingSessionCount >= 3
                        }
                    >
                        Open Shift Session
                    </Button>
                </div>
            )}

            {openedSession && canCloseOpenedSession && (
                <div className="space-y-3 rounded-lg border border-warning-300/60 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Close Shift #{openedSession.id}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            label="Cash Declared"
                            value={resolvedCashDeclared}
                            onValueChange={(value) => {
                                if (!openedSession) return;
                                setCashDeclaredBySession((prev) => ({
                                    ...prev,
                                    [openedSession.id]: value,
                                }));
                            }}
                            isRequired
                            placeholder="0.00"
                            isInvalid={cashDeclaredInvalid}
                            errorMessage={cashDeclaredInvalid ? "Enter a valid amount." : undefined}
                            classNames={visibleInputClassNames}
                        />
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            label="Digital Declared"
                            value={resolvedDigitalDeclared}
                            onValueChange={(value) => {
                                if (!openedSession) return;
                                setDigitalDeclaredBySession((prev) => ({
                                    ...prev,
                                    [openedSession.id]: value,
                                }));
                            }}
                            isRequired
                            placeholder="0.00"
                            isInvalid={digitalDeclaredInvalid}
                            errorMessage={
                                digitalDeclaredInvalid ? "Enter a valid amount." : undefined
                            }
                            classNames={visibleInputClassNames}
                        />
                    </div>
                    <Input
                        label="Close Notes"
                        value={resolvedCloseNotes}
                        onValueChange={(value) => {
                            if (!openedSession) return;
                            setCloseNotesBySession((prev) => ({
                                ...prev,
                                [openedSession.id]: value,
                            }));
                        }}
                        placeholder="Optional notes"
                        classNames={visibleInputClassNames}
                    />
                    <div className="max-h-96 overflow-y-auto">
                        <DataTable columns={closingColumns} data={products} />
                    </div>
                    <Button
                        color="warning"
                        onPress={handleCloseShift}
                        isLoading={closeShiftMutation.isPending}
                        isDisabled={!canSubmitCloseShift}
                    >
                        Close & Send for Acceptance
                    </Button>
                </div>
            )}

            {pendingSession && isAdmin && (
                <div className="space-y-3 rounded-lg border border-primary-300/60 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Pending Handover Acceptance #{pendingSession.id}
                    </h3>
                    <Input
                        label="Acceptance Notes"
                        value={acceptanceNotes}
                        onValueChange={setAcceptanceNotes}
                        placeholder="Optional notes"
                        classNames={visibleInputClassNames}
                    />
                    <Button
                        color="primary"
                        onPress={handleAcceptShift}
                        isLoading={acceptShiftMutation.isPending}
                        isDisabled={reopenShiftMutation.isPending}
                    >
                        Accept Handover
                    </Button>
                    <Button
                        variant="flat"
                        color="warning"
                        onPress={handleReopenShift}
                        isLoading={reopenShiftMutation.isPending}
                        isDisabled={acceptShiftMutation.isPending}
                    >
                        Re-open Shift
                    </Button>
                </div>
            )}

            <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Reconciliation Report
                    </h3>
                    {isAdmin && reconciliationData && (
                        <Button
                            size="sm"
                            variant="flat"
                            startContent={
                                isEditingReconciliation ? (
                                    <X className="h-4 w-4" />
                                ) : (
                                    <Pencil className="h-4 w-4" />
                                )
                            }
                            onPress={() => {
                                if (isEditingReconciliation) {
                                    setIsEditingReconciliation(false);
                                    setReconciliationDraft(null);
                                } else {
                                    startEditingReconciliation();
                                }
                            }}
                        >
                            {isEditingReconciliation ? "Cancel Edit" : "Edit Report"}
                        </Button>
                    )}
                </div>
                <Select
                    label="Session"
                    selectedKeys={
                        selectedSessionId ? new Set([String(selectedSessionId)]) : new Set()
                    }
                    onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0] as string | undefined;
                        if (!key) return;
                        setSelectedSessionIdOverride(Number(key));
                    }}
                    classNames={{
                        base: "!w-full md:!w-full lg:!w-80 !text-left",
                        trigger: "!w-full md:!w-full lg:!w-80 !text-left",
                        label: "!w-full md:!w-full lg:!w-80 !text-left",
                        value: "!text-slate-900 dark:!text-slate-100",
                    }}
                >
                    {sessions.map((session) => (
                        <SelectItem
                            key={String(session.id)}
                            textValue={`#${session.id} • ${session.status} • ${new Date(session.openedAt).toLocaleString()}`}
                        >
                            #{session.id} • {session.status} •{" "}
                            {new Date(session.openedAt).toLocaleString()}
                        </SelectItem>
                    ))}
                </Select>

                {isLoadingReconciliation ? (
                    <div className="flex justify-center py-6">
                        <Spinner size="md" />
                    </div>
                ) : !reconciliationData ? (
                    <p className="text-sm text-slate-500">
                        Select a session to view reconciliation.
                    </p>
                ) : (
                    <div className="space-y-3 [&_th]:!text-slate-700 dark:[&_th]:!text-slate-300 [&_td]:!text-slate-900 dark:[&_td]:!text-slate-100">
                        {isEditingReconciliation && reconciliationDraft && (
                            <div className="space-y-3 rounded-md border border-primary-300 p-3 dark:border-primary-800">
                                <div className="grid gap-3 md:grid-cols-2">
                                    <Input
                                        label="Cash Declared"
                                        type="number"
                                        min={0}
                                        value={reconciliationDraft.cashDeclared}
                                        onValueChange={(cashDeclared) =>
                                            setReconciliationDraft({
                                                ...reconciliationDraft,
                                                cashDeclared,
                                            })
                                        }
                                    />
                                    <Input
                                        label="Digital Declared"
                                        type="number"
                                        min={0}
                                        value={reconciliationDraft.digitalDeclared}
                                        onValueChange={(digitalDeclared) =>
                                            setReconciliationDraft({
                                                ...reconciliationDraft,
                                                digitalDeclared,
                                            })
                                        }
                                    />
                                    <Input
                                        label="Opening Notes"
                                        value={reconciliationDraft.openNotes}
                                        onValueChange={(openNotes) =>
                                            setReconciliationDraft({
                                                ...reconciliationDraft,
                                                openNotes,
                                            })
                                        }
                                    />
                                    <Input
                                        label="Closing Notes"
                                        value={reconciliationDraft.closeNotes}
                                        onValueChange={(closeNotes) =>
                                            setReconciliationDraft({
                                                ...reconciliationDraft,
                                                closeNotes,
                                            })
                                        }
                                    />
                                </div>
                                <DataTable
                                    columns={reconciliationEditColumns}
                                    data={reconciliationData.products}
                                />
                                <Button
                                    color="primary"
                                    onPress={saveReconciliation}
                                    isLoading={updateReconciliationMutation.isPending}
                                >
                                    Save Report
                                </Button>
                            </div>
                        )}
                        <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                            <p className="flex items-center gap-1 text-xs text-slate-500">
                                <UserRound className="h-3.5 w-3.5" />
                                Cashier
                            </p>
                            <p className="text-sm font-semibold !text-slate-900 dark:!text-slate-100">
                                {reconciliationCashierLabel}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                <p className="flex items-center gap-1 text-xs text-slate-500">
                                    <Wallet className="h-3.5 w-3.5" />
                                    Collected Total
                                </p>
                                <p
                                    className={`text-lg font-semibold ${
                                        hasDeclaredTotalMismatch
                                            ? "!text-red-600 dark:!text-red-400"
                                            : "!text-slate-900 dark:!text-slate-100"
                                    }`}
                                >
                                    ETB {reconciliationData.money.collectedTotal.toFixed(2)}
                                </p>
                            </div>
                            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                <p className="flex items-center gap-1 text-xs text-slate-500">
                                    <HandCoins className="h-3.5 w-3.5" />
                                    Unpaid Value
                                </p>
                                <p className="text-lg font-semibold !text-slate-900 dark:!text-slate-100">
                                    ETB {reconciliationData.money.unpaidValue.toFixed(2)}
                                </p>
                            </div>
                            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                <p className="flex items-center gap-1 text-xs text-slate-500">
                                    <CircleAlert className="h-3.5 w-3.5" />
                                    Variance Value
                                </p>
                                <p className="text-lg font-semibold !text-slate-900 dark:!text-slate-100">
                                    ETB {reconciliationData.totals.varianceTotalValue.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
                                <p className="flex items-center gap-1 text-xs text-slate-500">
                                    <Banknote className="h-3.5 w-3.5" />
                                    Cash Declared
                                </p>
                                <p
                                    className={`text-sm font-semibold ${
                                        hasDeclaredTotalMismatch
                                            ? "!text-red-600 dark:!text-red-400"
                                            : "!text-slate-900 dark:!text-slate-100"
                                    }`}
                                >
                                    ETB {reconciliationData.money.cashDeclared.toFixed(2)}
                                </p>
                            </div>
                            <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
                                <p className="flex items-center gap-1 text-xs text-slate-500">
                                    <Smartphone className="h-3.5 w-3.5" />
                                    Digital Declared
                                </p>
                                <p
                                    className={`text-sm font-semibold ${
                                        hasDeclaredTotalMismatch
                                            ? "!text-red-600 dark:!text-red-400"
                                            : "!text-slate-900 dark:!text-slate-100"
                                    }`}
                                >
                                    ETB {reconciliationData.money.digitalDeclared.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <div className="max-h-[32rem] overflow-y-auto">
                            <DataTable
                                columns={reconciliationColumns}
                                data={reconciliationData.products}
                                getRowClassName={(row) =>
                                    [row.producedInShift, row.paidSoldQty, row.unpaidQty].some(
                                        (value) => value !== 0
                                    )
                                        ? "bg-sky-100 dark:bg-sky-600/10"
                                        : "bg-slate-50/30 dark:bg-slate-900/20"
                                }
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
