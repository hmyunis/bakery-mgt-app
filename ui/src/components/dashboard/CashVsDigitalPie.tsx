import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "../../lib/utils";

function formatMoney(n: number) {
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
    }).format(n);
}

interface CashVsDigitalPieProps {
    cash: number;
    digital: number;
    className?: string;
}

export function CashVsDigitalPie({ cash, digital, className }: CashVsDigitalPieProps) {
    const cashV = Math.max(0, cash);
    const digitalV = Math.max(0, digital);
    const total = cashV + digitalV;

    const data = [
        { name: "Cash", value: cashV, color: "#22c55e" },
        { name: "Digital", value: digitalV, color: "#6366f1" },
    ];

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent === 0) return null;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? "start" : "end"}
                dominantBaseline="central"
                className="text-xs font-semibold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const renderCustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-lg">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {data.name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {formatMoney(data.value)} ETB
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={cn("flex flex-col sm:flex-row items-center gap-4 sm:gap-8", className)}>
            <div className="flex-shrink-0 w-full sm:w-[200px] h-[200px] min-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomLabel}
                            outerRadius={80}
                            innerRadius={50}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={renderCustomTooltip} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-4 w-full sm:w-auto sm:min-w-[140px]">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Cash
                        </span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatMoney(cashV)} ETB
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {total > 0 ? Math.round((cashV / total) * 100) : 0}%
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-indigo-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Digital
                        </span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatMoney(digitalV)} ETB
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {total > 0 ? Math.round((digitalV / total) * 100) : 0}%
                        </div>
                    </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
                    <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(total)} ETB
                    </div>
                </div>
            </div>
        </div>
    );
}
