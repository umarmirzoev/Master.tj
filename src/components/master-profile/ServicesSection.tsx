import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";

interface Props {
  master: any;
}

// Generate realistic service items based on master categories
const servicesByCategory: Record<string, { name: string; price: number }[]> = {
  "Электрика": [
    { name: "Насб кардани розетка", price: 30 },
    { name: "Иваз кардани симкашӣ", price: 80 },
    { name: "Насб кардани люстра", price: 60 },
    { name: "Насб кардани автомат", price: 50 },
    { name: "Диагностикаи барқ", price: 40 },
  ],
  "Сантехника": [
    { name: "Иваз кардани смеситель", price: 80 },
    { name: "Таъмири обрезонӣ", price: 60 },
    { name: "Насб кардани унитаз", price: 150 },
    { name: "Тоза кардани канализатсия", price: 100 },
    { name: "Насб кардани обгармкунак", price: 200 },
  ],
  "Клининг": [
    { name: "Тозакунии генералӣ", price: 15 },
    { name: "Шустани тиреза", price: 20 },
    { name: "Тоза кардани мубл", price: 80 },
    { name: "Тоза кардани баъди таъмир", price: 20 },
  ],
  "Кондиционеры": [
    { name: "Насб кардани кондитсионер", price: 250 },
    { name: "Тоза кардани кондитсионер", price: 100 },
    { name: "Таъмири кондитсионер", price: 150 },
    { name: "Пур кардани фреон", price: 120 },
  ],
  "Сборка мебели": [
    { name: "Ҷамъ кардани ҷевон", price: 150 },
    { name: "Ҷамъ кардани кат", price: 100 },
    { name: "Ҷамъ кардани ошхона", price: 250 },
    { name: "Насб кардани дарҳои мубл", price: 50 },
  ],
  "Отделка": [
    { name: "Рангкунии девор", price: 25 },
    { name: "Часпонидани обой", price: 30 },
    { name: "Гачкорӣ", price: 35 },
    { name: "Мондани кошин", price: 45 },
  ],
  "Видеонаблюдение": [
    { name: "Насб кардани камера", price: 120 },
    { name: "Танзими системаи мониторинг", price: 200 },
    { name: "Таъмири камера", price: 80 },
  ],
};

// Секция услуг раскладывает специализации мастера по готовым примерам работ и ценам.
export default function MasterServices({ master }: Props) {
  const categories = master.service_categories || [];
  
  const services: { name: string; price: number }[] = [];
  for (const cat of categories) {
    const items = servicesByCategory[cat];
    if (items) {
      services.push(...items);
    }
  }

  // Fallback generic services
  if (services.length === 0) {
    services.push(
      { name: "Машварат ва ташхис", price: 50 },
      { name: "Таъмири стандартӣ", price: 100 },
      { name: "Насб кардани таҷҳизот", price: 150 },
      { name: "Кори мураккаб", price: 200 },
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-primary" /> Хизматҳои мастер
          </h2>
          <div className="space-y-2">
            {services.map((svc, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium text-foreground">{svc.name}</span>
                <span className="text-sm font-semibold text-primary whitespace-nowrap ml-3">
                  аз {svc.price} сомонӣ
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
