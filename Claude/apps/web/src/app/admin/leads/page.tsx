import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function Badge({
  label,
  color,
}: {
  label: string;
  color: "green" | "yellow" | "red" | "blue" | "gray";
}) {
  const colors = {
    green: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20",
    red: "bg-red-500/10 text-red-400 ring-1 ring-red-500/20",
    blue: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20",
    gray: "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[color]}`}
    >
      {label}
    </span>
  );
}

function leadStatusColor(
  status: string
): "green" | "yellow" | "red" | "blue" | "gray" {
  switch (status) {
    case "booked":
    case "converted":
      return "green";
    case "new":
      return "yellow";
    case "lost":
      return "red";
    case "contacted":
      return "blue";
    default:
      return "gray";
  }
}

export default async function LeadsPage() {
  const leadsWithClients = await db
    .select({
      lead: schema.leads,
      clientName: schema.clients.name,
    })
    .from(schema.leads)
    .innerJoin(schema.clients, eq(schema.leads.clientId, schema.clients.id))
    .orderBy(desc(schema.leads.createdAt))
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Lead Feed</h1>
      <p className="mt-1 text-sm text-slate-500">
        Latest 50 leads across all clients
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Issue
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {leadsWithClients.map(({ lead, clientName }) => (
              <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-white">
                  {clientName}
                </td>
                <td className="px-4 py-3 text-sm text-white">
                  {lead.contactName ?? "-"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {lead.contactPhone}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                  {lead.issueDescription ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={lead.status}
                    color={leadStatusColor(lead.status)}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {lead.source}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                  {lead.createdAt
                    ? new Date(lead.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
