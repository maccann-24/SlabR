import Link from "next/link";
import { db, schema } from "@/lib/db";
import { eq, gte, lt, and, sql } from "drizzle-orm";
import { BUSINESS } from "@serviceline/config";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const [
    allClients,
    callsTodayResult,
    leadsTodayResult,
    appointmentsTodayResult,
    revenueThisMonthResult,
    revenueLastMonthResult,
    callsThisWeekResult,
    callsLastWeekResult,
    appointmentsThisMonthResult,
    appointmentsLastMonthResult,
    leadsThisMonthResult,
    leadsLastMonthResult,
    allTimeRevenueResult,
    perClientRevenue,
    perClientAppointments,
    pipelineThisMonth,
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
    // Revenue this month
    db
      .select({
        total: sql<number>`coalesce(sum(estimated_revenue_rescued::numeric), 0)::float`,
      })
      .from(schema.revenueMetrics)
      .where(gte(schema.revenueMetrics.date, startOfMonth.toISOString().slice(0, 10))),
    // Revenue last month
    db
      .select({
        total: sql<number>`coalesce(sum(estimated_revenue_rescued::numeric), 0)::float`,
      })
      .from(schema.revenueMetrics)
      .where(
        and(
          gte(schema.revenueMetrics.date, startOfLastMonth.toISOString().slice(0, 10)),
          lt(schema.revenueMetrics.date, startOfMonth.toISOString().slice(0, 10))
        )
      ),
    // Calls this week
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.calls)
      .where(gte(schema.calls.createdAt, startOfWeek)),
    // Calls last week
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.calls)
      .where(
        and(
          gte(schema.calls.createdAt, startOfLastWeek),
          lt(schema.calls.createdAt, startOfWeek)
        )
      ),
    // Appointments this month
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.appointments)
      .where(gte(schema.appointments.createdAt, startOfMonth)),
    // Appointments last month
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.appointments)
      .where(
        and(
          gte(schema.appointments.createdAt, startOfLastMonth),
          lt(schema.appointments.createdAt, startOfMonth)
        )
      ),
    // Leads this month
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.leads)
      .where(gte(schema.leads.createdAt, startOfMonth)),
    // Leads last month
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.leads)
      .where(
        and(
          gte(schema.leads.createdAt, startOfLastMonth),
          lt(schema.leads.createdAt, startOfMonth)
        )
      ),
    // All-time revenue
    db
      .select({
        total: sql<number>`coalesce(sum(estimated_revenue_rescued::numeric), 0)::float`,
      })
      .from(schema.revenueMetrics),
    // Per-client revenue this month
    db
      .select({
        clientId: schema.revenueMetrics.clientId,
        revenue: sql<number>`coalesce(sum(estimated_revenue_rescued::numeric), 0)::float`,
        calls: sql<number>`coalesce(sum(calls_rescued), 0)::int`,
        appointments: sql<number>`coalesce(sum(appointments_booked), 0)::int`,
        reviews: sql<number>`coalesce(sum(reviews_received), 0)::int`,
      })
      .from(schema.revenueMetrics)
      .where(gte(schema.revenueMetrics.date, startOfMonth.toISOString().slice(0, 10)))
      .groupBy(schema.revenueMetrics.clientId),
    // Per-client appointments all-time
    db
      .select({
        clientId: schema.revenueMetrics.clientId,
        totalRevenue: sql<number>`coalesce(sum(estimated_revenue_rescued::numeric), 0)::float`,
        totalAppointments: sql<number>`coalesce(sum(appointments_booked), 0)::int`,
      })
      .from(schema.revenueMetrics)
      .groupBy(schema.revenueMetrics.clientId),
    // Pipeline this month: calls → leads → appointments
    db
      .select({
        totalCalls: sql<number>`coalesce(sum(calls_rescued), 0)::int`,
        totalLeads: sql<number>`coalesce(sum(leads_created), 0)::int`,
        totalAppointments: sql<number>`coalesce(sum(appointments_booked), 0)::int`,
      })
      .from(schema.revenueMetrics)
      .where(gte(schema.revenueMetrics.date, startOfMonth.toISOString().slice(0, 10))),
  ]);

  const activeClients = allClients.filter(
    (c) => c.status === "active" || c.status === "pilot"
  );
  const mrr = activeClients.reduce((sum, c) => {
    return sum + (c.plan === "pro" ? BUSINESS.pricing.pro : BUSINESS.pricing.starter);
  }, 0);

  const revenueRescued = Math.round(revenueThisMonthResult[0]?.total ?? 0);
  const revenueLastMonth = Math.round(revenueLastMonthResult[0]?.total ?? 0);
  const callsToday = callsTodayResult[0]?.count ?? 0;
  const leadsToday = leadsTodayResult[0]?.count ?? 0;
  const appointmentsToday = appointmentsTodayResult[0]?.count ?? 0;
  const callsThisWeek = callsThisWeekResult[0]?.count ?? 0;
  const callsLastWeek = callsLastWeekResult[0]?.count ?? 0;
  const apptsThisMonth = appointmentsThisMonthResult[0]?.count ?? 0;
  const apptsLastMonth = appointmentsLastMonthResult[0]?.count ?? 0;
  const leadsThisMonth = leadsThisMonthResult[0]?.count ?? 0;
  const leadsLastMonth = leadsLastMonthResult[0]?.count ?? 0;
  const allTimeRevenue = Math.round(allTimeRevenueResult[0]?.total ?? 0);

  const pipeline = pipelineThisMonth[0];
  const pipelineCalls = pipeline?.totalCalls ?? 0;
  const pipelineLeads = pipeline?.totalLeads ?? 0;
  const pipelineAppts = pipeline?.totalAppointments ?? 0;

  // Per-client maps
  const revenueMap = new Map(
    perClientRevenue.map((r) => [r.clientId, r])
  );
  const allTimeMap = new Map(
    perClientAppointments.map((r) => [r.clientId, r])
  );

  // ROI: revenue rescued vs subscription cost
  const roiMultiple =
    mrr > 0 ? (revenueRescued / mrr).toFixed(1) : "—";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            {today.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          All systems operational
        </div>
      </div>

      {/* Revenue Rescued — hero card */}
      <div className="mt-8 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-500 uppercase tracking-wider">
                Revenue Rescued —{" "}
                {today.toLocaleString("default", { month: "long" })}
              </p>
              <p className="mt-3 text-5xl sm:text-6xl font-bold font-mono text-amber-500 tracking-tight glow-gold">
                ${revenueRescued.toLocaleString()}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <p className="text-sm text-slate-500">
                  across {activeClients.length} active client
                  {activeClients.length !== 1 ? "s" : ""}
                </p>
                {revenueLastMonth > 0 && (
                  <DeltaBadge
                    current={revenueRescued}
                    previous={revenueLastMonth}
                  />
                )}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-600 uppercase tracking-wider">
                All-Time
              </p>
              <p className="mt-1 text-2xl font-bold font-mono text-slate-400">
                ${allTimeRevenue.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-slate-600 uppercase tracking-wider">
                ROI vs MRR
              </p>
              <p className="mt-1 text-xl font-bold font-mono text-emerald-400">
                {roiMultiple}x
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Active Clients"
          value={activeClients.length.toString()}
          sub={`${allClients.length} total`}
        />
        <StatCard
          label="MRR"
          value={`$${mrr.toLocaleString()}`}
          sub={`${roiMultiple}x ROI this month`}
          accent
        />
        <StatCard
          label="Calls Today"
          value={callsToday.toString()}
          sub={`${callsThisWeek} this week`}
          delta={callsLastWeek > 0 ? callsThisWeek - callsLastWeek : undefined}
          deltaLabel="WoW"
        />
        <StatCard
          label="Leads Today"
          value={leadsToday.toString()}
          sub={`${leadsThisMonth} this month`}
          delta={leadsLastMonth > 0 ? leadsThisMonth - leadsLastMonth : undefined}
          deltaLabel="MoM"
        />
        <StatCard
          label="Appointments"
          value={appointmentsToday.toString()}
          sub={`${apptsThisMonth} this month`}
          delta={apptsLastMonth > 0 ? apptsThisMonth - apptsLastMonth : undefined}
          deltaLabel="MoM"
        />
      </div>

      {/* Pipeline Funnel — this month */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Monthly Pipeline
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <PipelineStep
            label="Calls Rescued"
            value={pipelineCalls}
            color="text-blue-400"
            barColor="bg-blue-500/20"
            barFill="bg-blue-500"
            total={pipelineCalls}
          />
          <PipelineStep
            label="Leads Created"
            value={pipelineLeads}
            color="text-indigo-400"
            barColor="bg-indigo-500/20"
            barFill="bg-indigo-500"
            total={pipelineCalls}
          />
          <PipelineStep
            label="Appointments Booked"
            value={pipelineAppts}
            color="text-emerald-400"
            barColor="bg-emerald-500/20"
            barFill="bg-emerald-500"
            total={pipelineCalls}
          />
        </div>
        {pipelineCalls > 0 && (
          <p className="mt-3 text-xs text-slate-600">
            {Math.round((pipelineAppts / pipelineCalls) * 100)}% of rescued
            calls converted to booked appointments
          </p>
        )}
      </div>

      {/* Per-Client ROI Table */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Client Performance — {today.toLocaleString("default", { month: "long" })}
          </h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Calls
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Appts
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Reviews
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {activeClients.map((client) => {
                const metrics = revenueMap.get(client.id);
                const clientRevenue = Math.round(metrics?.revenue ?? 0);
                const clientCalls = metrics?.calls ?? 0;
                const clientAppts = metrics?.appointments ?? 0;
                const clientReviews = metrics?.reviews ?? 0;
                const subscriptionCost = client.plan === "pro" ? BUSINESS.pricing.pro : BUSINESS.pricing.starter;
                const clientROI =
                  subscriptionCost > 0
                    ? (clientRevenue / subscriptionCost).toFixed(1)
                    : "—";

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-sm font-medium text-white hover:text-amber-500"
                      >
                        {client.name}
                      </Link>
                      <p className="text-xs text-slate-600">{client.status}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          client.plan === "pro"
                            ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                            : "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20"
                        }`}
                      >
                        {client.plan}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-mono text-white">
                      {clientCalls}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-mono text-emerald-400">
                      {clientAppts}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-mono text-slate-400">
                      {clientReviews}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-mono font-semibold text-white">
                      ${clientRevenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`text-sm font-mono font-semibold ${
                          Number(clientROI) >= 2
                            ? "text-emerald-400"
                            : Number(clientROI) >= 1
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {clientROI}x
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Components ──

function DeltaBadge({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const isUp = pct >= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isUp
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      {isUp ? "↑" : "↓"} {Math.abs(pct)}% MoM
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  delta?: number;
  deltaLabel?: string;
}) {
  return (
    <div
      className={`rounded-xl border ${accent ? "border-amber-500/20" : "border-slate-800"} bg-slate-900/50 p-5 card-hover`}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold font-mono ${accent ? "text-amber-500" : "text-white"}`}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-xs text-slate-600">{sub}</p>
        {delta !== undefined && (
          <span
            className={`text-xs font-medium ${
              delta >= 0 ? "text-emerald-400/70" : "text-red-400/70"
            }`}
          >
            {delta >= 0 ? "↑" : "↓"}
            {Math.abs(delta)} {deltaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function PipelineStep({
  label,
  value,
  color,
  barColor,
  barFill,
  total,
}: {
  label: string;
  value: number;
  color: string;
  barColor: string;
  barFill: string;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`mt-1 text-2xl font-bold font-mono ${color}`}>{value}</p>
      <div className={`mt-2 h-1.5 rounded-full ${barColor}`}>
        <div
          className={`h-full rounded-full ${barFill} transition-all`}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
      {total > 0 && total !== value && (
        <p className="mt-1 text-xs text-slate-600">{pct}% of calls</p>
      )}
    </div>
  );
}
