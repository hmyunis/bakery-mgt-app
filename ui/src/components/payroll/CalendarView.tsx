import { tr } from "../../locales";
import { Card, CardBody, Chip } from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DailyShiftAttendance } from "../../types/employee";
import { DataTable } from "../ui/DataTable";

interface CalendarViewProps {
    dailyData: DailyShiftAttendance[];
    periodStart: string;
    periodEnd: string;
}

export function CalendarView({ dailyData, periodStart, periodEnd }: CalendarViewProps) {
    // Create a map of date strings to daily data for quick lookup
    const dailyDataMap = new Map(dailyData.map((d) => [d.date, d]));

    // Helper function to parse date string
    const parseDate = (dateStr: string) => {
        return new Date(dateStr + "T00:00:00");
    };

    // Helper function to format date
    const formatDate = (date: Date, format: string) => {
        if (format === "MMM d") {
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
        if (format === "d") {
            return date.getDate().toString();
        }
        return date.toISOString();
    };

    // Helper function to get start of week
    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    };

    // Helper function to add days
    const addDays = (date: Date, days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    };

    // Generate weeks for the period
    const weeks: DailyShiftAttendance[][][] = [];
    const startDate = parseDate(periodStart);
    const endDate = parseDate(periodEnd);

    // Find the start of the week for the start date
    let currentWeekStart = getStartOfWeek(startDate);

    while (currentWeekStart <= endDate) {
        const week: DailyShiftAttendance[][] = [];

        // Add 7 days to the week
        for (let i = 0; i < 7; i++) {
            const dayDate = addDays(currentWeekStart, i);
            const dateStr = dayDate.toISOString().split("T")[0];

            const dayData = dailyDataMap.get(dateStr) || {
                date: dateStr,
                shiftName: null,
                startTime: null,
                endTime: null,
                attendanceStatus: null,
                isOnLeave: false,
                leaveType: null,
            };

            week.push([dayData]);
        }

        weeks.push(week);
        currentWeekStart = addDays(currentWeekStart, 7);
    }

    const getStatusColor = (status: string | null, isOnLeave: boolean) => {
        if (isOnLeave) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

        switch (status.toLowerCase()) {
            case "present":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
            case "late":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
            case "absent":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
            case "overtime":
                return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
        }
    };

    const isInPeriod = (date: Date) => {
        return date >= startDate && date <= endDate;
    };

    type CalendarWeek = DailyShiftAttendance[][];
    const calendarColumns: ColumnDef<CalendarWeek>[] = [
        {
            id: "week",
            header: tr("Week"),
            cell: ({ row }) => (
                <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(parseDate(row.original[0][0].date), "MMM d")} -{" "}
                    {formatDate(parseDate(row.original[6][0].date), "MMM d")}
                </span>
            ),
        },
        ...["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (dayName, dayIndex): ColumnDef<CalendarWeek> => ({
                id: dayName.toLowerCase(),
                header: dayName,
                cell: ({ row }) => {
                    const dayData = row.original[dayIndex][0];
                    const dayDate = parseDate(dayData.date);
                    const statusColor = getStatusColor(dayData.attendanceStatus, dayData.isOnLeave);

                    return (
                        <div className={!isInPeriod(dayDate) ? "opacity-50" : undefined}>
                            <div className="mb-1 font-medium">{formatDate(dayDate, "d")}</div>
                            <div className="space-y-1">
                                {dayData.shiftName && (
                                    <div className="truncate text-xs font-medium">
                                        {dayData.shiftName}
                                    </div>
                                )}
                                {dayData.startTime && dayData.endTime && (
                                    <div className="text-xs text-gray-500">
                                        {dayData.startTime.substring(0, 5)}-
                                        {dayData.endTime.substring(0, 5)}
                                    </div>
                                )}
                                {dayData.attendanceStatus && (
                                    <Chip size="sm" className={`${statusColor} text-xs`}>
                                        {dayData.attendanceStatus}
                                    </Chip>
                                )}
                                {dayData.isOnLeave && (
                                    <Chip
                                        size="sm"
                                        className="bg-blue-100 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    >
                                        {dayData.leaveType || tr("Leave")}
                                    </Chip>
                                )}
                            </div>
                        </div>
                    );
                },
            })
        ),
    ];

    return (
        <Card>
            <CardBody>
                <DataTable columns={calendarColumns} data={weeks} />
            </CardBody>
        </Card>
    );
}
