"use client";

import { useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
} from "recharts";

interface ChartRow {
  [key: string]: string | number;
  revenue: number;
  calls: number;
  appointments: number;
  leads: number;
}

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid #1e293b",
  background: "#0f172a",
  color: "#e2e8f0",
  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
  fontFamily: "var(--font-jetbrains), monospace",
  fontSize: "13px",
};

export default function AnalyticsCharts({
  dailyData,
  monthlyData,
}: {
  dailyData: ChartRow[];
  monthlyData: ChartRow[];
}) {
  const [view, setView] = useState<"daily" | "monthly">("daily");
  const [metric, setMetric] = useState<"revenue" | "calls" | "appointments" | "leads">("revenue");

  const data = view === "daily" ? dailyData : monthlyData;
  const xKey = view === "daily" ? "day" : "month";

  const metricConfig = {
    revenue: { label: "Revenue", color: "#f59e0b", prefix: "$" },
    calls: { label: "Calls", color: "#3b82f6", prefix: "" },
    appointments: { label: "Appointments", color: "#10b981", prefix: "" },
    leads: { label: "Leads", color: "#6366f1", prefix: "" },
  };

  const cfg = metricConfig[metric];

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-1 rounded-lg bg-slate-800/50 p-1">
          {(["daily", "monthly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === v
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {v === "daily" ? "30-Day" : "6-Month"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-800/50 p-1">
          {(Object.keys(metricConfig) as Array<keyof typeof metricConfig>).map(
            (m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  metric === m
                    ? "bg-slate-700 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {metricConfig[m].label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metric === "revenue" ? (
              <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cfg.color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey={xKey}
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "var(--font-jetbrains), monospace" }}
                  tickLine={false}
                  axisLine={{ stroke: "#1e293b" }}
                  interval={view === "daily" ? 4 : 0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "var(--font-jetbrains), monospace" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                />
                <Tooltip
                  formatter={(value) => [`${cfg.prefix}${Number(value).toLocaleString()}`, cfg.label]}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#64748b", marginBottom: "4px" }}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={cfg.color}
                  strokeWidth={2}
                  fill="url(#analyticsGradient)"
                  dot={{ r: 3, fill: cfg.color, strokeWidth: 2, stroke: "#0f172a" }}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey={xKey}
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "var(--font-jetbrains), monospace" }}
                  tickLine={false}
                  axisLine={{ stroke: "#1e293b" }}
                  interval={view === "daily" ? 4 : 0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "var(--font-jetbrains), monospace" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${cfg.prefix}${Number(value).toLocaleString()}`, cfg.label]}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#64748b", marginBottom: "4px" }}
                />
                <Bar
                  dataKey={metric}
                  fill={cfg.color}
                  radius={[4, 4, 0, 0]}
                  barSize={view === "daily" ? 12 : 32}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-slate-600 text-center py-16">
          Not enough data yet.
        </p>
      )}
    </div>
  );
}
