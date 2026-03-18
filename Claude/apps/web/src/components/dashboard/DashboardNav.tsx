"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface DashboardNavProps {
  navItems: NavItem[];
  slug: string;
  className?: string;
}

export function DashboardNav({
  navItems,
  slug,
  className = "flex gap-1",
}: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const linkClassName = isActive
          ? "rounded-lg px-3 py-2 text-sm font-medium text-white bg-slate-800/50 transition-colors"
          : "rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors";

        return (
          <Link
            key={item.href}
            href={item.href}
            className={linkClassName}
          >
            <span className="mr-1.5">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
