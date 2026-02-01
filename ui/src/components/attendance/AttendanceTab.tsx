import { useMemo, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    DatePicker,
    Input,
    Select,
    SelectItem,
    Textarea,
} from "@heroui/react";
import { getLocalTimeZone, today } from "@internationalized/date";
import { Save } from "lucide-react";
import { DataTable } from "../ui/DataTable";
import { DataTablePagination } from "../ui/DataTablePagination";
import { useEmployees } from "../../hooks/useEmployees";
import { useShiftTemplates } from "../../hooks/useShiftTemplates";
import {
    useAttendance,
    useAttendanceDailySummary,
    useDeleteAttendanceRecord,
    useUpsertAttendance,
    useUpdateAttendanceRecord,
} from "../../hooks/useAttendance";
import type { AttendanceStatus } from "../../types/attendance";
import type { AttendanceRecord } from "../../types/attendance";
import { getAttendanceColumns } from "./AttendanceColumns";
import { AttendanceRecordFormModal } from "./AttendanceRecordFormModal";
import { DeleteAttendanceRecordModal } from "./DeleteAttendanceRecordModal";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: Array<{ key: AttendanceStatus; label: string }> = [
    { key: "present", label: "Present" },
    { key: "late", label: "Late" },
    { key: "absent", label: "Absent" },
    { key: "overtime", label: "Overtime" },
];

export function AttendanceTab() {
    const [dateValue, setDateValue] = useState(() => today(getLocalTimeZone()));
    const dateStr = dateValue.toString();

    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [shiftId, setShiftId] = useState<number | null>(null);
    const [status, setStatus] = useState<AttendanceStatus>("present");
    const [lateMinutes, setLateMinutes] = useState<string>("");
    const [overtimeMinutes, setOvertimeMinutes] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    const [recordsPage, setRecordsPage] = useState(1);
    const [recordsPageSize, setRecordsPageSize] = useState(PAGE_SIZE);

    const { data: employeesData } = useEmployees({ page: 1, pageSize: 100, ordering: "full_name" });
    const employees = useMemo(() => employeesData?.results || [], [employeesData]);

    const { data: shiftsData } = useShiftTemplates({ page: 1, pageSize: 100, ordering: "name" });
    const shifts = useMemo(() => shiftsData?.results || [], [shiftsData]);

    const attendance = useAttendance({
        page: recordsPage,
        pageSize: recordsPageSize,
        employeeId: employeeId ?? "",
        status: "",
        ordering: "-recorded_at",
    });

    const dailySummary = useAttendanceDailySummary(dateStr);

    const upsert = useUpsertAttendance();
    const updateRecord = useUpdateAttendanceRecord();
    const deleteRecord = useDeleteAttendanceRecord();

    const [selected, setSelected] = useState<AttendanceRecord | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const selectedEmployeeKeys = useMemo(
        () => (employeeId ? new Set<string>([String(employeeId)]) : new Set<string>()),
        [employeeId]
    );
    const selectedShiftKeys = useMemo(
        () => (shiftId ? new Set<string>([String(shiftId)]) : new Set<string>()),
        [shiftId]
    );
    const selectedStatusKeys = useMemo(() => new Set<string>([status]), [status]);

    const lateMinutesInt = useMemo(() => {
        const trimmed = lateMinutes.trim();
        if (!trimmed) return undefined;
        const n = Number(trimmed);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return undefined;
        return n;
    }, [lateMinutes]);

    const overtimeMinutesInt = useMemo(() => {
        const trimmed = overtimeMinutes.trim();
        if (!trimmed) return undefined;
        const n = Number(trimmed);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return undefined;
        return n;
    }, [overtimeMinutes]);

    const handleSave = async () => {
        if (!employeeId || !shiftId) return;

        await upsert.mutateAsync({
            employeeId,
            shiftId,
            shiftDate: dateStr,
            status,
            lateMinutes: status === "late" ? lateMinutesInt : undefined,
            overtimeMinutes: status === "overtime" ? overtimeMinutesInt : undefined,
            notes: notes || undefined,
        });

        setNotes("");
        setLateMinutes("");
        setOvertimeMinutes("");
    };

    const summary = dailySummary.data;

    const openEdit = (record: AttendanceRecord) => {
        setSelected(record);
        setIsEditOpen(true);
    };

    const openDelete = (record: AttendanceRecord) => {
        setSelected(record);
        setIsDeleteOpen(true);
    };

    const handleUpdate = async (
        payload: Parameters<typeof updateRecord.mutateAsync>[0]["data"]
    ) => {
        if (!selected) return;
        await updateRecord.mutateAsync({ id: selected.id, data: payload });
        setSelected(null);
        setIsEditOpen(false);
    };

    const handleDelete = async () => {
        if (!selected) return;
        await deleteRecord.mutateAsync(selected.id);
        setSelected(null);
        setIsDeleteOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardBody className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DatePicker
                                label="Date"
                                variant="bordered"
                                showMonthAndYearPickers
                                value={dateValue}
                                onChange={(d) => {
                                    if (d) {
                                        setDateValue(d);
                                        setRecordsPage(1);
                                    }
                                }}
                            />

                            <Select
                                label="Status"
                                classNames={{
                                    trigger: "!w-full !text-left",
                                    label: "!w-full !text-left",
                                    base: "!w-full !text-left",
                                    value: "!text-slate-900 dark:!text-slate-100",
                                }}
                                selectedKeys={selectedStatusKeys}
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0] as
                                        | AttendanceStatus
                                        | undefined;
                                    if (!selected) return;
                                    setStatus(selected);
                                }}
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s.key} textValue={s.label}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </Select>

                            <Select
                                label="Employee"
                                placeholder="Select employee"
                                selectedKeys={selectedEmployeeKeys}
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0] as string | undefined;
                                    setEmployeeId(selected ? Number(selected) : null);
                                }}
                                classNames={{
                                    trigger: "!w-full !text-left",
                                    label: "!w-full !text-left",
                                    base: "!w-full !text-left",
                                    value: "!text-slate-900 dark:!text-slate-100",
                                }}
                            >
                                {employees.map((e) => (
                                    <SelectItem key={String(e.id)} textValue={e.fullName}>
                                        {e.fullName}
                                    </SelectItem>
                                ))}
                            </Select>

                            <Select
                                label="Shift"
                                placeholder="Select shift"
                                selectedKeys={selectedShiftKeys}
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0] as string | undefined;
                                    setShiftId(selected ? Number(selected) : null);
                                }}
                                classNames={{
                                    trigger: "!w-full !text-left",
                                    label: "!w-full !text-left",
                                    base: "!w-full !text-left",
                                    value: "!text-slate-900 dark:!text-slate-100",
                                }}
                            >
                                {shifts.map((s) => (
                                    <SelectItem key={String(s.id)} textValue={s.name}>
                                        {s.name} ({s.startTime.toString().slice(0, 5)}-
                                        {s.endTime.toString().slice(0, 5)})
                                    </SelectItem>
                                ))}
                            </Select>

                            {status === "late" && (
                                <Input
                                    label="Late Minutes"
                                    isRequired
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={lateMinutes}
                                    onValueChange={setLateMinutes}
                                    classNames={{
                                        input: "!text-slate-900 dark:!text-slate-100",
                                    }}
                                />
                            )}

                            {status === "overtime" && (
                                <Input
                                    label="Overtime Minutes"
                                    isRequired
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={overtimeMinutes}
                                    onValueChange={setOvertimeMinutes}
                                    classNames={{
                                        input: "!text-slate-900 dark:!text-slate-100",
                                    }}
                                />
                            )}
                        </div>

                        <Textarea
                            label="Notes (optional)"
                            value={notes}
                            onValueChange={setNotes}
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                            }}
                        />

                        <Button
                            color="primary"
                            onPress={handleSave}
                            isDisabled={
                                !employeeId ||
                                !shiftId ||
                                upsert.isPending ||
                                (status === "late" &&
                                    (lateMinutesInt === undefined || lateMinutesInt < 0)) ||
                                (status === "overtime" &&
                                    (overtimeMinutesInt === undefined || overtimeMinutesInt < 0))
                            }
                            isLoading={upsert.isPending}
                            startContent={<Save className="h-4 w-4" />}
                        >
                            Save Attendance
                        </Button>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="space-y-3">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            Daily Summary
                        </div>

                        {dailySummary.isLoading ? (
                            <div className="text-sm text-slate-500">Loading summary...</div>
                        ) : summary ? (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total records</span>
                                    <span className="font-medium">{summary.totalRecords}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Scheduled (min)</span>
                                    <span className="font-medium">
                                        {summary.totalScheduledMinutes}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Worked (min)</span>
                                    <span className="font-medium">
                                        {summary.totalWorkedMinutes}
                                    </span>
                                </div>

                                <div className="pt-2">
                                    <div className="text-xs text-slate-500 mb-1">Breakdown</div>
                                    <div className="space-y-1">
                                        {summary.statusBreakdown.map((b) => (
                                            <div key={b.status} className="flex justify-between">
                                                <span className="capitalize">{b.status}</span>
                                                <span className="font-medium">{b.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500">No summary available.</div>
                        )}
                    </CardBody>
                </Card>
            </div>

            <div className="space-y-3">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Recent Records
                </div>

                <DataTable
                    columns={getAttendanceColumns({
                        page: recordsPage,
                        pageSize: recordsPageSize,
                        onEdit: openEdit,
                        onDelete: openDelete,
                    })}
                    data={attendance.data?.results || []}
                    isLoading={attendance.isLoading}
                />

                {attendance.data && attendance.data.count > 0 && (
                    <DataTablePagination
                        pagination={{
                            count: attendance.data.count,
                            page: recordsPage,
                            pageSize: recordsPageSize,
                            totalPages: Math.ceil(attendance.data.count / recordsPageSize),
                        }}
                        onPageChange={setRecordsPage}
                        onPageSizeChange={(size) => {
                            setRecordsPageSize(size);
                            setRecordsPage(1);
                        }}
                    />
                )}
            </div>

            <AttendanceRecordFormModal
                isOpen={isEditOpen}
                onClose={() => {
                    setIsEditOpen(false);
                    setSelected(null);
                }}
                record={selected}
                onSubmit={handleUpdate}
                isLoading={updateRecord.isPending}
            />

            <DeleteAttendanceRecordModal
                isOpen={isDeleteOpen}
                onClose={() => {
                    setIsDeleteOpen(false);
                    setSelected(null);
                }}
                record={selected}
                onConfirm={handleDelete}
                isLoading={deleteRecord.isPending}
            />
        </div>
    );
}
