import Link from "next/link";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    pilot: "bg-yellow-100 text-yellow-800",
    paused: "bg-red-100 text-red-800",
    churned: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}
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
          ? "bg-blue-100 text-blue-800"
          : "bg-gray-100 text-gray-600"
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
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            All ServiceLine AI customers
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Client
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Twilio Phone
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue Rescued
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allClients.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-emerald-600"
                  >
                    {client.name}
                  </Link>
                  <p className="text-xs text-gray-400">{client.ownerName}</p>
                </td>
                <td className="px-6 py-4">
                  <PlanBadge plan={client.plan} />
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {client.twilioPhone}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
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
