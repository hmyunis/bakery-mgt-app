import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "../../lib/utils";

function formatMoney(n: number) {
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 0,
    }).format(n);
}

function formatHour(hour: number): string {
    return `${hour}:00`;
}

interface SalesByHourChartProps {
    data: Array<{ hour: number; count: number; total: number }>;
    className?: string;
}

export function SalesByHourChart({ data, className }: SalesByHourChartProps) {
    if (!data || data.length === 0) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center h-48 text-sm text-slate-500",
                    className
                )}
            >
                No sales data available
            </div>
        );
    }

    const chartData = data.map((item) => ({
        hour: formatHour(item.hour),
        revenue: item.total,
        count: item.count,
    }));

    const renderCustomTooltip = ({
        active,
        payload,
    }: {
        active?: boolean;
        payload?: readonly {
            payload: { hour: string; revenue: number; count: number };
        }[];
    }) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-lg">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.hour}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Revenue: {formatMoney(item.revenue)} ETB
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Sales: {item.count}
                    </p>
                </div>
            );
        }
        return null;
    };

    const minChartWidth = Math.max(400, chartData.length * 50);

    return (
        <div className={cn("w-full overflow-x-auto", className)}>
            <div style={{ minWidth: `${minChartWidth}px` }} className="w-full">
                <ResponsiveContainer width="100%" height={200} minHeight={200}>
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                            className="dark:stroke-slate-700"
                        />
                        <XAxis
                            dataKey="hour"
                            tick={{ fontSize: 12, fill: "currentColor" }}
                            className="text-slate-500 dark:text-slate-400"
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: "currentColor" }}
                            className="text-slate-500 dark:text-slate-400"
                            tickFormatter={(value) => formatMoney(value)}
                            width={60}
                        />
                        <Tooltip content={renderCustomTooltip} />
                        <Bar
                            dataKey="revenue"
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                            className="hover:opacity-80 transition-opacity"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
