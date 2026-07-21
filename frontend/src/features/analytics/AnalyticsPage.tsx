import { motion } from "framer-motion";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  AreaChart as AreaChartIcon,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ContactRound,
  Download,
  FileDown,
  FileSpreadsheet,
  FolderKanban,
  LineChart as LineChartIcon,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyticsData, analyticsKpis } from "./analytics.data";
import { AnalyticsCard } from "./components/AnalyticsCard";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import { ExportMenu } from "./components/ExportMenu";
import { HealthScoreGauge } from "./components/HealthScoreGauge";
import { PredictionChart, SimpleBarChart, HorizontalBarChart, ComboChart } from "./components/PredictionChart";
import { RiskMatrix } from "./components/RiskMatrix";
import {
  businessHealthScore,
  customerGrowth,
  departmentOptions,
  employeeProductivity,
  expensePrediction,
  financialTrends,
  metricOptions,
  projectRisks,
  revenuePrediction,
  salesForecast,
} from "./ai-analytics.data";
import type { AnalyticsFilterState } from "./ai-analytics.types";

const chartColors = {
  primary: "hsl(var(--primary))",
  success: "rgb(16 185 129)",
  warning: "rgb(245 158 11)",
  rose: "rgb(244 63 94)",
  muted: "hsl(var(--muted-foreground))",
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function ChartShell({ children, icon: Icon, subtitle, title }: { children: ReactNode; icon: typeof BarChart3; subtitle: string; title: string }) {
  return (
    <Card className="glass h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="h-72">{children}</div>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ name: string; value: number; color?: string }> }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background/95 p-3 text-sm shadow-glass backdrop-blur-xl">
      <p className="mb-2 font-semibold">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div className="flex items-center justify-between gap-4" key={item.name}>
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-semibold">{item.name.toLowerCase().includes("revenue") ? money(item.value) : item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const latest = analyticsData[analyticsData.length - 1] ?? analyticsData[0];
  const radialData = [
    { name: "Completion", value: latest.completionRate, fill: chartColors.primary },
    { name: "Satisfaction", value: latest.satisfaction, fill: chartColors.success },
  ];
  const operationsData = analyticsData.map((item) => ({
    month: item.month,
    projects: item.projects,
    employees: item.employees,
    tasks: item.tasks,
  }));

  const [filters, setFilters] = useState<AnalyticsFilterState>({
    dateRange: "12m",
    department: null,
    metric: null,
  });

  const handleExportPDF = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const blob = new Blob([`AI BOS Analytics Report\nGenerated: ${new Date().toISOString()}\n\nBusiness Health Score: ${businessHealthScore.overall}/100\n\nRevenue Prediction:\n${JSON.stringify(revenuePrediction.predictions, null, 2)}\n\nExpense Prediction:\n${JSON.stringify(expensePrediction.predictions, null, 2)}\n\nSales Forecast:\n${JSON.stringify(salesForecast.monthlyForecast, null, 2)}\n\nEmployee Productivity:\n${JSON.stringify(employeeProductivity.departments, null, 2)}\n\nProject Risks:\n${JSON.stringify(projectRisks, null, 2)}\n\nCustomer Growth:\n${JSON.stringify(customerGrowth.predictions, null, 2)}\n\nFinancial Trends:\n${JSON.stringify(financialTrends.monthlyData, null, 2)}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const rows: (string | number)[][] = [["Month", "Revenue", "Sales", "Customers", "Projects", "Employees", "Tasks"]];
    analyticsData.forEach((item) => {
      rows.push([item.month, item.revenue, item.sales, item.customers, item.projects, item.employees, item.tasks]);
    });
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Analytics</p>
            <h1 className="text-2xl font-bold">Business Analytics Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild type="button" variant="outline">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {analyticsKpis.map((kpi, index) => (
            <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={kpi.label} transition={{ delay: index * 0.04 }}>
              <Card className="glass h-full">
                <CardContent className="p-5">
                  <TrendingUp className="mb-4 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-2 text-3xl font-bold">{kpi.value}</p>
                  <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">{kpi.change}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <ChartShell icon={CircleDollarSign} subtitle="Monthly recurring and service revenue trend." title="Revenue">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke={chartColors.muted} tickLine={false} />
                <YAxis stroke={chartColors.muted} tickFormatter={money} tickLine={false} width={64} />
                <Tooltip content={<CustomTooltip />} />
                <Area dataKey="revenue" fill="url(#revenueGradient)" name="Revenue" stroke={chartColors.primary} strokeWidth={3} type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell icon={CheckCircle2} subtitle="Completion rate and customer satisfaction." title="KPI Health">
            <ResponsiveContainer height="100%" width="100%">
              <RadialBarChart cx="50%" cy="50%" data={radialData} endAngle={-270} innerRadius="35%" outerRadius="95%" startAngle={90}>
                <RadialBar background cornerRadius={8} dataKey="value">
                  {radialData.map((entry) => (
                    <Cell fill={entry.fill} key={entry.name} />
                  ))}
                </RadialBar>
                <Tooltip content={<CustomTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </ChartShell>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartShell icon={BarChart3} subtitle="Sales activity against customer growth." title="Sales And Customers">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={analyticsData}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke={chartColors.muted} tickLine={false} />
                <YAxis stroke={chartColors.muted} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sales" fill={chartColors.warning} name="Sales" radius={[6, 6, 0, 0]} />
                <Bar dataKey="customers" fill={chartColors.primary} name="Customers" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell icon={LineChartIcon} subtitle="Projects, employees, and tasks over time." title="Operations">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={operationsData}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke={chartColors.muted} tickLine={false} />
                <YAxis stroke={chartColors.muted} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line dataKey="projects" dot={false} name="Projects" stroke={chartColors.primary} strokeWidth={3} type="monotone" />
                <Line dataKey="employees" dot={false} name="Employees" stroke={chartColors.success} strokeWidth={3} type="monotone" />
                <Line dataKey="tasks" dot={false} name="Tasks" stroke={chartColors.rose} strokeWidth={3} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </ChartShell>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { label: "Customers", value: latest.customers.toLocaleString(), icon: ContactRound },
            { label: "Projects", value: latest.projects.toLocaleString(), icon: FolderKanban },
            { label: "Employees", value: latest.employees.toLocaleString(), icon: UsersRound },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card className="glass" key={item.label}>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold">{item.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-primary" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <ChartShell icon={AreaChartIcon} subtitle="Combined sales, projects, employees, and task volume." title="Business Volume">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={analyticsData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke={chartColors.muted} tickLine={false} />
              <YAxis stroke={chartColors.muted} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area dataKey="sales" fill={chartColors.warning} fillOpacity={0.08} name="Sales" stroke={chartColors.warning} strokeWidth={2} type="monotone" />
              <Area dataKey="projects" fill={chartColors.primary} fillOpacity={0.08} name="Projects" stroke={chartColors.primary} strokeWidth={2} type="monotone" />
              <Area dataKey="tasks" fill={chartColors.rose} fillOpacity={0.06} name="Tasks" stroke={chartColors.rose} strokeWidth={2} type="monotone" />
              <Area dataKey="employees" fill={chartColors.success} fillOpacity={0.06} name="Employees" stroke={chartColors.success} strokeWidth={2} type="monotone" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>

        <AnalyticsFilterBar filters={filters} onChange={setFilters} />

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <HealthScoreGauge data={businessHealthScore} />
          </div>
          <ExportMenu onExportPDF={handleExportPDF} onExportCSV={handleExportCSV} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <AnalyticsCard icon={CircleDollarSign} subtitle="Revenue actuals and AI forecast with confidence bounds." title="Revenue Prediction">
            <PredictionChart data={revenuePrediction.predictions} colors={[chartColors.primary, chartColors.warning]} formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
          </AnalyticsCard>

          <AnalyticsCard icon={TrendingUp} subtitle="Projected expenses and top spending categories." title="Expense Prediction">
            <HorizontalBarChart data={expensePrediction.topCategories.map((item) => ({ name: item.category, value: item.amount, color: chartColors.rose }))} formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} height={220} />
          </AnalyticsCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <AnalyticsCard icon={BarChart3} subtitle="Pipeline stages and monthly forecast." title="Sales Forecast">
            <SimpleBarChart
              data={salesForecast.monthlyForecast}
              xKey="month"
              bars={[
                { key: "forecast", name: "Forecast", color: chartColors.primary },
                { key: "upper", name: "Upper Bound", color: chartColors.success },
                { key: "lower", name: "Lower Bound", color: chartColors.warning },
              ]}
              formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
            />
          </AnalyticsCard>

          <AnalyticsCard icon={UsersRound} subtitle="Task completion and productivity by department." title="Employee Productivity">
            <PredictionChart data={employeeProductivity.monthlyData.map((item) => ({ month: item.month, actual: item.departments[filters.department ?? "Engineering"] ?? Object.values(item.departments)[0], predicted: null }))} type="line" colors={[chartColors.primary]} formatter={(value: number) => `${value}%`} />
          </AnalyticsCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <AnalyticsCard icon={ContactRound} subtitle="Customer acquisition, churn, and growth forecast." title="Customer Growth">
            <PredictionChart data={[...customerGrowth.monthlyData.map((item) => ({ month: item.month, actual: item.total, predicted: null })), ...customerGrowth.predictions]} formatter={(value: number) => value.toLocaleString()} />
          </AnalyticsCard>

          <AnalyticsCard icon={Activity} subtitle="Gross margin, net margin, burn rate, and runway." title="Financial Trends">
            <ComboChart
              data={financialTrends.monthlyData}
              xKey="month"
              bars={[
                { key: "revenue", name: "Revenue", color: chartColors.primary },
                { key: "expenses", name: "Expenses", color: chartColors.rose },
              ]}
              lines={[
                { key: "grossMargin", name: "Gross Margin %", color: chartColors.success },
              ]}
              formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
            />
          </AnalyticsCard>
        </div>

        <RiskMatrix data={projectRisks} />
      </div>
    </main>
  );
}
