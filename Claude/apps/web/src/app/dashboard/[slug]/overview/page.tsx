import { db, schema } from "@/lib/db";
import { eq, gte, and, sql, desc } from "drizzle-orm";
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

  // Current month metrics
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
        gte(
          schema.revenueMetrics.date,
          startOfMonth.toISOString().slice(0, 10)
        )
      )
    );

  // 6-month trend data
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
        gte(
          schema.revenueMetrics.date,
          sixMonthsAgo.toISOString().slice(0, 10)
        )
      )
    )
    .groupBy(
      sql`to_char(date::date, 'Mon')`,
      sql`to_char(date::date, 'YYYY-MM')`
    )
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
      {/* Hero Revenue Number */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 sm:p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-emerald-700 uppercase tracking-wider">
          Revenue Rescued This Month
        </p>
        <p className="mt-4 text-5xl sm:text-7xl font-extrabold text-emerald-600 tracking-tight">
          ${revenueRescued.toLocaleString()}
        </p>
        <p className="mt-3 text-sm text-gray-500">
          {new Date().toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Calls Rescued" value={callsRescued.toString()} />
        <StatCard
          label="Appointments Booked"
          value={appointmentsBooked.toString()}
        />
        <StatCard label="Avg Response Time" value="< 10 sec" />
        <StatCard label="Reviews Collected" value={reviewsCollected.toString()} />
      </div>

      {/* 6-Month Trend Chart */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Revenue Rescued - 6 Month Trend
        </h2>
        {chartData.length > 0 ? (
          <RevenueChart data={chartData} />
        ) : (
          <p className="text-sm text-gray-400 text-center py-16">
            Not enough data to display chart yet.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
