import Link from "next/link";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

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
              <nav className="hidden sm:flex gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors"
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <p className="text-xs text-slate-600">
              Powered by <span className="text-slate-400">ServiceLine</span>
              <span className="text-amber-500">AI</span>
            </p>
          </div>
          {/* Mobile nav */}
          <nav className="flex sm:hidden gap-1 pb-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors"
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
