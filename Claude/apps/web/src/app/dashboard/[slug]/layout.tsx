import Link from "next/link";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const client = await db
    .select({ name: schema.clients.name })
    .from(schema.clients)
    .where(eq(schema.clients.slug, slug))
    .then((rows) => rows[0]);

  const businessName = client?.name ?? "Dashboard";

  const navItems = [
    { href: `/dashboard/${slug}/overview`, label: "Overview", icon: "📊" },
    { href: `/dashboard/${slug}/analytics`, label: "Analytics", icon: "📈" },
    { href: `/dashboard/${slug}/clients`, label: "Customers", icon: "👤" },
    { href: `/dashboard/${slug}/services`, label: "Services", icon: "🔧" },
    { href: `/dashboard/${slug}/calls`, label: "Calls", icon: "📞" },
    { href: `/dashboard/${slug}/reviews`, label: "Reviews", icon: "⭐" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Top Nav */}
      <header className="border-b border-slate-800 bg-[#060a14]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-lg font-bold text-white">{businessName}</h1>
              <DashboardNav
                navItems={navItems}
                slug={slug}
                className="hidden sm:flex gap-1"
              />
            </div>
            <p className="text-xs text-slate-600">
              Powered by <span className="text-slate-400">ServiceLine</span>
              <span className="text-amber-500">AI</span>
            </p>
          </div>
          {/* Mobile nav */}
          <DashboardNav
            navItems={navItems}
            slug={slug}
            className="flex sm:hidden gap-1 pb-3"
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
