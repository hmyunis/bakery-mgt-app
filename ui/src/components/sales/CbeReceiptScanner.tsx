import { Button, Spinner } from "@heroui/react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import {
    AlertTriangle,
    CalendarClock,
    Camera,
    CreditCard,
    ExternalLink,
    Landmark,
    Receipt,
    ScanLine,
    User,
    X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { tr } from "../../locales";
import { useCbeTransactionLookup } from "../../hooks/useSales";
import type { CbeTransactionDetail } from "../../types/sales";

const CBE_RECEIPT_HOST = "mbreciept.cbe.com.et";
const CBE_IDENTIFIER_PATTERN = /^v2-[A-Za-z0-9_-]{8,128}$/;

const extractCbeReceiptIdentifier = (
    rawText: string
): { identifier: string; receiptUrl: string } => {
    const trimmed = rawText.trim();

    try {
        const parsed = new URL(trimmed);
        const identifier = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
        if (parsed.hostname === CBE_RECEIPT_HOST && CBE_IDENTIFIER_PATTERN.test(identifier)) {
            return { identifier, receiptUrl: parsed.toString() };
        }
    } catch {
        // QR scanners can also return the identifier alone.
    }

    if (CBE_IDENTIFIER_PATTERN.test(trimmed)) {
        return { identifier: trimmed, receiptUrl: `https://${CBE_RECEIPT_HOST}/${trimmed}` };
    }

    throw new Error(tr("This QR code is not a valid CBE receipt."));
};

const formatMoney = (amount?: string, currency?: string, formatted?: string) => {
    if (formatted) return formatted;
    if (!amount) return tr("Unknown");
    return currency ? `${currency} ${amount}` : amount;
};

const getTransactionDate = (detail: CbeTransactionDetail | null) => {
    const raw = detail?.dateTimes?.[0];
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
};

const isSameLocalDay = (a: Date, b: Date) => {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
};

const shouldUseRearCamera = () => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;
};

const DetailRow = ({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: ReactNode;
}) => (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <div className="mt-0.5 text-slate-500 dark:text-slate-400">{icon}</div>
        <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <div className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                {value}
            </div>
        </div>
    </div>
);

export function CbeReceiptScanner() {
    const [isOpen, setIsOpen] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    const [identifier, setIdentifier] = useState<string | null>(null);
    const [detail, setDetail] = useState<CbeTransactionDetail | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const hasScannedRef = useRef(false);
    const { mutateAsync: lookupCbeTransaction, isPending: isLookupPending } =
        useCbeTransactionLookup();

    const transactionDate = useMemo(() => getTransactionDate(detail), [detail]);
    const isToday = transactionDate ? isSameLocalDay(transactionDate, new Date()) : null;

    const stopScanner = () => {
        controlsRef.current?.stop();
        controlsRef.current = null;
    };

    useEffect(() => {
        if (!isOpen) {
            stopScanner();
            return;
        }

        let cancelled = false;
        hasScannedRef.current = false;

        const reader = new BrowserQRCodeReader(undefined, {
            delayBetweenScanAttempts: 250,
            delayBetweenScanSuccess: 500,
        });
        const facingMode = shouldUseRearCamera() ? "environment" : "user";

        reader
            .decodeFromConstraints(
                {
                    audio: false,
                    video: {
                        facingMode: { ideal: facingMode },
                    },
                },
                videoRef.current ?? undefined,
                async (result) => {
                    if (!result || hasScannedRef.current) return;
                    hasScannedRef.current = true;

                    try {
                        const extracted = extractCbeReceiptIdentifier(result.getText());
                        setIdentifier(extracted.identifier);
                        setReceiptUrl(extracted.receiptUrl);
                        stopScanner();
                        const transactionDetail = await lookupCbeTransaction(extracted.identifier);
                        setDetail(transactionDetail);
                    } catch (error) {
                        hasScannedRef.current = false;
                        const message =
                            error instanceof Error
                                ? error.message
                                : tr("Unable to verify CBE receipt.");
                        setScannerError(message);
                        toast.error(message);
                    }
                }
            )
            .then((controls) => {
                if (cancelled) {
                    controls.stop();
                    return;
                }
                controlsRef.current = controls;
            })
            .catch((error: unknown) => {
                const message =
                    error instanceof Error && error.message
                        ? error.message
                        : tr("Unable to open the camera.");
                setScannerError(message);
            });

        return () => {
            cancelled = true;
            stopScanner();
        };
    }, [isOpen, lookupCbeTransaction]);

    const openScanner = () => {
        setIsOpen(true);
        setDetail(null);
        setReceiptUrl(null);
        setIdentifier(null);
        setScannerError(null);
    };

    const closeScanner = () => {
        setIsOpen(false);
        stopScanner();
    };

    const resetScan = () => {
        setDetail(null);
        setReceiptUrl(null);
        setIdentifier(null);
        setScannerError(null);
        hasScannedRef.current = false;
        stopScanner();
        setIsOpen(false);
        window.setTimeout(() => setIsOpen(true), 0);
    };

    return (
        <>
            {!isOpen && (
                <Button
                    isIconOnly
                    aria-label={tr("Scan CBE receipt")}
                    className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-4 z-[55] !h-14 !w-14 !min-w-14 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 md:hidden"
                    onPress={openScanner}
                >
                    <Camera className="h-6 w-6" />
                </Button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        type="button"
                        aria-label={tr("Close")}
                        className="absolute inset-0 h-full w-full bg-black/50"
                        onClick={closeScanner}
                    />
                    <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-2xl border border-slate-200 bg-background shadow-2xl dark:border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <ScanLine className="h-5 w-5 text-primary" />
                                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                    {tr("CBE Receipt Check")}
                                </h3>
                            </div>
                            <Button
                                isIconOnly
                                aria-label={tr("Close")}
                                variant="solid"
                                onPress={closeScanner}
                                className="!h-10 !w-10 !min-w-10 rounded-full bg-slate-900 text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="max-h-[calc(92dvh-3.5rem)] space-y-4 overflow-y-auto p-4">
                            {!detail && (
                                <div className="overflow-hidden rounded-lg bg-black">
                                    <video
                                        ref={videoRef}
                                        className="aspect-[4/3] w-full object-cover"
                                        muted
                                        playsInline
                                    />
                                </div>
                            )}

                            {isLookupPending && (
                                <div className="flex items-center justify-center gap-3 rounded-lg border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                    <Spinner size="sm" />
                                    {tr("Loading CBE transaction details...")}
                                </div>
                            )}

                            {scannerError && !isLookupPending && (
                                <div className="flex gap-3 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-danger-900/50 dark:bg-danger-950/30 dark:text-danger-200">
                                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                                    <p>{scannerError}</p>
                                </div>
                            )}

                            {detail && (
                                <div className="space-y-3">
                                    <div
                                        className={`rounded-lg border p-3 text-sm ${
                                            isToday
                                                ? "border-success-200 bg-success-50 text-success-700 dark:border-success-900/50 dark:bg-success-950/30 dark:text-success-200"
                                                : "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-900/50 dark:bg-warning-950/30 dark:text-warning-200"
                                        }`}
                                    >
                                        {isToday
                                            ? tr("Payment date is today.")
                                            : tr("Payment date is not today.")}
                                    </div>

                                    <DetailRow
                                        icon={<Receipt className="h-4 w-4" />}
                                        label={tr("Reference")}
                                        value={detail.id || identifier || tr("Unknown")}
                                    />
                                    <DetailRow
                                        icon={<CreditCard className="h-4 w-4" />}
                                        label={tr("Credited Amount")}
                                        value={formatMoney(
                                            detail.amountCredited,
                                            detail.creditCurrency,
                                            detail.amountCreditedWithCurrency
                                        )}
                                    />
                                    <DetailRow
                                        icon={<CreditCard className="h-4 w-4" />}
                                        label={tr("Total Debited")}
                                        value={formatMoney(
                                            detail.amountDebited,
                                            detail.debitCurrency,
                                            detail.amountDebitedWithCurrency
                                        )}
                                    />
                                    <DetailRow
                                        icon={<Landmark className="h-4 w-4" />}
                                        label={tr("Fees and Tax")}
                                        value={
                                            <div className="space-y-1">
                                                <p>
                                                    {tr("Fees")}:{" "}
                                                    {detail.totalChargeAmountWithCurrency ||
                                                        formatMoney(
                                                            detail.totalChargeAmount,
                                                            detail.debitCurrency
                                                        )}
                                                </p>
                                                <p>
                                                    {tr("Tax")}:{" "}
                                                    {detail.totalTaxAmountWithCurrency ||
                                                        formatMoney(
                                                            detail.totalTaxAmount,
                                                            detail.debitCurrency
                                                        )}
                                                </p>
                                            </div>
                                        }
                                    />
                                    <DetailRow
                                        icon={<CalendarClock className="h-4 w-4" />}
                                        label={tr("Payment Date & Time")}
                                        value={
                                            transactionDate
                                                ? transactionDate.toLocaleString()
                                                : tr("Unknown")
                                        }
                                    />
                                    <DetailRow
                                        icon={<User className="h-4 w-4" />}
                                        label={tr("Payer")}
                                        value={`${detail.debitAccountHolder || tr("Unknown")} ${
                                            detail.debitAccountNo
                                                ? `(${detail.debitAccountNo})`
                                                : ""
                                        }`}
                                    />
                                    <DetailRow
                                        icon={<User className="h-4 w-4" />}
                                        label={tr("Receiver")}
                                        value={`${detail.creditAccountHolder || tr("Unknown")} ${
                                            detail.creditAccountNo
                                                ? `(${detail.creditAccountNo})`
                                                : ""
                                        }`}
                                    />

                                    {receiptUrl && (
                                        <Button
                                            as="a"
                                            href={receiptUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            color="primary"
                                            variant="flat"
                                            className="w-full !max-w-none justify-center"
                                            endContent={<ExternalLink className="h-4 w-4" />}
                                        >
                                            {tr("Open official receipt")}
                                        </Button>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                {(detail || scannerError) && (
                                    <Button variant="bordered" onPress={resetScan}>
                                        {tr("Scan again")}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
