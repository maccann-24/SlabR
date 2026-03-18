import Link from "next/link";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
    pilot: "bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20",
    paused: "bg-red-500/10 text-red-400 ring-1 ring-red-500/20",
    churned: "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20"}`}
    >
      {status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        plan === "pro"
          ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
          : "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20"
      }`}
    >
      {plan}
    </span>
  );
}

export default async function ClientsPage() {
  const allClients = await db.select().from(schema.clients);

  // Get revenue rescued per client
  const revenueByClient = await db
    .select({
      clientId: schema.revenueMetrics.clientId,
      total: sql<number>`coalesce(sum(estimated_revenue_rescued::numeric), 0)::float`,
    })
    .from(schema.revenueMetrics)
    .groupBy(schema.revenueMetrics.clientId);

  const revenueMap = new Map(
    revenueByClient.map((r) => [r.clientId, r.total])
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            All ServiceLine AI customers
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Client
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Twilio Phone
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Revenue Rescued
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {allClients.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="text-sm font-medium text-white hover:text-amber-500"
                  >
                    {client.name}
                  </Link>
                  <p className="text-xs text-slate-500">{client.ownerName}</p>
                </td>
                <td className="px-6 py-4">
                  <PlanBadge plan={client.plan} />
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {client.twilioPhone}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-white">
                  ${Math.round(revenueMap.get(client.id) ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
