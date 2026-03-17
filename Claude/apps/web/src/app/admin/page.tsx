import { db, schema } from "@/lib/db";
import { eq, gte, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    allClients,
    callsTodayResult,
    leadsTodayResult,
    appointmentsTodayResult,
    revenueThisMonthResult,
  ] = await Promise.all([
    db.select().from(schema.clients),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.calls)
      .where(gte(schema.calls.createdAt, startOfToday)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.leads)
      .where(gte(schema.leads.createdAt, startOfToday)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.appointments)
      .where(gte(schema.appointments.createdAt, startOfToday)),
    db
      .select({
        total: sql<number>`coalesce(sum(estimated_revenue_rescued::numeric), 0)::float`,
      })
      .from(schema.revenueMetrics)
      .where(gte(schema.revenueMetrics.date, startOfMonth.toISOString().slice(0, 10))),
  ]);

  const activeClients = allClients.filter(
    (c) => c.status === "active" || c.status === "pilot"
  );
  const mrr = activeClients.reduce((sum, c) => {
    return sum + (c.plan === "pro" ? 499 : 199);
  }, 0);

  const stats = [
    {
      label: "Active Clients",
      value: activeClients.length.toString(),
      sub: `${allClients.length} total`,
    },
    {
      label: "Monthly Recurring Revenue",
      value: `$${mrr.toLocaleString()}`,
      sub: "based on active plans",
    },
    {
      label: "Revenue Rescued (Month)",
      value: `$${Math.round(revenueThisMonthResult[0]?.total ?? 0).toLocaleString()}`,
      sub: new Date().toLocaleString("default", { month: "long" }),
    },
    {
      label: "Calls Today",
      value: (callsTodayResult[0]?.count ?? 0).toString(),
      sub: "inbound calls",
    },
    {
      label: "Leads Today",
      value: (leadsTodayResult[0]?.count ?? 0).toString(),
      sub: "new leads captured",
    },
    {
      label: "Appointments Today",
      value: (appointmentsTodayResult[0]?.count ?? 0).toString(),
      sub: "booked by AI",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        System overview for ServiceLine AI
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-gray-400">{stat.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
