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
    green: "bg-emerald-100 text-emerald-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-600",
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
      <h1 className="text-2xl font-bold text-gray-900">Lead Feed</h1>
      <p className="mt-1 text-sm text-gray-500">
        Latest 50 leads across all clients
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Issue
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leadsWithClients.map(({ lead, clientName }) => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {clientName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {lead.contactName ?? "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {lead.contactPhone}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                  {lead.issueDescription ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={lead.status}
                    color={leadStatusColor(lead.status)}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {lead.source}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
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
