import { db, schema } from "@/lib/db";
import { eq, gte, and, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import RevenueChart from "@/components/dashboard/RevenueChart";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const client = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.slug, slug))
    .then((rows) => rows[0]);

  if (!client) notFound();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [monthMetrics] = await db
    .select({
      revenueRescued: sql<number>`coalesce(sum(estimated_revenue_rescued::numeric), 0)::float`,
      callsRescued: sql<number>`coalesce(sum(calls_rescued), 0)::int`,
      appointmentsBooked: sql<number>`coalesce(sum(appointments_booked), 0)::int`,
      reviewsRequested: sql<number>`coalesce(sum(reviews_requested), 0)::int`,
      reviewsReceived: sql<number>`coalesce(sum(reviews_received), 0)::int`,
    })
    .from(schema.revenueMetrics)
    .where(
      and(
        eq(schema.revenueMetrics.clientId, client.id),
        gte(schema.revenueMetrics.date, startOfMonth.toISOString().slice(0, 10))
      )
    );

  const monthlyTrend = await db
    .select({
      month: sql<string>`to_char(date::date, 'Mon')`,
      monthSort: sql<string>`to_char(date::date, 'YYYY-MM')`,
      revenue: sql<number>`coalesce(sum(estimated_revenue_rescued::numeric), 0)::float`,
    })
    .from(schema.revenueMetrics)
    .where(
      and(
        eq(schema.revenueMetrics.clientId, client.id),
        gte(schema.revenueMetrics.date, sixMonthsAgo.toISOString().slice(0, 10))
      )
    )
    .groupBy(sql`to_char(date::date, 'Mon')`, sql`to_char(date::date, 'YYYY-MM')`)
    .orderBy(sql`to_char(date::date, 'YYYY-MM')`);

  const chartData = monthlyTrend.map((row) => ({
    month: row.month,
    revenue: Math.round(row.revenue),
  }));

  const revenueRescued = Math.round(monthMetrics?.revenueRescued ?? 0);
  const callsRescued = monthMetrics?.callsRescued ?? 0;
  const appointmentsBooked = monthMetrics?.appointmentsBooked ?? 0;
  const reviewsCollected = monthMetrics?.reviewsReceived ?? 0;

  return (
    <div>
      {/* Revenue Rescued — THE hero */}
      <div className="relative rounded-2xl border border-amber-500/20 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, transparent 60%)" }}>
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-10 sm:p-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-xs font-medium text-amber-500 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse-gold" />
            Revenue Rescued This Month
          </div>

          <p className="text-6xl sm:text-8xl font-bold font-mono text-amber-500 tracking-tight glow-gold">
            ${revenueRescued.toLocaleString()}
          </p>

          <p className="mt-4 text-sm text-slate-500">
            {now.toLocaleString("default", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Calls Rescued" value={callsRescued.toString()} icon="📞" />
        <StatCard label="Appointments" value={appointmentsBooked.toString()} icon="📅" />
        <StatCard label="Avg Response" value="< 10s" icon="⚡" />
        <StatCard label="Reviews" value={reviewsCollected.toString()} icon="⭐" />
      </div>

      {/* Chart */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">6-Month Trend</h2>
          <span className="text-xs text-slate-500 font-mono">Revenue Rescued</span>
        </div>
        {chartData.length > 0 ? (
          <RevenueChart data={chartData} />
        ) : (
          <p className="text-sm text-slate-600 text-center py-16">
            Not enough data yet — check back after your first week.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 card-hover">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold font-mono text-white">{value}</p>
    </div>
  );
}
