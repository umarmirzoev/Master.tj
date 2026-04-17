import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, ChevronRight, Home, Bell, X, Wrench, Wifi, WifiOff } from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface MasterDashboardLayoutProps {
  children: ReactNode;
  title: string;
  navItems: NavItem[];
  isAvailable?: boolean;
  onToggleAvailability?: () => void;
}

// Layout кабинета мастера добавляет профильный сайдбар и переключатель доступности к работе.
export default function MasterDashboardLayout({
  children,
  title,
  navItems,
  isAvailable = true,
  onToggleAvailability,
}: MasterDashboardLayoutProps) {
  const { signOut, profile, user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useNotifications(user?.id);
  const [showNotifs, setShowNotifs] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[hsl(160,30%,8%)] text-white">
      {/* Logo - master branding */}
      <div className="p-5 border-b border-white/10">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/30">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold text-white block leading-tight">{t("brandName")}</span>
            <span className="text-[11px] text-emerald-400/80 font-medium">Панель мастера</span>
          </div>
        </Link>
      </div>

      {/* Profile card */}
      {profile?.full_name && (
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-sm font-bold text-white">
                {profile.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{profile.full_name}</p>
              <p className="text-[11px] text-white/50 truncate">{profile.phone || "Мастер"}</p>
            </div>
          </div>
          {/* Availability status */}
          <button
            onClick={onToggleAvailability}
            className={`mt-3 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isAvailable
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-white/5 text-white/40 hover:bg-white/10"
            }`}
          >
            {isAvailable ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isAvailable ? "На линии" : "Не в сети"}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-auto">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:bg-white/5 transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          <span>На главную</span>
        </Link>

        <div className="pt-3 pb-1.5 px-3">
          <span className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider">Рабочее меню</span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm group ${
                active
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "text-white/60 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge className={`h-5 min-w-[20px] px-1.5 text-[10px] ${
                    active
                      ? "bg-white/25 text-white border-0"
                      : "bg-emerald-500/20 text-emerald-400 border-0"
                  }`}>
                    {item.badge}
                  </Badge>
                )}
                {active && <ChevronRight className="w-3.5 h-3.5" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-white/10">
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start gap-3 text-white/40 rounded-xl hover:text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          {t("logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop sidebar - dark themed */}
      <aside className="hidden md:flex w-[260px] flex-col shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top header with emerald accent */}
        <header className="sticky top-0 z-40 h-14 border-b border-border/50 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 border-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse hidden md:block" />
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Availability toggle - header */}
            <button
              onClick={onToggleAvailability}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isAvailable
                  ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {isAvailable ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isAvailable ? "На линии" : "Не в сети"}
            </button>

            {/* Notification bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative"
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  if (!showNotifs && unreadCount > 0) markAllRead();
                }}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="font-semibold text-sm">Уведомления</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNotifs(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">Нет уведомлений</p>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={`p-3 ${!n.read ? "bg-emerald-500/5" : ""}`}>
                          <p className="text-sm font-medium text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(n.created_at).toLocaleString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
