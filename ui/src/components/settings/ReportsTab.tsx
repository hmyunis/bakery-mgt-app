import { useState } from "react";
import { DatePicker, Button, Card, CardBody, Spinner } from "@heroui/react";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import { useDashboardStats, useExportReport } from "../../hooks/useReports";
import {
    Download,
    DollarSign,
    ShoppingBag,
    TrendingUp,
    Package,
    FileSpreadsheet,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function ReportsTab() {
    const [selectedDate, setSelectedDate] = useState<DateValue>(today(getLocalTimeZone()));
    const [startDate, setStartDate] = useState<DateValue>(
        today(getLocalTimeZone()).subtract({ days: 7 })
    );
    const [endDate, setEndDate] = useState<DateValue>(today(getLocalTimeZone()));

    const dateStr = selectedDate.toString();
    const { data: stats, isLoading } = useDashboardStats(dateStr);
    const { mutate: exportReport, isPending: isExporting } = useExportReport();

    const handleExport = () => {
        exportReport({
            startDate: startDate.toString(),
            endDate: endDate.toString(),
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!stats) return null;

    const {
        hourlySales = [],
        topProducts = [],
        paymentMethods = [],
        productionVsSales = [],
        wastage = [],
        cashierPerformance = [],
        productsInStock = 0,
    } = stats;

    return (
        <div className="space-y-6">
            {/* Date Filter */}
            <div className="flex justify-end">
                <div className="w-full max-w-xs">
                    <DatePicker
                        label="View Reports For"
                        variant="bordered"
                        showMonthAndYearPickers
                        value={selectedDate}
                        onChange={(val) => val && setSelectedDate(val)}
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                            <span className="text-sm text-default-500 font-medium">
                                Total Revenue
                            </span>
                            <span className="text-2xl font-bold">
                                {hourlySales
                                    .reduce((acc: number, curr) => acc + curr.total, 0)
                                    .toFixed(2)}{" "}
                                ETB
                            </span>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <span className="text-xs text-default-400 mt-auto">
                        Total earnings from sales today
                    </span>
                </Card>

                <Card className="p-6 border-l-4 border-l-secondary shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                            <span className="text-sm text-default-500 font-medium">
                                Total Orders
                            </span>
                            <span className="text-3xl font-bold">
                                {cashierPerformance.reduce(
                                    (acc: number, curr) => acc + curr.count,
                                    0
                                )}
                            </span>
                        </div>
                        <div className="p-2 bg-secondary/10 rounded-full text-secondary">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                    </div>
                    <span className="text-xs text-default-400 mt-auto">
                        Number of transactions processed
                    </span>
                </Card>

                <Card className="p-6 border-l-4 border-l-success shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm text-default-500 font-medium">
                                Top Product
                            </span>
                            <span
                                className="text-lg font-bold truncate w-full"
                                title={topProducts[0]?.name}
                            >
                                {topProducts[0]?.name || "N/A"}
                            </span>
                        </div>
                        <div className="p-2 bg-success/10 rounded-full text-success">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <span className="text-xs text-default-400 mt-auto">Most sold item today</span>
                </Card>

                <Card className="p-6 border-l-4 border-l-warning shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                            <span className="text-sm text-default-500 font-medium">In Stock</span>
                            <span className="text-3xl font-bold">{productsInStock}</span>
                        </div>
                        <div className="p-2 bg-warning/10 rounded-full text-warning">
                            <Package className="w-5 h-5" />
                        </div>
                    </div>
                    <span className="text-xs text-default-400 mt-auto">
                        Products with available stock
                    </span>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Hourly Sales (Area Chart with Gradient) */}
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Hourly Sales Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlySales}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="hour" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#8884d8"
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 2. Top Products (Bar Chart) */}
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Top 5 Selling Products</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis type="number" fontSize={12} />
                                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                <Tooltip
                                    cursor={{ fill: "transparent" }}
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    }}
                                />
                                <Bar
                                    dataKey="quantity"
                                    fill="#82ca9d"
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 3. Payment Methods (Donut Chart) */}
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentMethods}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {paymentMethods.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 4. Production vs Sales (Grouped Bar Chart) */}
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Production vs Sales</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={productionVsSales}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    cursor={{ fill: "transparent" }}
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    }}
                                />
                                <Legend />
                                <Bar
                                    dataKey="produced"
                                    fill="#8884d8"
                                    name="Produced"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="sold"
                                    fill="#82ca9d"
                                    name="Sold"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 5. Wastage (Bar Chart) */}
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Top Ingredient Wastage</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={wastage}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    cursor={{ fill: "transparent" }}
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    }}
                                />
                                <Bar
                                    dataKey="wastage"
                                    fill="#ff8042"
                                    name="Wastage (kg)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 6. Cashier Performance (Bar Chart) */}
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Cashier Performance</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cashierPerformance}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    cursor={{ fill: "transparent" }}
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    }}
                                />
                                <Bar
                                    dataKey="sales"
                                    fill="#0088FE"
                                    name="Total Sales (Birr)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Export Section */}
            <Card className="bg-default-50 dark:bg-default-100/50 border border-default-200">
                <CardBody className="p-6">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2 max-w-md">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold">Export Data</h3>
                            </div>
                            <p className="text-default-500 text-sm">
                                Download a comprehensive Excel report for the selected period.
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row items-end gap-4 w-full md:w-auto">
                            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                <DatePicker
                                    label="Start Date"
                                    variant="bordered"
                                    showMonthAndYearPickers
                                    value={startDate}
                                    onChange={(val) => val && setStartDate(val)}
                                    className="w-full sm:w-40"
                                />
                                <DatePicker
                                    label="End Date"
                                    variant="bordered"
                                    showMonthAndYearPickers
                                    value={endDate}
                                    onChange={(val) => val && setEndDate(val)}
                                    className="w-full sm:w-40"
                                />
                            </div>
                            <Button
                                color="primary"
                                startContent={<Download className="h-4 w-4" />}
                                onPress={handleExport}
                                isLoading={isExporting}
                                className="w-full md:w-auto font-medium"
                                size="lg"
                            >
                                Download Report
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
