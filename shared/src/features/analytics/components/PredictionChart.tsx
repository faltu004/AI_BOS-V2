import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PredictionPoint } from "../ai-analytics.types";

const chartColors = {
 primary: "hsl(var(--primary))",
 success: "rgb(16 185 129)",
 warning: "rgb(245 158 11)",
 rose: "rgb(244 63 94)",
 muted: "hsl(var(--muted-foreground))",
 mutedLight: "hsl(var(--muted-foreground) / 0.15)",
};

type CustomTooltipPayload = {
 name: string;
 value: number;
 color?: string;
 dataKey?: string;
};

function CustomTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: CustomTooltipPayload[] }) {
 if (!active || !payload?.length) return null;
 return (
 <div className="rounded-lg border bg-background p-3 text-sm shadow-glass ">
 <p className="mb-2 font-semibold">{label}</p>
 <div className="space-y-1">
 {payload.map((item) => (
 <div className="flex items-center justify-between gap-4" key={item.dataKey ?? item.name}>
 <span className="text-muted-foreground">{item.name}</span>
 <span className="font-semibold">{typeof item.value === "number" ? item.value.toLocaleString() : item.value}</span>
 </div>
 ))}
 </div>
 </div>
 );
}

type PredictionChartProps = {
 data: PredictionPoint[];
 type?: "line" | "area";
 dataKeys?: string[];
 colors?: string[];
 formatter?: (value: number) => string;
 height?: number;
 showLegend?: boolean;
 yAxisWidth?: number;
};

export function PredictionChart({
 data,
 type = "area",
 dataKeys = ["actual", "predicted"],
 colors = [chartColors.primary, chartColors.warning],
 formatter,
 height = 280,
 showLegend = true,
 yAxisWidth = 64,
}: PredictionChartProps) {
 const chartData = data.map((point) => ({
 month: point.month,
 actual: point.actual,
 predicted: point.predicted,
 upperBound: point.upperBound,
 lowerBound: point.lowerBound,
 }));

 const commonProps = {
 data: chartData,
 margin: { top: 8, right: 8, bottom: 0, left: 0 },
 };

 const renderChart = () => {
 switch (type) {
 case "line":
 return (
 <LineChart {...commonProps}>
 {renderDefs()}
 {renderAxes()}
 <Tooltip content={<CustomTooltip />} />
 {showLegend && <Legend wrapperStyle={{ fontSize: "12px" }} />}
 {chartData.some((d) => d.upperBound != null) && (
 <Area dataKey="upperBound" fill={chartColors.mutedLight} fillOpacity={0.3} stroke="none" type="monotone" />
 )}
 {chartData.some((d) => d.lowerBound != null) && (
 <Area dataKey="lowerBound" fill={chartColors.mutedLight} fillOpacity={0.3} stroke="none" type="monotone" />
 )}
 {dataKeys.map((key, index) => (
 <Line
 key={key}
 dataKey={key}
 stroke={colors[index] ?? chartColors.primary}
 strokeWidth={key === "predicted" ? 2.5 : 3}
 strokeDasharray={key === "predicted" ? "6 3" : "none"}
 dot={key === "actual" ? { r: 4, fill: colors[index] ?? chartColors.primary } : false}
 name={key === "actual" ? "Actual" : "Predicted"}
 type="monotone"
 />
 ))}
 </LineChart>
 );

 default:
 return (
 <AreaChart {...commonProps}>
 {renderDefs()}
 {renderAxes()}
 <Tooltip content={<CustomTooltip />} />
 {showLegend && <Legend wrapperStyle={{ fontSize: "12px" }} />}
 {chartData.some((d) => d.upperBound != null) && (
 <Area dataKey="upperBound" fill={chartColors.mutedLight} fillOpacity={0.2} stroke="none" type="monotone" />
 )}
 {chartData.some((d) => d.lowerBound != null) && (
 <Area dataKey="lowerBound" fill={chartColors.mutedLight} fillOpacity={0.2} stroke="none" type="monotone" />
 )}
 {dataKeys.map((key, index) => (
 <Area
 key={key}
 dataKey={key}
 stroke={colors[index] ?? chartColors.primary}
 fill={colors[index] ?? chartColors.primary}
 fillOpacity={key === "predicted" ? 0.08 : 0.18}
 strokeWidth={key === "predicted" ? 2 : 3}
 strokeDasharray={key === "predicted" ? "6 3" : "none"}
 dot={key === "actual" ? { r: 3, fill: colors[index] ?? chartColors.primary } : false}
 name={key === "actual" ? "Actual" : "Predicted"}
 type="monotone"
 />
 ))}
 </AreaChart>
 );
 }
 };

 function renderDefs() {
 return (
 <defs>
 <linearGradient id="predGradient" x1="0" x2="0" y1="0" y2="1">
 <stop offset="0%" stopColor={chartColors.warning} stopOpacity={0.25} />
 <stop offset="100%" stopColor={chartColors.warning} stopOpacity={0.02} />
 </linearGradient>
 </defs>
 );
 }

 function renderAxes() {
 return (
 <>
 <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="month" stroke={chartColors.muted} tickLine={false} />
 <YAxis
 stroke={chartColors.muted}
 tickFormatter={formatter ?? ((v: number) => v.toLocaleString())}
 tickLine={false}
 width={yAxisWidth}
 />
 </>
 );
 }

 return (
 <ResponsiveContainer height={height} width="100%">
 {renderChart()}
 </ResponsiveContainer>
 );
}

type SimpleBarChartProps = {
 data: Record<string, unknown>[];
 xKey: string;
 bars: { key: string; name: string; color: string }[];
 formatter?: (value: number) => string;
 height?: number;
};

export function SimpleBarChart({ data, xKey, bars, formatter, height = 280 }: SimpleBarChartProps) {
 return (
 <ResponsiveContainer height={height} width="100%">
 <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
 <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey={xKey} stroke={chartColors.muted} tickLine={false} />
 <YAxis
 stroke={chartColors.muted}
 tickFormatter={formatter ?? ((v: number) => v.toLocaleString())}
 tickLine={false}
 width={64}
 />
 <Tooltip content={<CustomTooltip />} />
 {bars.map((bar) => (
 <Bar key={bar.key} dataKey={bar.key} fill={bar.color} name={bar.name} radius={[4, 4, 0, 0]} />
 ))}
 </BarChart>
 </ResponsiveContainer>
 );
}

type HorizontalBarChartProps = {
 data: { name: string; value: number; color?: string }[];
 formatter?: (value: number) => string;
 height?: number;
};

export function HorizontalBarChart({ data, formatter, height = 220 }: HorizontalBarChartProps) {
 return (
 <ResponsiveContainer height={height} width="100%">
 <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 80 }}>
 <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
 <XAxis stroke={chartColors.muted} tickFormatter={formatter ?? ((v: number) => v.toLocaleString())} tickLine={false} type="number" />
 <YAxis dataKey="name" stroke={chartColors.muted} tickLine={false} type="category" width={80} />
 <Tooltip content={<CustomTooltip />} />
 <Bar dataKey="value" radius={[0, 4, 4, 0]}>
 {data.map((entry, index) => (
 <Cell key={index} fill={entry.color ?? chartColors.primary} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 );
}

type ComboChartProps = {
 data: Record<string, unknown>[];
 xKey: string;
 bars: { key: string; name: string; color: string }[];
 lines: { key: string; name: string; color: string }[];
 formatter?: (value: number) => string;
 height?: number;
};

export function ComboChart({ data, xKey, bars, lines, formatter, height = 280 }: ComboChartProps) {
 return (
 <ResponsiveContainer height={height} width="100%">
 <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
 <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey={xKey} stroke={chartColors.muted} tickLine={false} />
 <YAxis stroke={chartColors.muted} tickFormatter={formatter ?? ((v: number) => v.toLocaleString())} tickLine={false} width={64} yAxisId="left" />
 <YAxis stroke={chartColors.muted} orientation="right" tickFormatter={(v: number) => `${v}%`} tickLine={false} width={48} yAxisId="right" />
 <Tooltip content={<CustomTooltip />} />
 <Legend wrapperStyle={{ fontSize: "12px" }} />
 {bars.map((bar) => (
 <Bar key={bar.key} dataKey={bar.key} fill={bar.color} name={bar.name} radius={[4, 4, 0, 0]} yAxisId="left" />
 ))}
 {lines.map((line) => (
 <Line key={line.key} dataKey={line.key} stroke={line.color} name={line.name} strokeWidth={2.5} type="monotone" yAxisId="right" dot={false} />
 ))}
 </BarChart>
 </ResponsiveContainer>
 );
}