import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, CardBody, Chip, Divider, Input, Skeleton } from "@heroui/react";
import { ArrowLeft, Download, Save } from "lucide-react";
import { PageTitle } from "../components/ui/PageTitle";
import { CalendarView } from "../components/payroll/CalendarView";
import { apiClient, getImageBaseUrl } from "../lib/apiClient";
import {
    useEmployee,
    usePayrollDetail,
    usePayrollSummary,
    useUpdatePayrollRecord,
} from "../hooks/useEmployees";
import type { PayrollRecord } from "../types/employee";

function formatMonthLabel(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export function EmployeeDetailPage() {
    const navigate = useNavigate();
    const params = useParams();
    const employeeId = params.employeeId ? parseInt(params.employeeId) : null;
    const receiptInputRef = useRef<HTMLInputElement>(null);

    const { data: employee, isLoading: isEmployeeLoading } = useEmployee(employeeId);
    const { data: payrollSummary, isLoading: isPayrollLoading } = usePayrollSummary(employeeId);

    const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

    const latestRecordId = payrollSummary?.latestRecordId ?? null;

    const effectiveExpandedId = expandedRecordId ?? latestRecordId;

    const payrollDetailQuery = usePayrollDetail(
        employeeId,
        effectiveExpandedId,
        !!effectiveExpandedId
    );

    const payrollDetail = payrollDetailQuery.data;
    const isPayrollDetailLoading = payrollDetailQuery.isLoading;

    const updatePayroll = useUpdatePayrollRecord();

    const [amountPaidInput, setAmountPaidInput] = useState<string>("");
    const [notesInput, setNotesInput] = useState<string>("");
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

    const records = useMemo(() => payrollSummary?.records || [], [payrollSummary]);

    const selectedRecord: PayrollRecord | null = useMemo(() => {
        if (!effectiveExpandedId) return null;
        return records.find((r) => r.id === effectiveExpandedId) || null;
    }, [records, effectiveExpandedId]);

    const onToggleRecord = (id: number) => {
        setExpandedRecordId((prev) => (prev === id ? null : id));
    };

    useEffect(() => {
        setAmountPaidInput("");
        setNotesInput("");
        setReceiptFile(null);
        setReceiptPreviewUrl(null);
        if (receiptInputRef.current) receiptInputRef.current.value = "";
    }, [effectiveExpandedId]);

    useEffect(() => {
        if (!receiptFile || !receiptFile.type.startsWith("image/")) {
            setReceiptPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(receiptFile);
        setReceiptPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [receiptFile]);

    useEffect(() => {
        if (!effectiveExpandedId) return;
        const el = document.getElementById(`payroll-record-${effectiveExpandedId}`);
        if (!el) return;

        const t = window.setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return () => window.clearTimeout(t);
    }, [effectiveExpandedId]);

    const handleSavePayroll = async () => {
        if (!selectedRecord) return;
        const form = new FormData();

        if (amountPaidInput.trim()) {
            form.append("amount_paid", amountPaidInput.trim());
        }

        if (notesInput.trim()) {
            form.append("notes", notesInput.trim());
        }

        if (receiptFile) {
            form.append("receipt", receiptFile);
        }

        const paidAmount = parseFloat(amountPaidInput || "0");
        if (!Number.isNaN(paidAmount) && paidAmount > 0) {
            form.append("status", "paid");
        }

        await updatePayroll.mutateAsync({ id: selectedRecord.id, data: form });
    };

    const onSelectReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setReceiptFile(file);
    };

    const resolveFileUrl = (maybeUrl: string) => {
        if (!maybeUrl) return "";
        if (maybeUrl.startsWith("http://") || maybeUrl.startsWith("https://")) return maybeUrl;
        if (maybeUrl.startsWith("/")) return `${getImageBaseUrl()}${maybeUrl}`;
        return `${getImageBaseUrl()}/${maybeUrl}`;
    };

    const inferFilename = (url: string, fallback: string) => {
        try {
            const u = new URL(url);
            const last = u.pathname.split("/").filter(Boolean).pop();
            return last || fallback;
        } catch {
            const last = url.split("/").filter(Boolean).pop();
            return last || fallback;
        }
    };

    const isLikelyImageUrl = (url: string) => {
        const clean = url.split("?")[0].split("#")[0].toLowerCase();
        return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"].some((ext) =>
            clean.endsWith(ext)
        );
    };

    const downloadFromUrl = async (url: string, fallbackName: string) => {
        const filename = inferFilename(url, fallbackName);
        const response = await apiClient.get(url, { responseType: "blob" });
        const blobUrl = URL.createObjectURL(response.data as Blob);

        try {
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } finally {
            URL.revokeObjectURL(blobUrl);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button
                    variant="flat"
                    onPress={() => navigate("/app/employees")}
                    startContent={<ArrowLeft className="h-4 w-4" />}
                >
                    Back
                </Button>
                <Divider orientation="vertical" className="h-8" />
                <PageTitle
                    title={employee?.fullName ? employee.fullName : "Employee"}
                    subtitle="Payroll, attendance, leaves and waste performance"
                />
            </div>

            <Card>
                <CardBody className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs text-slate-500">Position</p>
                        {isEmployeeLoading ? (
                            <Skeleton className="h-6 w-48 rounded" />
                        ) : (
                            <p className="text-sm font-medium">{employee?.position || "-"}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Phone</p>
                        {isEmployeeLoading ? (
                            <Skeleton className="h-6 w-48 rounded" />
                        ) : (
                            <p className="text-sm font-medium">{employee?.phoneNumber || "-"}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Monthly Base Salary</p>
                        {isEmployeeLoading ? (
                            <Skeleton className="h-6 w-48 rounded" />
                        ) : (
                            <p className="text-sm font-medium">
                                {employee?.monthlyBaseSalary
                                    ? new Intl.NumberFormat("en-ET", {
                                          style: "currency",
                                          currency: "ETB",
                                          minimumFractionDigits: 2,
                                      }).format(employee.monthlyBaseSalary)
                                    : "-"}
                            </p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Address</p>
                        {isEmployeeLoading ? (
                            <Skeleton className="h-6 w-48 rounded" />
                        ) : (
                            <p className="text-sm font-medium">{employee?.address || "-"}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Hire Date</p>
                        {isEmployeeLoading ? (
                            <Skeleton className="h-6 w-48 rounded" />
                        ) : (
                            <p className="text-sm font-medium">
                                {employee?.hireDate
                                    ? new Date(employee.hireDate).toLocaleDateString("en-US", {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                      })
                                    : "-"}
                            </p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">User Account</p>
                        {isEmployeeLoading ? (
                            <Skeleton className="h-6 w-48 rounded" />
                        ) : (
                            <div className="text-sm font-medium">
                                {employee?.userSummary ? (
                                    <div>
                                        <div>{employee.userSummary.fullName}</div>
                                        <div className="text-xs text-slate-500">
                                            {employee.userSummary.username} •{" "}
                                            {employee.userSummary.role}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-slate-500">No linked user</span>
                                )}
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>

            <div className="space-y-3">
                <PageTitle
                    title="Payroll"
                    subtitle="Latest month is expanded by default. Details are loaded on demand."
                />

                {isPayrollLoading && (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full rounded" />
                        ))}
                    </div>
                )}

                {!isPayrollLoading && records.length === 0 && (
                    <div className="text-sm text-slate-500">No payroll records found.</div>
                )}

                <div className="space-y-2">
                    {records.map((r) => {
                        const isOpen = effectiveExpandedId === r.id;
                        return (
                            <Card
                                id={`payroll-record-${r.id}`}
                                key={r.id}
                                className={[
                                    "border transition-colors",
                                    isOpen
                                        ? "border-slate-300 dark:border-slate-700 shadow-sm"
                                        : "border-slate-200 dark:border-slate-800",
                                ].join(" ")}
                            >
                                <CardBody className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                                                {formatMonthLabel(r.periodStart)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {r.periodStart} - {r.periodEnd}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Chip
                                                color={r.status === "paid" ? "success" : "warning"}
                                                variant="flat"
                                            >
                                                {r.status.toUpperCase()}
                                            </Chip>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                onPress={() => onToggleRecord(r.id)}
                                            >
                                                {isOpen ? "Collapse" : "Expand"}
                                            </Button>
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div className="space-y-4">
                                            <Divider />

                                            {isPayrollDetailLoading && (
                                                <div className="space-y-2">
                                                    <Skeleton className="h-6 w-full rounded" />
                                                    <Skeleton className="h-6 w-4/5 rounded" />
                                                    <Skeleton className="h-6 w-3/5 rounded" />
                                                </div>
                                            )}

                                            {!isPayrollDetailLoading &&
                                                payrollDetailQuery.isError && (
                                                    <div className="text-sm text-danger">
                                                        Failed to load payroll details for this
                                                        record.
                                                    </div>
                                                )}

                                            {!isPayrollDetailLoading &&
                                                !payrollDetailQuery.isError &&
                                                !payrollDetail && (
                                                    <div className="text-sm text-slate-500">
                                                        No details available for this payroll
                                                        record.
                                                    </div>
                                                )}

                                            {!isPayrollDetailLoading && payrollDetail && (
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    <Card className="bg-slate-50 dark:bg-slate-900/30">
                                                        <CardBody className="space-y-2">
                                                            <p className="text-sm font-semibold">
                                                                Attendance Summary
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Total records:{" "}
                                                                {
                                                                    payrollDetail.attendanceSummary
                                                                        .total
                                                                }
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {payrollDetail.attendanceSummary.statuses.map(
                                                                    (s) => (
                                                                        <Chip
                                                                            key={s.status}
                                                                            variant="flat"
                                                                            size="sm"
                                                                        >
                                                                            {s.status}: {s.count}
                                                                        </Chip>
                                                                    )
                                                                )}
                                                            </div>
                                                        </CardBody>
                                                    </Card>

                                                    <Card className="bg-slate-50 dark:bg-slate-900/30">
                                                        <CardBody className="space-y-2">
                                                            <p className="text-sm font-semibold">
                                                                Leave Summary
                                                            </p>
                                                            {Object.keys(
                                                                payrollDetail.leaveSummary || {}
                                                            ).length === 0 ? (
                                                                <p className="text-xs text-slate-500">
                                                                    No leaves in this period.
                                                                </p>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {Object.entries(
                                                                        payrollDetail.leaveSummary
                                                                    ).map(([k, v]) => (
                                                                        <Chip
                                                                            key={k}
                                                                            variant="flat"
                                                                            size="sm"
                                                                        >
                                                                            {k}: {v}
                                                                        </Chip>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </CardBody>
                                                    </Card>

                                                    {employee?.userId && (
                                                        <Card className="bg-slate-50 dark:bg-slate-900/30 lg:col-span-2">
                                                            <CardBody className="space-y-2">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="text-sm font-semibold">
                                                                        Waste (User-linked)
                                                                    </p>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="flat"
                                                                        startContent={
                                                                            <Download className="h-4 w-4" />
                                                                        }
                                                                        isDisabled
                                                                    >
                                                                        Export
                                                                    </Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">
                                                                            Total Wastage Volume
                                                                        </p>
                                                                        <p className="text-sm font-medium">
                                                                            {
                                                                                payrollDetail
                                                                                    .wasteSummary
                                                                                    .totalWastageVolume
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">
                                                                            Total Wastage Value
                                                                        </p>
                                                                        <p className="text-sm font-medium">
                                                                            {
                                                                                payrollDetail
                                                                                    .wasteSummary
                                                                                    .totalWastageValue
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </CardBody>
                                                        </Card>
                                                    )}

                                                    <Card className="lg:col-span-2">
                                                        <CardBody>
                                                            <p className="text-lg font-semibold mb-4">
                                                                Monthly Calendar
                                                            </p>
                                                            <CalendarView
                                                                dailyData={
                                                                    payrollDetail.dailyCalendar
                                                                }
                                                                periodStart={
                                                                    payrollDetail.payrollRecord
                                                                        .periodStart
                                                                }
                                                                periodEnd={
                                                                    payrollDetail.payrollRecord
                                                                        .periodEnd
                                                                }
                                                            />
                                                        </CardBody>
                                                    </Card>

                                                    <Card className="lg:col-span-2">
                                                        <CardBody className="space-y-3">
                                                            <p className="text-sm font-semibold">
                                                                Payment
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <Input
                                                                    label="Amount Paid"
                                                                    type="number"
                                                                    value={amountPaidInput}
                                                                    onValueChange={
                                                                        setAmountPaidInput
                                                                    }
                                                                    placeholder={String(
                                                                        r.amountPaid ?? "0"
                                                                    )}
                                                                    classNames={{
                                                                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                                                    }}
                                                                />
                                                                <div className="space-y-2">
                                                                    <input
                                                                        ref={receiptInputRef}
                                                                        type="file"
                                                                        onChange={onSelectReceipt}
                                                                        className="hidden"
                                                                        accept="image/*,application/pdf"
                                                                    />
                                                                    <Button
                                                                        variant="bordered"
                                                                        color="primary"
                                                                        onPress={() =>
                                                                            receiptInputRef.current?.click()
                                                                        }
                                                                    >
                                                                        {receiptFile
                                                                            ? `Receipt: ${receiptFile.name}`
                                                                            : "Upload Receipt (optional)"}
                                                                    </Button>
                                                                    {receiptFile && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="light"
                                                                            onPress={() => {
                                                                                setReceiptFile(
                                                                                    null
                                                                                );
                                                                                if (
                                                                                    receiptInputRef.current
                                                                                )
                                                                                    receiptInputRef.current.value =
                                                                                        "";
                                                                            }}
                                                                        >
                                                                            Remove receipt
                                                                        </Button>
                                                                    )}

                                                                    {receiptPreviewUrl && (
                                                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                                                            <img
                                                                                src={
                                                                                    receiptPreviewUrl
                                                                                }
                                                                                alt="Receipt preview"
                                                                                className="w-full max-h-40 object-contain bg-white dark:bg-slate-900"
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {!receiptPreviewUrl &&
                                                                        payrollDetail.payrollRecord
                                                                            .receipt &&
                                                                        isLikelyImageUrl(
                                                                            String(
                                                                                payrollDetail
                                                                                    .payrollRecord
                                                                                    .receipt
                                                                            )
                                                                        ) && (
                                                                            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                                                                <img
                                                                                    src={resolveFileUrl(
                                                                                        String(
                                                                                            payrollDetail
                                                                                                .payrollRecord
                                                                                                .receipt
                                                                                        )
                                                                                    )}
                                                                                    alt="Receipt preview"
                                                                                    className="w-full max-h-40 object-contain bg-white dark:bg-slate-900"
                                                                                />
                                                                            </div>
                                                                        )}

                                                                    {payrollDetail.payrollRecord
                                                                        .receipt && (
                                                                        <div className="flex items-center gap-2">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="light"
                                                                                color="primary"
                                                                                startContent={
                                                                                    <Download className="h-4 w-4" />
                                                                                }
                                                                                onPress={() =>
                                                                                    downloadFromUrl(
                                                                                        resolveFileUrl(
                                                                                            payrollDetail
                                                                                                .payrollRecord
                                                                                                .receipt as string
                                                                                        ),
                                                                                        `receipt-${payrollDetail.payrollRecord.id}`
                                                                                    )
                                                                                }
                                                                            >
                                                                                Download receipt
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <Input
                                                                    label="Notes (optional)"
                                                                    value={notesInput}
                                                                    onValueChange={setNotesInput}
                                                                    placeholder={r.notes || ""}
                                                                    classNames={{
                                                                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-end">
                                                                <Button
                                                                    color="primary"
                                                                    onPress={handleSavePayroll}
                                                                    startContent={
                                                                        <Save className="h-4 w-4" />
                                                                    }
                                                                    isLoading={
                                                                        updatePayroll.isPending
                                                                    }
                                                                >
                                                                    Save Payment
                                                                </Button>
                                                            </div>
                                                        </CardBody>
                                                    </Card>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
