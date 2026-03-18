"use client";

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
  ComposedChart,
  Line,
} from "recharts";

interface MonthlyData {
  month: string;
  revenue: number;
  appointments: number;
  calls: number;
  leads: number;
}

export default function OverviewCharts({ data }: { data: MonthlyData[] }) {
  return (
    <div className="space-y-8">
      {/* Revenue trend — area chart */}
      <div>
        <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">
          Revenue Rescued
        </p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 12,
                  fill: "#64748b",
                  fontFamily: "var(--font-jetbrains), monospace",
                }}
                tickLine={false}
                axisLine={{ stroke: "#1e293b" }}
              />
              <YAxis
                tick={{
                  fontSize: 12,
                  fill: "#64748b",
                  fontFamily: "var(--font-jetbrains), monospace",
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                }
              />
              <Tooltip
                formatter={(value) => [
                  `$${Number(value).toLocaleString()}`,
                  "Revenue",
                ]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #1e293b",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: "13px",
                }}
                labelStyle={{ color: "#64748b", marginBottom: "4px" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#goldGradient)"
                dot={{
                  r: 4,
                  fill: "#f59e0b",
                  strokeWidth: 2,
                  stroke: "#0f172a",
                }}
                activeDot={{
                  r: 6,
                  fill: "#f59e0b",
                  stroke: "#f59e0b",
                  strokeWidth: 2,
                  strokeOpacity: 0.3,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appointments + Calls — bar chart */}
      <div>
        <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">
          Appointments & Calls
        </p>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 12,
                  fill: "#64748b",
                  fontFamily: "var(--font-jetbrains), monospace",
                }}
                tickLine={false}
                axisLine={{ stroke: "#1e293b" }}
              />
              <YAxis
                tick={{
                  fontSize: 12,
                  fill: "#64748b",
                  fontFamily: "var(--font-jetbrains), monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #1e293b",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: "13px",
                }}
                labelStyle={{ color: "#64748b", marginBottom: "4px" }}
              />
              <Bar
                dataKey="calls"
                name="Calls Rescued"
                fill="#334155"
                radius={[4, 4, 0, 0]}
                barSize={28}
              />
              <Bar
                dataKey="appointments"
                name="Appointments"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={28}
              />
              <Line
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: "#6366f1", stroke: "#0f172a", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
