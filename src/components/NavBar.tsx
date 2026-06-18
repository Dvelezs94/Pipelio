"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth";
import { NavigationProgress } from "@/components/NavigationProgress";

const NAV_ITEMS = [
  { href: "/", label: "Search", match: (path: string) => path === "/" || path.startsWith("/results") },
  { href: "/db", label: "Database", match: (path: string) => path.startsWith("/db") },
  { href: "/crm", label: "CRM", match: (path: string) => path.startsWith("/crm") },
] as const;

const AUTH_PATHS = ["/login", "/register"];

function linkClass(active: boolean) {
  return cn(
    "text-sm font-medium rounded-md px-2.5 py-1 transition-colors",
    active
      ? "text-foreground bg-muted"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
  );
}

export function NavBar({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <nav className="relative border-b bg-card px-4 py-2">
      <NavigationProgress />
      <div className="container mx-auto flex items-center gap-2">
        <Logo href={user ? "/" : "/login"} size="sm" className="mr-1" />
        {!isAuthPage && user && <WorkspaceSwitcher />}
        <div className="flex items-center gap-2 flex-1">
          {!isAuthPage &&
            NAV_ITEMS.map(({ href, label, match }) => (
              <Link
                key={href}
                href={href}
                className={linkClass(match(pathname))}
                aria-current={match(pathname) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
        </div>
        <div className="flex items-center gap-2">
          {user && !isAuthPage && (
            <Link
              href="/settings"
              className={cn(
                "text-sm rounded-md px-2.5 py-1 transition-colors",
                pathname.startsWith("/settings")
                  ? "font-medium text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            >
              {user.name}
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
