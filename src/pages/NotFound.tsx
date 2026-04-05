import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

// Страница 404 показывается при переходе на несуществующий маршрут.
const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  // Логируем неверный маршрут в консоль, чтобы было проще отлавливать битые ссылки.
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t("notFoundTitle")}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notFoundDesc")}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">{t("notFoundLink")}</a>
      </div>
    </div>
  );
};

export default NotFound;
