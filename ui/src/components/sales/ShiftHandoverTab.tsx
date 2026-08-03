import { useMemo, useState } from "react";
import { Button, Input, Select, SelectItem, Spinner } from "@heroui/react";
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

const toWholeNumber = (value: string | undefined, fallback = 0) => {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

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
                    Shift State
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Opened: {openedSession ? `#${openedSession.id}` : "None"} | Pending Acceptance:{" "}
                    {pendingSession ? `#${pendingSession.id}` : "None"}
                </p>
            </div>

            {!openedSession && user?.role === "staff" && (
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
                    <Input
                        label="Open Notes"
                        value={openNotes}
                        onValueChange={setOpenNotes}
                        placeholder="Optional notes"
                        classNames={visibleInputClassNames}
                    />
                    <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
                        <table className="w-full min-w-[420px] text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-3 py-2 text-left">Product</th>
                                    <th className="px-3 py-2 text-right">Opening Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="border-t border-slate-200 dark:border-slate-800"
                                    >
                                        <td className="px-3 py-2">{product.name}</td>
                                        <td className="px-3 py-2">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={resolvedOpeningCounts[product.id] ?? "0"}
                                                onValueChange={(value) =>
                                                    setOpeningCounts((prev) => ({
                                                        ...prev,
                                                        [product.id]: value,
                                                    }))
                                                }
                                                classNames={{
                                                    input: "text-right !text-slate-900 dark:!text-slate-100",
                                                    label: "!text-slate-700 dark:!text-slate-300",
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button
                        color="primary"
                        onPress={handleOpenShift}
                        isLoading={openShiftMutation.isPending}
                        isDisabled={!products.length || pendingSessionCount >= 3}
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
                            label="Cash Declared"
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
                            label="Digital Declared"
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
                    <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
                        <table className="w-full min-w-[420px] text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-3 py-2 text-left">Product</th>
                                    <th className="px-3 py-2 text-right">Closing Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="border-t border-slate-200 dark:border-slate-800"
                                    >
                                        <td className="px-3 py-2">{product.name}</td>
                                        <td className="px-3 py-2">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={resolvedClosingCounts[product.id] ?? "0"}
                                                onValueChange={(value) =>
                                                    setClosingCountOverrides((prev) => {
                                                        if (!openedSession) return prev;
                                                        return {
                                                            ...prev,
                                                            [openedSession.id]: {
                                                                ...(prev[openedSession.id] || {}),
                                                                [product.id]: value,
                                                            },
                                                        };
                                                    })
                                                }
                                                classNames={{
                                                    input: "text-right !text-slate-900 dark:!text-slate-100",
                                                    label: "!text-slate-700 dark:!text-slate-300",
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button
                        color="warning"
                        onPress={handleCloseShift}
                        isLoading={closeShiftMutation.isPending}
                    >
                        Close & Send for Acceptance
                    </Button>
                </div>
            )}

            {pendingSession && (
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
                        isDisabled={!canAcceptPendingSession}
                    >
                        Accept Handover
                    </Button>
                </div>
            )}

            <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Reconciliation Report
                </h3>
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
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                <p className="text-xs text-slate-500">Collected Total</p>
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
                                <p className="text-xs text-slate-500">Unpaid Value</p>
                                <p className="text-lg font-semibold !text-slate-900 dark:!text-slate-100">
                                    ETB {reconciliationData.money.unpaidValue.toFixed(2)}
                                </p>
                            </div>
                            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                <p className="text-xs text-slate-500">Variance Value</p>
                                <p className="text-lg font-semibold !text-slate-900 dark:!text-slate-100">
                                    ETB {reconciliationData.totals.varianceTotalValue.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
                            <table className="w-full min-w-[900px] text-sm text-slate-900 dark:text-slate-100">
                                <thead className="bg-slate-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Product</th>
                                        <th className="px-3 py-2 text-right">Open</th>
                                        <th className="px-3 py-2 text-right">Produced</th>
                                        <th className="px-3 py-2 text-right">Paid Sold</th>
                                        <th className="px-3 py-2 text-right">Unpaid</th>
                                        <th className="px-3 py-2 text-right">Expected</th>
                                        <th className="px-3 py-2 text-right">Counted</th>
                                        <th className="px-3 py-2 text-right">Variance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reconciliationData.products.map((row) => (
                                        <tr
                                            key={row.productId}
                                            className="border-t border-slate-200 dark:border-slate-800"
                                        >
                                            <td className="px-3 py-2">{row.productName}</td>
                                            <td className="px-3 py-2 text-right">
                                                {row.openingCount}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {row.producedInShift}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {row.paidSoldQty}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {row.unpaidQty}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {row.expectedClosingCount}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {row.countedClosingCount ?? "-"}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {row.varianceQty ?? "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
