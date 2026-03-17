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
    { href: `/dashboard/${slug}/overview`, label: "Overview" },
    { href: `/dashboard/${slug}/calls`, label: "Calls" },
    { href: `/dashboard/${slug}/reviews`, label: "Reviews" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-lg font-bold text-gray-900">
                {businessName}
              </h1>
              <nav className="hidden sm:flex gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <p className="text-xs text-gray-400">
              Powered by ServiceLine AI
            </p>
          </div>
          {/* Mobile nav */}
          <nav className="flex sm:hidden gap-1 pb-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
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
