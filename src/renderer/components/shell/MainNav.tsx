import { type LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface MainNavProps {
  items: NavItem[];
  collapsed: boolean;
}

export function MainNav({ items, collapsed }: MainNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname.startsWith(item.href);
        return (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "hover:bg-zinc-700/50",
              isActive
                ? "bg-indigo-500/15 text-indigo-400"
                : "text-zinc-400 hover:text-zinc-100",
            )}
            title={collapsed ? item.label : undefined}
          >
            {Icon && (
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            )}
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
