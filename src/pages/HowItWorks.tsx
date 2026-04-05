import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, FileText, UserCheck, Eye, ClipboardCheck, Truck, Wrench, Star, Shield, Clock, CheckCircle, DollarSign, ArrowRight, Headphones } from "lucide-react";

// Страница объясняет полный путь клиента: от выбора услуги до завершения заказа.
const HowItWorks = () => {
  const { t } = useLanguage();

  // Здесь собраны все этапы пути клиента от поиска услуги до завершения заказа.
  const steps = [
    { icon: Search, titleKey: "hiwStep1", descKey: "hiwStep1Desc" },
    { icon: FileText, titleKey: "hiwStep2", descKey: "hiwStep2Desc" },
    { icon: UserCheck, titleKey: "hiwStep3", descKey: "hiwStep3Desc" },
    { icon: Eye, titleKey: "hiwStep4", descKey: "hiwStep4Desc" },
    { icon: ClipboardCheck, titleKey: "hiwStep5", descKey: "hiwStep5Desc" },
    { icon: CheckCircle, titleKey: "hiwStep6", descKey: "hiwStep6Desc" },
    { icon: Truck, titleKey: "hiwStep7", descKey: "hiwStep7Desc" },
    { icon: Wrench, titleKey: "hiwStep8", descKey: "hiwStep8Desc" },
    { icon: Star, titleKey: "hiwStep9", descKey: "hiwStep9Desc" },
  ];

  // В этом списке описаны главные плюсы процесса для пользователя.
  const benefits = [
    { icon: Clock, titleKey: "hiwFast", descKey: "hiwFastDesc" },
    { icon: Shield, titleKey: "hiwSafe", descKey: "hiwSafeDesc" },
    { icon: DollarSign, titleKey: "hiwTransparent", descKey: "hiwTransparentDesc" },
    { icon: Headphones, titleKey: "hiwConvenient", descKey: "hiwConvenientDesc" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Вступительный блок кратко объясняет назначение страницы и её содержание. */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container px-4 mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">{t("hiwTitle")}</h1>
            <p className="text-lg text-muted-foreground">{t("hiwSubtitle")}</p>
          </motion.div>
        </div>
      </section>

      {/* Основная временная линия пошагово показывает, как проходит работа с сервисом. */}
      <section className="pb-16">
        <div className="container px-4 mx-auto max-w-4xl">
          <div className="relative">
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />
            <div className="space-y-6">
              {steps.map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-5 sm:p-6 flex items-start gap-4">
                      <div className="relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-lg flex-shrink-0">
                        <step.icon className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary">{t("hiwStep")} {i + 1}</span>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">{t(step.titleKey)}</h3>
                        <p className="text-sm text-muted-foreground">{t(step.descKey)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* После основной схемы показываем, какие выгоды получает клиент. */}
      <section className="py-16 bg-muted/30">
        <div className="container px-4 mx-auto">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-foreground text-center mb-10">
            {t("hiwBenefitsTitle")}
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {benefits.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center p-6 rounded-2xl bg-card border shadow-sm">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                  <b.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-1">{t(b.titleKey)}</h3>
                <p className="text-xs text-muted-foreground">{t(b.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Этот раздел отдельно акцентирует внимание на безопасности и гарантиях. */}
      <section className="py-16">
        <div className="container px-4 mx-auto max-w-3xl text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-4">{t("hiwSafetyTitle")}</h2>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">{t("hiwSafetyDesc")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["hiwDocCheck", "hiwWorkGuarantee", "hiwSupport247", "hiwInsurance"].map((key, i) => (
              <span key={i} className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> {t(key)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Финальный блок мотивирует пользователя перейти к реальному заказу. */}
      <section className="py-16 bg-gradient-to-br from-primary to-emerald-500">
        <div className="container px-4 mx-auto text-center max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">{t("hiwCTA")}</h2>
            <p className="text-primary-foreground/80 text-lg mb-8">{t("hiwCTADesc")}</p>
            <Link to="/categories">
              <Button size="lg" variant="secondary" className="rounded-full px-8 shadow-lg">
                {t("hiwCTAButton")} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default HowItWorks;
