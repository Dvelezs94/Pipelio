"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import { logout } from "@/app/actions/auth";
import type { AuthUser } from "@/lib/auth";
import { LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Search", match: (path: string) => path === "/" || path.startsWith("/results") },
  { href: "/db", label: "Database", match: (path: string) => path.startsWith("/db") },
  { href: "/crm", label: "CRM", match: (path: string) => path.startsWith("/crm") },
  { href: "/settings/extension", label: "Extension", match: (path: string) => path.startsWith("/settings") },
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
    <nav className="border-b bg-card px-4 py-2">
      <div className="container mx-auto flex items-center gap-2">
        <Link
          href={user ? "/" : "/login"}
          className="text-sm font-semibold text-primary tracking-tight shrink-0 mr-1"
        >
          {APP_NAME}
        </Link>
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
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.name}</span>
              <form action={logout}>
                <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </form>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
