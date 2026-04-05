import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, Clock, MapPin, MessageCircle, Send, HelpCircle } from "lucide-react";

// Страница контактов показывает способы связи, форму обратной связи, карту и FAQ.
const Contacts = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  // Отправка формы пока сделана как клиентская имитация с уведомлением об успехе.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({ title: t("contactsMessageSent"), description: t("contactsMessageSentDesc") });
      setFormData({ name: "", phone: "", email: "", message: "" });
    }, 1000);
  };

  const contacts = [
    { icon: Phone, labelKey: "contactsPhone", value: "+992 900 00 00 00", href: "tel:+992900000000", color: "from-primary to-emerald-400" },
    { icon: Mail, labelKey: "contactsEmail", value: "support@masterchas.tj", href: "mailto:support@masterchas.tj", color: "from-blue-500 to-cyan-400" },
    { icon: MapPin, labelKey: "contactsAddress", value: t("contactsAddressValue"), href: null, color: "from-violet-500 to-purple-400" },
    { icon: Clock, labelKey: "contactsWorkHours", value: t("contactsWorkHoursValue"), href: null, color: "from-amber-500 to-orange-400" },
    { icon: MessageCircle, labelKey: "contactsWhatsApp", value: "+992 900 00 00 00", href: "https://wa.me/992900000000", color: "from-green-500 to-emerald-400" },
    { icon: Send, labelKey: "contactsTelegram", value: "@masterchas_tj", href: "https://t.me/masterchas_tj", color: "from-sky-500 to-blue-400" },
  ];

  // FAQ keys
  const faqKeys = [
    { qKey: "faq1q", aKey: "faq1a" },
    { qKey: "faq2q", aKey: "faq2a" },
    { qKey: "faq3q", aKey: "faq3a" },
    { qKey: "faq4q", aKey: "faq4a" },
    { qKey: "faq5q", aKey: "faq5a" },
    { qKey: "faq6q", aKey: "faq6a" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container px-4 mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("contactsTitle")}</h1>
            <p className="text-lg text-muted-foreground">{t("contactsDescription")}</p>
          </motion.div>
        </div>
      </section>

      <section className="pb-12">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                      <item.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t(item.labelKey)}</p>
                      {item.href ? (
                        <a href={item.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:text-primary transition-colors">{item.value}</a>
                      ) : (
                        <p className="font-semibold text-foreground">{item.value}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t("contactsWriteUs")}</h2>
                  <p className="text-sm text-muted-foreground mb-6">{t("contactsWriteUsDesc")}</p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input placeholder={t("contactsYourName")} value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required className="h-12" />
                    <Input placeholder={t("contactsPhonePlaceholder")} type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} required className="h-12" />
                    <Input placeholder={t("contactsEmailOptional")} type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="h-12" />
                    <Textarea placeholder={t("contactsYourMessage")} value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))} required className="min-h-[120px]" />
                    <Button type="submit" className="w-full rounded-full h-12 bg-gradient-to-r from-primary to-emerald-500" disabled={sending}>
                      {sending ? t("contactsSending") : t("contactsSendMessage")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="h-full overflow-hidden">
                <CardContent className="p-0 h-full min-h-[400px]">
                  <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=68.7038%2C38.5198%2C68.8438%2C38.5998&layer=mapnik&marker=38.5598%2C68.7738" width="100%" height="100%" style={{ border: 0, minHeight: 400 }} title="Душанбе" loading="lazy" />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container px-4 mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <HelpCircle className="w-10 h-10 text-primary mx-auto mb-3" />
            <h2 className="text-3xl font-bold text-foreground mb-2">{t("contactsFAQ")}</h2>
            <p className="text-muted-foreground">{t("contactsFAQDesc")}</p>
          </motion.div>
          <Accordion type="single" collapsible className="space-y-2">
            {faqKeys.map((item, i) => {
              const q = t(item.qKey);
              const a = t(item.aKey);
              if (q === item.qKey) return null; // skip if no translation found
              return (
                <AccordionItem key={i} value={`faq-${i}`} className="bg-card border rounded-xl px-4">
                  <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline">{q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Contacts;
