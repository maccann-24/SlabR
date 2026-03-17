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

  const revenueRescued = Math.round(revenueThisMonthResult[0]?.total ?? 0);
  const callsToday = callsTodayResult[0]?.count ?? 0;
  const leadsToday = leadsTodayResult[0]?.count ?? 0;
  const appointmentsToday = appointmentsTodayResult[0]?.count ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
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
        <p className="text-sm font-medium text-amber-500 uppercase tracking-wider relative">
          Revenue Rescued — {today.toLocaleString("default", { month: "long" })}
        </p>
        <p className="mt-3 text-5xl sm:text-6xl font-bold font-mono text-amber-500 tracking-tight glow-gold relative">
          ${revenueRescued.toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-slate-500 relative">
          across {activeClients.length} active client{activeClients.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Active Clients" value={activeClients.length.toString()} sub={`${allClients.length} total`} />
        <StatCard label="MRR" value={`$${mrr.toLocaleString()}`} sub="active plans" accent />
        <StatCard label="Calls Today" value={callsToday.toString()} sub="inbound" />
        <StatCard label="Leads Today" value={leadsToday.toString()} sub="captured" />
        <StatCard label="Appointments" value={appointmentsToday.toString()} sub="booked by AI" />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border ${accent ? "border-amber-500/20" : "border-slate-800"} bg-slate-900/50 p-5 card-hover`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-bold font-mono ${accent ? "text-amber-500" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-600">{sub}</p>
    </div>
  );
}
