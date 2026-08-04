import { tr } from "../../locales";
import { useMemo, useState } from "react";
import { Button, Input, Select, SelectItem, Spinner } from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import {
    useAcceptShiftSession,
    useActiveShiftSession,
    useCloseShiftSession,
    useOpenShiftSession,
    useShiftSessionReconciliation,
    useShiftSessions,
} from "../../hooks/useSales";
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
    { accessorKey: "productName", header: tr("Product") },
    { accessorKey: "openingCount", header: tr("Open") },
    { accessorKey: "producedInShift", header: tr("Produced") },
    { accessorKey: "paidSoldQty", header: tr("Paid Sold") },
    { accessorKey: "unpaidQty", header: tr("Unpaid") },
    { accessorKey: "expectedClosingCount", header: tr("Expected") },
    {
        accessorKey: "countedClosingCount",
        header: tr("Counted"),
        cell: ({ row }) => row.original.countedClosingCount ?? "-",
    },
    {
        accessorKey: "varianceQty",
        header: tr("Variance"),
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
    const [closingCountOverrides, setClosingCountOverrides] = useState<
        Record<number, Record<number, string>>
    >({});
    const [selectedSessionIdOverride, setSelectedSessionIdOverride] = useState<number | null>(null);

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
    const sessions = useMemo(() => sessionsData?.results || [], [sessionsData]);
    const pendingSessionCount = useMemo(
        () => sessions.filter((session) => session.status === "pending_handover_acceptance").length,
        [sessions]
    );
    const lastClosed = useMemo(
        () => sessions.find((s) => s.status === "closed") || null,
        [sessions]
    );

    const openShiftMutation = useOpenShiftSession();
    const closeShiftMutation = useCloseShiftSession();
    const acceptShiftMutation = useAcceptShiftSession();

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
            const row = openedSession.productCounts.find((count) => count.product === product.id);
            const value = row?.closingCount ?? row?.expectedClosingCount ?? row?.openingCount ?? 0;
            initial[product.id] = overrides[product.id] ?? String(Math.max(0, value));
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
              : "0"))
        : "0";
    const resolvedDigitalDeclared = openedSession
        ? (digitalDeclaredBySession[openedSession.id] ??
          (openedSession.totalDigitalDeclared !== null &&
          openedSession.totalDigitalDeclared !== undefined
              ? openedSession.totalDigitalDeclared.toFixed(2)
              : "0"))
        : "0";

    const selectedSessionId =
        selectedSessionIdOverride ??
        pendingSession?.id ??
        openedSession?.id ??
        lastClosed?.id ??
        null;

    const { data: reconciliationData, isLoading: isLoadingReconciliation } =
        useShiftSessionReconciliation(selectedSessionId, {
            enabled: !!selectedSessionId,
        });

    const canCloseOpenedSession =
        !!openedSession &&
        (isAdmin || (currentUserId !== null && openedSession.openedBy === currentUserId));

    const canAcceptPendingSession =
        !!pendingSession &&
        (isAdmin ||
            (currentUserId !== null &&
                pendingSession.openedBy !== currentUserId &&
                user.role === "staff"));
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

    const handleOpenShift = async () => {
        const payload = {
            open_notes: openNotes,
            counts: products.map((product) => ({
                product_id: product.id,
                opening_count: toWholeNumber(resolvedOpeningCounts[product.id], 0),
            })),
        };
        await openShiftMutation.mutateAsync(payload);
        setOpenNotes("");
    };

    const handleCloseShift = async () => {
        if (!openedSession) return;
        const payload = {
            close_notes: resolvedCloseNotes,
            total_cash_declared: Number.parseFloat(resolvedCashDeclared || "0") || 0,
            total_digital_declared: Number.parseFloat(resolvedDigitalDeclared || "0") || 0,
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

    const openingColumns: ColumnDef<Product>[] = [
        { accessorKey: "name", header: tr("Product") },
        {
            id: "openingCount",
            header: tr("Opening Count"),
            cell: ({ row }) => (
                <Input
                    type="number"
                    min={0}
                    aria-label={`Opening count for ${row.original.name}`}
                    value={resolvedOpeningCounts[row.original.id] ?? "0"}
                    onValueChange={(value) =>
                        setOpeningCounts((prev) => ({ ...prev, [row.original.id]: value }))
                    }
                    classNames={{
                        input: "text-right !text-slate-900 dark:!text-slate-100",
                        label: "!text-slate-700 dark:!text-slate-300",
                    }}
                />
            ),
        },
    ];

    const closingColumns: ColumnDef<Product>[] = [
        { accessorKey: "name", header: tr("Product") },
        {
            id: "closingCount",
            header: tr("Closing Count"),
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

    if (isLoadingProducts || isLoadingActive) {
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
                    {tr("Shift State")}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {tr("Opened:")}
                    {openedSession ? `#${openedSession.id}` : tr("None")}{" "}
                    {tr("| Pending Acceptance:")}{" "}
                    {pendingSession ? `#${pendingSession.id}` : tr("None")}
                </p>
            </div>

            {!openedSession && user?.role === "staff" && (
                <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {tr("Open Shift")}
                    </h3>
                    {pendingSessionCount >= 3 && (
                        <p className="text-sm text-danger-600 dark:text-danger-400">
                            {tr(
                                "You cannot open a new shift while 3 sessions are pending handover acceptance."
                            )}
                        </p>
                    )}
                    <Input
                        label={tr("Open Notes")}
                        value={openNotes}
                        onValueChange={setOpenNotes}
                        placeholder={tr("Optional notes")}
                        classNames={visibleInputClassNames}
                    />
                    <div className="max-h-96 overflow-y-auto">
                        <DataTable columns={openingColumns} data={products} />
                    </div>
                    <Button
                        color="primary"
                        onPress={handleOpenShift}
                        isLoading={openShiftMutation.isPending}
                        isDisabled={!products.length || pendingSessionCount >= 3}
                    >
                        {tr("Open Shift Session")}
                    </Button>
                </div>
            )}

            {openedSession && canCloseOpenedSession && (
                <div className="space-y-3 rounded-lg border border-warning-300/60 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {tr("Close Shift #")}
                        {openedSession.id}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                            type="number"
                            min={0}
                            label={tr("Cash Declared")}
                            value={resolvedCashDeclared}
                            onValueChange={(value) => {
                                if (!openedSession) return;
                                setCashDeclaredBySession((prev) => ({
                                    ...prev,
                                    [openedSession.id]: value,
                                }));
                            }}
                            classNames={visibleInputClassNames}
                        />
                        <Input
                            type="number"
                            min={0}
                            label={tr("Digital Declared")}
                            value={resolvedDigitalDeclared}
                            onValueChange={(value) => {
                                if (!openedSession) return;
                                setDigitalDeclaredBySession((prev) => ({
                                    ...prev,
                                    [openedSession.id]: value,
                                }));
                            }}
                            classNames={visibleInputClassNames}
                        />
                    </div>
                    <Input
                        label={tr("Close Notes")}
                        value={resolvedCloseNotes}
                        onValueChange={(value) => {
                            if (!openedSession) return;
                            setCloseNotesBySession((prev) => ({
                                ...prev,
                                [openedSession.id]: value,
                            }));
                        }}
                        placeholder={tr("Optional notes")}
                        classNames={visibleInputClassNames}
                    />
                    <div className="max-h-96 overflow-y-auto">
                        <DataTable columns={closingColumns} data={products} />
                    </div>
                    <Button
                        color="warning"
                        onPress={handleCloseShift}
                        isLoading={closeShiftMutation.isPending}
                    >
                        {tr("Close & Send for Acceptance")}
                    </Button>
                </div>
            )}

            {pendingSession && (
                <div className="space-y-3 rounded-lg border border-primary-300/60 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {tr("Pending Handover Acceptance #")}
                        {pendingSession.id}
                    </h3>
                    <Input
                        label={tr("Acceptance Notes")}
                        value={acceptanceNotes}
                        onValueChange={setAcceptanceNotes}
                        placeholder={tr("Optional notes")}
                        classNames={visibleInputClassNames}
                    />
                    <Button
                        color="primary"
                        onPress={handleAcceptShift}
                        isLoading={acceptShiftMutation.isPending}
                        isDisabled={!canAcceptPendingSession}
                    >
                        {tr("Accept Handover")}
                    </Button>
                </div>
            )}

            <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {tr("Reconciliation Report")}
                </h3>
                <Select
                    label={tr("Session")}
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
                        {tr("Select a session to view reconciliation.")}
                    </p>
                ) : (
                    <div className="space-y-3 [&_th]:!text-slate-700 dark:[&_th]:!text-slate-300 [&_td]:!text-slate-900 dark:[&_td]:!text-slate-100">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                <p className="text-xs text-slate-500">{tr("Collected Total")}</p>
                                <p
                                    className={`text-lg font-semibold ${
                                        hasDeclaredTotalMismatch
                                            ? "!text-red-600 dark:!text-red-400"
                                            : "!text-slate-900 dark:!text-slate-100"
                                    }`}
                                >
                                    {tr("ETB")}
                                    {reconciliationData.money.collectedTotal.toFixed(2)}
                                </p>
                            </div>
                            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                <p className="text-xs text-slate-500">{tr("Unpaid Value")}</p>
                                <p className="text-lg font-semibold !text-slate-900 dark:!text-slate-100">
                                    {tr("ETB")}
                                    {reconciliationData.money.unpaidValue.toFixed(2)}
                                </p>
                            </div>
                            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                <p className="text-xs text-slate-500">{tr("Variance Value")}</p>
                                <p className="text-lg font-semibold !text-slate-900 dark:!text-slate-100">
                                    {tr("ETB")}
                                    {reconciliationData.totals.varianceTotalValue.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <div className="max-h-[32rem] overflow-y-auto">
                            <DataTable
                                columns={reconciliationColumns}
                                data={reconciliationData.products}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
