import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, Mail, MapPin, MessageCircle, ArrowUpRight } from "lucide-react";

// Компонент подвала завершает страницу ссылками, контактами и районами обслуживания сервиса.
export const Footer = () => {
  const { t } = useLanguage();

  // Список районов выводится отдельными бейджами в контактной части подвала.
  const districts = ["districtSino", "districtFirdausi", "districtShomansur", "districtIsmoili"];

  const navLinks = [
    { path: "/about", labelKey: "navAbout" },
    { path: "/categories", labelKey: "navCategories" },
    { path: "/how-it-works", labelKey: "navHowItWorks" },
    { path: "/contacts", labelKey: "navContacts" },
    { path: "/masters", labelKey: "navMasters" },
    { path: "/shop", labelKey: "navShop" },
  ];

  const serviceLinks = [
    { path: "/become-master", labelKey: "footerBecomeMaster" },
    { path: "/services", labelKey: "servicesTitle" },
  ];

  return (
    <footer className="relative overflow-hidden">
      {/* Верхняя линия визуально отделяет подвал от основного содержимого страницы. */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="bg-foreground text-background">
        <div className="container px-4 mx-auto">
          {/* Основная сетка подвала делит контент на бренд, навигацию, услуги и контакты. */}
          <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-12 py-16">
            {/* Брендовый блок знакомит с проектом и даёт быстрый переход в WhatsApp. */}
            <div className="col-span-2 md:col-span-4">
              <Link to="/" className="inline-flex items-center gap-2.5 mb-5 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center font-bold text-lg shadow-lg">
                  М
                </div>
                <span className="text-xl font-bold font-display">Мастер Час</span>
              </Link>
              <p className="text-background/50 text-sm leading-relaxed mb-6 max-w-xs">
                {t("footerAboutText")}
              </p>
              <a
                href="https://wa.me/992979117007"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium transition-colors shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            </div>

            {/* Навигационный столбец повторяет главные пользовательские разделы сайта. */}
            <div className="md:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-background/30 mb-5">
                {t("navAbout")}
              </h3>
              <ul className="space-y-3">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-background/60 hover:text-background transition-colors text-sm inline-flex items-center gap-1 group">
                      {t(link.labelKey)}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Этот столбец ведёт к сервисным разделам и точкам входа для мастеров. */}
            <div className="md:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-background/30 mb-5">
                {t("footerServices")}
              </h3>
              <ul className="space-y-3">
                {serviceLinks.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-background/60 hover:text-background transition-colors text-sm inline-flex items-center gap-1 group">
                      {t(link.labelKey)}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
                <li>
                  <span className="text-background/40 text-sm">{t("footerForBusiness")}</span>
                </li>
              </ul>
            </div>

            {/* Контактный блок содержит способы связи и список обслуживаемых районов. */}
            <div className="col-span-2 md:col-span-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-background/30 mb-5">
                {t("footerContacts")}
              </h3>
              <div className="space-y-3 mb-6">
                <a href="tel:+992979117007" className="flex items-center gap-3 text-background/60 hover:text-background transition-colors text-sm group">
                  <div className="w-8 h-8 rounded-lg bg-background/10 flex items-center justify-center group-hover:bg-background/15 transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span>+992 979 11 70 07</span>
                </a>
                <a href="mailto:support@masterchas.tj" className="flex items-center gap-3 text-background/60 hover:text-background transition-colors text-sm group">
                  <div className="w-8 h-8 rounded-lg bg-background/10 flex items-center justify-center group-hover:bg-background/15 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span>support@masterchas.tj</span>
                </a>
                <span className="flex items-center gap-3 text-background/60 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-background/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span>Душанбе, Тоҷикистон</span>
                </span>
              </div>
              <h4 className="text-xs font-semibold text-background/30 mb-3">{t("footerDistricts")}</h4>
              <div className="flex flex-wrap gap-2">
                {districts.map((district) => (
                  <span key={district} className="text-xs text-background/35 bg-background/8 px-3 py-1.5 rounded-lg">
                    {t(district)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Нижняя полоса показывает копирайт и ссылки на юридические разделы. */}
          <div className="border-t border-background/10 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-background/40">{t("footerRights")}</p>
            <div className="flex items-center gap-6 text-xs text-background/40">
              <a href="#" className="hover:text-background/70 transition-colors">{t("footerPrivacy")}</a>
              <a href="#" className="hover:text-background/70 transition-colors">{t("footerTerms")}</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
