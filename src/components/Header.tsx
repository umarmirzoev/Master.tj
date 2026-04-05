import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Languages,
  LogIn,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Building2,
  HelpCircle,
  Phone,
  UserPlus,
  Wrench,
  LayoutDashboard,
  User,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

// Компонент верхней шапки сайта отвечает за навигацию, язык, корзину и вход пользователя.
export default function Header() {
  const { language, setLanguage, t } = useLanguage();
  const { user, profile, signOut, loading, getDashboardPath } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Следим за прокруткой, чтобы менять внешний вид шапки после ухода с первого экрана.
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Основной список ссылок используется и на десктопе, и в мобильном меню.
  const navItems = [
    { path: "/categories", labelKey: "navCategories", icon: Wrench },
    { path: "/masters", labelKey: "navMasters", icon: User },
    { path: "/shop", labelKey: "navShop", icon: ShoppingBag },
    { path: "/services", labelKey: "servicesTitle", icon: Wrench },
    { path: "/how-it-works", labelKey: "navHowItWorks", icon: HelpCircle },
    { path: "/contacts", labelKey: "navContacts", icon: Phone },
    { path: "/become-master", labelKey: "navBecomeMaster", icon: UserPlus },
  ];

  const getLanguageLabel = () => {
    switch (language) {
      case "ru": return "RU";
      case "tj": return "TJ";
      case "en": return "EN";
      default: return "RU";
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "glass shadow-soft border-b border-border/50"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Логотип возвращает пользователя на главную страницу. */}
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
              М
            </div>
            <span className="text-lg font-bold text-foreground hidden sm:block tracking-tight font-display">
              Мастер Час
            </span>
          </Link>

          {/* Навигация для больших экранов показывает основные разделы проекта. */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive(item.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          {/* Правая часть шапки собирает служебные действия пользователя. */}
          <div className="flex items-center gap-1.5">
            {/* Корзина всегда доступна и показывает текущее количество товаров. */}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="rounded-xl relative h-9 w-9">
                <ShoppingCart className="w-[18px] h-[18px]" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Переключатель языка меняет локализацию интерфейса на всём сайте. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 rounded-xl px-2.5 h-9">
                  <Languages className="w-4 h-4" />
                  <span className="text-xs font-semibold">{getLanguageLabel()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[130px] rounded-xl">
                <DropdownMenuItem onClick={() => setLanguage("ru")} className="cursor-pointer rounded-lg">🇷🇺 Русский</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("tj")} className="cursor-pointer rounded-lg">🇹🇯 Тоҷикӣ</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer rounded-lg">🇬🇧 English</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auth actions */}
            <div className="hidden sm:flex items-center gap-1.5">
              {!loading && user ? (
                <>
                  <NotificationBell />
                  <Button onClick={() => navigate(getDashboardPath())} size="sm" variant="ghost" className="rounded-xl gap-2 h-9 px-3">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden md:inline">{t("cabinet")}</span>
                  </Button>
                  <Button onClick={signOut} size="sm" variant="outline" className="rounded-xl gap-2 h-9 px-3 border-border/60">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : !loading ? (
                <Button onClick={() => navigate("/auth")} size="sm" className="rounded-xl gap-2 px-5 h-9 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-sm">
                  <LogIn className="w-4 h-4" />
                  {t("login")}
                </Button>
              ) : null}
            </div>

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden rounded-xl h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0">
                <div className="flex flex-col h-full">
                  <div className="p-5 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold shadow-md">М</div>
                        <span className="text-lg font-bold text-foreground font-display">Мастер Час</span>
                      </div>
                      <SheetClose asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8"><X className="w-5 h-5" /></Button>
                      </SheetClose>
                    </div>
                    {user && profile?.full_name && (
                      <p className="text-sm text-muted-foreground mt-3">{profile.full_name}</p>
                    )}
                  </div>
                  <nav className="flex-1 p-4 space-y-1 overflow-auto">
                    {user && (
                      <SheetClose asChild>
                        <Link to={getDashboardPath()} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-primary/10 text-primary mb-3">
                          <div className="flex items-center gap-3">
                            <LayoutDashboard className="w-5 h-5" />
                            <span className="font-medium">{t("cabinet")}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </Link>
                      </SheetClose>
                    )}
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <SheetClose asChild key={item.path}>
                          <Link
                            to={item.path}
                            className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                              isActive(item.path) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5" />
                              <span className="font-medium">{t(item.labelKey)}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 opacity-50" />
                          </Link>
                        </SheetClose>
                      );
                    })}
                    <div className="pt-4 border-t border-border/50 mt-4 space-y-2">
                      {user ? (
                        <SheetClose asChild>
                          <button
                            onClick={signOut}
                            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl border border-destructive/30 text-destructive font-medium hover:bg-destructive/5 transition-colors"
                          >
                            <LogOut className="w-5 h-5" />
                            {t("logout")}
                          </button>
                        </SheetClose>
                      ) : (
                        <SheetClose asChild>
                          <Link
                            to="/auth"
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-md"
                          >
                            <LogIn className="w-5 h-5" />
                            {t("login")}
                          </Link>
                        </SheetClose>
                      )}
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
