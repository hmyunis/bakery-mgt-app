import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "../../lib/utils";

function formatMoney(n: number) {
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
    }).format(n);
}

interface TopProductsChartProps {
    data: Array<{ productName: string; quantity: number; revenue: number }>;
    className?: string;
}

export function TopProductsChart({ data, className }: TopProductsChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className={cn("flex items-center justify-center h-32 text-sm text-slate-500", className)}>
                No product sales today
            </div>
        );
    }

    const chartData = data.map((item) => ({
        name: item.productName,
        revenue: item.revenue,
        quantity: item.quantity,
    }));

    const colors = [
        "#a855f7",
        "#c084fc",
        "#d946ef",
        "#e879f9",
        "#f0abfc",
    ];

    const renderCustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-lg">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {data.name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Revenue: {formatMoney(data.revenue)} ETB
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Quantity: {data.quantity} sold
                    </p>
                </div>
            );
        }
        return null;
    };

    const minChartWidth = 400;
    const chartHeight = Math.max(200, data.length * 50);

    return (
        <div className={cn("w-full overflow-x-auto", className)}>
            <div style={{ minWidth: `${minChartWidth}px` }} className="w-full">
                <ResponsiveContainer width="100%" height={chartHeight} minHeight={200}>
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 12, fill: "currentColor" }}
                            className="text-slate-500 dark:text-slate-400"
                            tickFormatter={(value) => formatMoney(value)}
                            width={60}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "currentColor" }}
                            className="text-slate-500 dark:text-slate-400"
                            width={70}
                        />
                        <Tooltip content={renderCustomTooltip} />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
